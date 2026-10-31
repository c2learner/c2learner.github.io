-- Brightword · stage 10: an invite link opens ONE course, bought courses stay forever, feedback period for the teacher.
--   · Each invite link is for one course. A student who joins sees only the courses they bought from that author;
--     joining a link for another course is a new purchase (200 ₽ on the Author plan) and adds that course.
--   · A bought course stays open forever: it doesn't pause when the author's plan ends or the link is closed.
--   · Feedback period (30 days by default, set on the link): only the teacher sees it, and can add days.
--   · Students added by email (the tutor way) still see all of their teacher's courses, as before.
--   · A course that students bought can't be deleted.
-- Run once in Supabase: SQL Editor → New query → paste everything → Run. Safe to run again. Needs stage 9.

alter table public.invites add column if not exists course_id uuid references public.courses(id) on delete set null;
alter table public.invites add column if not exists feedback_days integer check (feedback_days is null or feedback_days between 1 and 365);
alter table public.enrollments add column if not exists all_courses boolean not null default true;   -- false: only the courses in course_access

-- one row per (student, bought course)
create table if not exists public.course_access (
  student_email  text not null,
  course_id      uuid not null references public.courses(id) on delete cascade,
  teacher_id     uuid not null references public.profiles(id) on delete cascade,
  invite_id      bigint,
  cohort         text not null default '',
  paid           integer not null default 0,
  feedback_until timestamptz,
  created_at     timestamptz not null default now(),
  primary key (student_email, course_id)
);
create index if not exists course_access_teacher on public.course_access (teacher_id);
alter table public.course_access enable row level security;
revoke all on public.course_access from anon, authenticated;

