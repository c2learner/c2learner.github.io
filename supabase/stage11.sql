-- Brightword · stage 11: a Telegram account on each invite link.
-- The author writes where students of this link send their voice messages: their own Telegram or an assistant's.
-- Students see it in the speaking tasks and in the final task when they finish the course. A link without feedback
-- gets no Telegram, so those students aren't asked to send anything.
-- Run once in Supabase: SQL Editor → New query → paste everything → Run. Safe to run again. Needs stage 10.

alter table public.invites add column if not exists telegram text not null default '';
alter table public.course_access add column if not exists telegram text not null default '';

drop function if exists public.invite_create(text, uuid, integer, timestamptz, integer);
create or replace function public.invite_create(p_title text, p_course uuid, p_max integer default null, p_closes timestamptz default null, p_feedback integer default 30, p_telegram text default '') returns json
language plpgsql security definer set search_path = public as $$
declare me public.profiles; inv public.invites; tg text := left(trim(coalesce(p_telegram, '')), 100);
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null or me.role not in ('teacher', 'admin') then raise exception 'Only teachers can make invite links.'; end if;
  if not (me.role = 'admin' or public.eff_plan(me) = 'author' or public.in_trial(me)) then raise exception 'Invite links are part of the Author plan.'; end if;
  if length(trim(coalesce(p_title, ''))) = 0 then raise exception 'Give the link a name, for example “November cohort”.'; end if;
  if p_course is null or not exists (select 1 from public.courses where id = p_course and teacher_id = me.id) then raise exception 'Choose one of your courses for this link.'; end if;
  if p_feedback is not null and tg = '' then raise exception 'Write the Telegram account where students send their voice messages, for example @ann_english.'; end if;
  if (select count(*) from public.invites where teacher_id = me.id) >= 200 then raise exception 'That is a lot of links. Switch some old ones off first.'; end if;
  insert into public.invites (teacher_id, code, title, max_uses, closes_at, course_id, feedback_days, telegram)
  values (me.id, substr(replace(gen_random_uuid()::text, '-', ''), 1, 10), left(trim(p_title), 80), p_max, p_closes, p_course, p_feedback, case when p_feedback is null then '' else tg end)
  returning * into inv;
  return to_json(inv);
end $$;

drop function if exists public.invite_list();
create function public.invite_list()
returns table (id bigint, code text, title text, max_uses integer, closes_at timestamptz, active boolean, uses integer, created_at timestamptz, students integer, course_id uuid, course_title text, feedback_days integer, telegram text)
language sql stable security definer set search_path = public as $$
  select i.id, i.code, i.title, i.max_uses, i.closes_at, i.active, i.uses, i.created_at,
         (select count(*)::int from public.course_access a where a.invite_id = i.id) + (select count(*)::int from public.enrollments e where e.invite_id = i.id and e.all_courses),
         i.course_id, c.title, i.feedback_days, i.telegram
  from public.invites i left join public.courses c on c.id = i.course_id
  where i.teacher_id = auth.uid() order by i.created_at desc;
$$;

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
    insert into public.course_access (student_email, course_id, teacher_id, invite_id, cohort, paid, feedback_until, telegram)
    values (me.email, inv.course_id, t.id, inv.id, inv.title, cost, case when inv.feedback_days is null then null else now() + make_interval(days => inv.feedback_days) end, inv.telegram)
    on conflict do nothing;
  end if;
  update public.invites set uses = uses + 1 where id = inv.id;
  update public.profiles set teacher_id = t.id, role_chosen = true where id = me.id;
  return json_build_object('already', false, 'teacher_id', t.id, 'teacher_email', t.email, 'title', inv.title, 'course_id', inv.course_id);
end $$;

drop function if exists public.my_students();
create function public.my_students()
returns table (email text, name text, has_account boolean, words integer, last_active timestamptz, added_at timestamptz, cohort text, all_courses boolean, courses json)
language sql stable security definer set search_path = public as $$
  select en.student_email, coalesce(p.name, ''),
         exists (select 1 from auth.users u where u.id = p.id and u.last_sign_in_at is not null),
         coalesce((select count(*)::int from jsonb_object_keys(coalesce(g.data->'cards', '{}'::jsonb))), 0),
         g.updated_at, en.created_at, en.cohort, en.all_courses,
         (select coalesce(json_agg(json_build_object('course_id', a.course_id, 'title', c.title, 'cohort', a.cohort, 'feedback_until', a.feedback_until, 'since', a.created_at, 'telegram', a.telegram) order by a.created_at), '[]'::json)
            from public.course_access a join public.courses c on c.id = a.course_id where a.student_email = en.student_email and a.teacher_id = en.teacher_id)
  from public.enrollments en
  left join public.profiles p on p.email = en.student_email
  left join public.progress g on g.user_id = p.id
  where en.teacher_id = auth.uid()
  order by en.created_at desc;
$$;


-- for a student: how they got this course; null when added by email (then the course's own Telegram is used)
create or replace function public.my_access(p_course uuid) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object('telegram', a.telegram, 'feedback', a.feedback_until is not null)
  from public.course_access a join public.profiles me on me.id = auth.uid()
  where a.course_id = p_course and a.student_email = me.email;
$$;

do $$ declare f text; begin
  foreach f in array array['invite_create(text,uuid,integer,timestamptz,integer,text)', 'invite_list()', 'join_invite(text)', 'my_students()', 'my_access(uuid)'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

select 'stage 11 done' as status;