-- may the signed-in person read this course?
create or replace function public.can_read_course_id(p_course uuid, p_teacher uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_teacher = auth.uid() or public.is_admin()
      or exists (select 1 from public.course_access a join public.profiles me on me.id = auth.uid()
                 where a.course_id = p_course and a.student_email = me.email)                       -- bought: forever
      or (exists (select 1 from public.enrollments e join public.profiles me on me.id = auth.uid()
                  where e.teacher_id = p_teacher and e.student_email = me.email and e.all_courses)   -- added by email: while the plan covers them
          and public.teacher_active(p_teacher));
$$;
-- kept for older callers: "any course of this teacher"
create or replace function public.can_read_course(p_teacher uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_teacher = auth.uid() or public.is_admin()
      or exists (select 1 from public.course_access a join public.profiles me on me.id = auth.uid() where a.teacher_id = p_teacher and a.student_email = me.email)
      or (exists (select 1 from public.enrollments e join public.profiles me on me.id = auth.uid()
                  where e.teacher_id = p_teacher and e.student_email = me.email and e.all_courses)
          and public.teacher_active(p_teacher));
$$;

drop policy if exists "read courses" on public.courses;
create policy "read courses" on public.courses for select using (is_example or public.can_read_course_id(id, teacher_id));

drop function if exists public.my_courses();
create function public.my_courses()
returns table (id uuid, title text, description text, teacher_name text, teacher_email text, mine boolean, topics integer, words integer, updated_at timestamptz, example boolean)
language sql stable security definer set search_path = public as $$
  select c.id, c.title, c.description, coalesce(nullif(t.name, ''), t.email), t.email, c.teacher_id = auth.uid(),
         jsonb_array_length(coalesce(c.data->'topics', '[]'::jsonb)),
         coalesce((select sum(jsonb_array_length(coalesce(tp->'words', '[]'::jsonb)))::int from jsonb_array_elements(coalesce(c.data->'topics', '[]'::jsonb)) tp), 0),
         c.updated_at, c.is_example
  from public.courses c join public.profiles t on t.id = c.teacher_id
  where c.is_example or public.can_read_course_id(c.id, c.teacher_id)
  order by (c.teacher_id = auth.uid()) desc, c.updated_at desc;
$$;

-- a bought course can't be deleted (the SQL editor still can)
create or replace function public.courses_keep_bought() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and exists (select 1 from public.course_access where course_id = old.id) then
    raise exception 'Students have bought this course, so it can''t be deleted — they keep it forever. Switch off its invite links instead, so nobody new joins.';
  end if;
  return old;
end $$;
drop trigger if exists courses_keep_bought on public.courses;
create trigger courses_keep_bought before delete on public.courses for each row execute function public.courses_keep_bought();

-- ── links ─────────────────────────────────────────────────────────────
drop function if exists public.invite_create(text, integer, timestamptz);
create or replace function public.invite_create(p_title text, p_course uuid, p_max integer default null, p_closes timestamptz default null, p_feedback integer default 30) returns json
language plpgsql security definer set search_path = public as $$
declare me public.profiles; inv public.invites;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null or me.role not in ('teacher', 'admin') then raise exception 'Only teachers can make invite links.'; end if;
  if not (me.role = 'admin' or public.eff_plan(me) = 'author' or public.in_trial(me)) then raise exception 'Invite links are part of the Author plan.'; end if;
  if length(trim(coalesce(p_title, ''))) = 0 then raise exception 'Give the link a name, for example “November cohort”.'; end if;
  if p_course is null or not exists (select 1 from public.courses where id = p_course and teacher_id = me.id) then raise exception 'Choose one of your courses for this link.'; end if;
  if (select count(*) from public.invites where teacher_id = me.id) >= 200 then raise exception 'That is a lot of links. Switch some old ones off first.'; end if;
  insert into public.invites (teacher_id, code, title, max_uses, closes_at, course_id, feedback_days)
  values (me.id, substr(replace(gen_random_uuid()::text, '-', ''), 1, 10), left(trim(p_title), 80), p_max, p_closes, p_course, p_feedback) returning * into inv;
  return to_json(inv);
end $$;

drop function if exists public.invite_list();
create function public.invite_list()
returns table (id bigint, code text, title text, max_uses integer, closes_at timestamptz, active boolean, uses integer, created_at timestamptz, students integer, course_id uuid, course_title text, feedback_days integer)
language sql stable security definer set search_path = public as $$
  select i.id, i.code, i.title, i.max_uses, i.closes_at, i.active, i.uses, i.created_at,
         (select count(*)::int from public.course_access a where a.invite_id = i.id) + (select count(*)::int from public.enrollments e where e.invite_id = i.id and e.all_courses),
         i.course_id, c.title, i.feedback_days
  from public.invites i left join public.courses c on c.id = i.course_id
  where i.teacher_id = auth.uid() order by i.created_at desc;
$$;

create or replace function public.invite_info(p_code text) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object('title', i.title, 'teacher', coalesce(nullif(t.name, ''), split_part(t.email, '@', 1)),
           'course', c.title,
           'courses', case when c.id is not null then json_build_array(c.title)
                           else (select coalesce(json_agg(x.title order by x.updated_at desc), '[]'::json) from public.courses x where x.teacher_id = t.id and not x.is_example) end,
           'open', i.active and (i.closes_at is null or i.closes_at > now()) and (i.max_uses is null or i.uses < i.max_uses)
                   and (t.role = 'admin' or public.eff_plan(t) = 'author' or public.in_trial(t)))
  from public.invites i join public.profiles t on t.id = i.teacher_id left join public.courses c on c.id = i.course_id
  where i.code = trim(p_code);
$$;

-- joining: first time with this author → onto the list (paid as before); another course → a new purchase
create or replace function public.join_invite(p_code text) returns json
language plpgsql security definer set search_path = public as $$
declare me public.profiles; inv public.invites; t public.profiles; en public.enrollments; cost integer := 0;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null then raise exception 'Sign in first.'; end if;
  select * into inv from public.invites where code = trim(p_code) for update;
  if inv.id is null then raise exception 'This invite link doesn''t work. Check it with your teacher.'; end if;
  select * into t from public.profiles where id = inv.teacher_id for update;
  if t.id = me.id then raise exception 'This is your own invite link. Send it to your students.'; end if;
  select * into en from public.enrollments where teacher_id = t.id and student_email = me.email;
  -- already has it
  if (inv.course_id is null and en.student_email is not null)
     or (inv.course_id is not null and exists (select 1 from public.course_access where student_email = me.email and course_id = inv.course_id)) then
    update public.profiles set teacher_id = t.id, role_chosen = true where id = me.id;
    return json_build_object('already', true, 'teacher_id', t.id, 'teacher_email', t.email, 'title', inv.title, 'course_id', inv.course_id);
  end if;
  if not inv.active or (inv.closes_at is not null and inv.closes_at <= now()) then raise exception 'This invite link is closed. Ask your teacher for a new one.'; end if;
  if inv.max_uses is not null and inv.uses >= inv.max_uses then raise exception 'All places on this link are taken. Ask your teacher for a new one.'; end if;
  if not (t.role = 'admin' or public.eff_plan(t) = 'author' or public.in_trial(t)) then raise exception 'This invite link isn''t working right now. Please write to your teacher.'; end if;
  if en.student_email is null then
    begin
      cost := public._enroll(t.id, me.email, inv.title, inv.id);
    exception when others then
      raise exception 'Your teacher can''t take new students right now. Please write to them — they will sort it out.';
    end;
    if inv.course_id is not null then update public.enrollments set all_courses = false where teacher_id = t.id and student_email = me.email; end if;
  elsif not en.all_courses then
    -- another course from the same author: a new purchase
    cost := case when t.role = 'admin' or public.in_trial(t) then 0 else public.author_price() end;
    if t.balance < cost then raise exception 'Your teacher can''t take new students right now. Please write to them — they will sort it out.'; end if;
    if cost > 0 then
      update public.profiles set balance = balance - cost where id = t.id;
      insert into public.ledger (teacher_id, amount, kind, note) values (t.id, -cost, 'student', me.email || ' · ' || inv.title);
    end if;
  end if;   -- (added by email and sees all courses already: the course is simply recorded, no charge)
  if inv.course_id is not null then
    insert into public.course_access (student_email, course_id, teacher_id, invite_id, cohort, paid, feedback_until)
    values (me.email, inv.course_id, t.id, inv.id, inv.title, cost, case when inv.feedback_days is null then null else now() + make_interval(days => inv.feedback_days) end)
    on conflict do nothing;
  end if;
  update public.invites set uses = uses + 1 where id = inv.id;
  update public.profiles set teacher_id = t.id, role_chosen = true where id = me.id;
  return json_build_object('already', false, 'teacher_id', t.id, 'teacher_email', t.email, 'title', inv.title, 'course_id', inv.course_id);
end $$;

-- the teacher gives a student more days of feedback on a course
create or replace function public.feedback_extend(p_email text, p_course uuid, p_days integer default 7) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare r timestamptz;
begin
  if p_days is null or p_days not between 1 and 365 then raise exception 'Choose between 1 and 365 days.'; end if;
  update public.course_access
     set feedback_until = greatest(coalesce(feedback_until, now()), now()) + make_interval(days => p_days)
   where student_email = lower(trim(p_email)) and course_id = p_course and teacher_id = auth.uid()
  returning feedback_until into r;
  if r is null then raise exception 'This student has no such course.'; end if;
  return r;
end $$;

-- removing a student also takes away the courses they bought (for refunds); the page warns about it
create or replace function public.remove_student(p_email text) returns void
language plpgsql security definer set search_path = public as $$
declare e text := lower(trim(p_email)); en public.enrollments;
begin
  select * into en from public.enrollments where student_email = e and teacher_id = auth.uid();
  if en.student_email is null then return; end if;
  insert into public.seat_log (teacher_id, student_email, added_at, joined)
  values (auth.uid(), e, en.created_at, exists (select 1 from public.profiles p join auth.users u on u.id = p.id where p.email = e and u.last_sign_in_at is not null));
  delete from public.course_access where student_email = e and teacher_id = auth.uid();
  delete from public.enrollments where student_email = e and teacher_id = auth.uid();
  update public.profiles set teacher_id = null where email = e and teacher_id = auth.uid();
end $$;

drop function if exists public.my_students();
create function public.my_students()
returns table (email text, name text, has_account boolean, words integer, last_active timestamptz, added_at timestamptz, cohort text, all_courses boolean, courses json)
language sql stable security definer set search_path = public as $$
  select en.student_email, coalesce(p.name, ''),
         exists (select 1 from auth.users u where u.id = p.id and u.last_sign_in_at is not null),
         coalesce((select count(*)::int from jsonb_object_keys(coalesce(g.data->'cards', '{}'::jsonb))), 0),
         g.updated_at, en.created_at, en.cohort, en.all_courses,
         (select coalesce(json_agg(json_build_object('course_id', a.course_id, 'title', c.title, 'cohort', a.cohort, 'feedback_until', a.feedback_until, 'since', a.created_at) order by a.created_at), '[]'::json)
            from public.course_access a join public.courses c on c.id = a.course_id where a.student_email = en.student_email and a.teacher_id = en.teacher_id)
  from public.enrollments en
  left join public.profiles p on p.email = en.student_email
  left join public.progress g on g.user_id = p.id
  where en.teacher_id = auth.uid()
  order by en.created_at desc;
$$;

-- courses a teacher can attach to a link
create or replace function public.my_own_courses()
returns table (id uuid, title text, words integer)
language sql stable security definer set search_path = public as $$
  select c.id, c.title, coalesce((select sum(jsonb_array_length(coalesce(tp->'words', '[]'::jsonb)))::int from jsonb_array_elements(coalesce(c.data->'topics', '[]'::jsonb)) tp), 0)
  from public.courses c where c.teacher_id = auth.uid() and not c.is_example order by c.updated_at desc;
$$;

do $$ declare f text; begin
  foreach f in array array['can_read_course_id(uuid,uuid)', 'can_read_course(uuid)', 'my_courses()', 'invite_create(text,uuid,integer,timestamptz,integer)', 'invite_list()',
                           'join_invite(text)', 'feedback_extend(text,uuid,integer)', 'remove_student(text)', 'my_students()', 'my_own_courses()'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
revoke execute on function public.invite_info(text) from public;
grant execute on function public.invite_info(text) to anon, authenticated;

select 'stage 10 done' as status;
