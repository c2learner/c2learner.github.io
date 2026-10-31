-- Brightword · stage 12: approve students who come by a link.
-- A link can ask the author to approve each student first (on by default for new links). The student's request waits;
-- the author checks it against who paid and presses Accept — only then the student gets the course and the 200 ₽ is taken.
-- A forwarded link therefore costs the author nothing.
-- Run once in Supabase: SQL Editor → New query → paste everything → Run. Safe to run again. Needs stage 11.

alter table public.invites add column if not exists approve boolean not null default false;

create table if not exists public.join_requests (
  id            bigserial primary key,
  invite_id     bigint not null references public.invites(id) on delete cascade,
  teacher_id    uuid not null references public.profiles(id) on delete cascade,
  student_email text not null,
  created_at    timestamptz not null default now(),
  unique (invite_id, student_email)
);
create index if not exists join_requests_teacher on public.join_requests (teacher_id);
alter table public.join_requests enable row level security;
revoke all on public.join_requests from anon, authenticated;

-- internal: give one student the course of a link (and put them on the author's list, taking the money)
create or replace function public._grant(p_invite bigint, p_email text) returns json
language plpgsql security definer set search_path = public as $$
declare inv public.invites; t public.profiles; en public.enrollments; e text := lower(trim(p_email)); cost integer := 0;
begin
  select * into inv from public.invites where id = p_invite for update;
  select * into t from public.profiles where id = inv.teacher_id for update;
  select * into en from public.enrollments where teacher_id = t.id and student_email = e;
  if (inv.course_id is null and en.student_email is not null)
     or (inv.course_id is not null and exists (select 1 from public.course_access where student_email = e and course_id = inv.course_id)) then
    update public.profiles set teacher_id = t.id, role_chosen = true where email = e;
    return json_build_object('already', true, 'teacher_id', t.id, 'teacher_email', t.email, 'title', inv.title, 'course_id', inv.course_id);
  end if;
  if inv.max_uses is not null and inv.uses >= inv.max_uses then raise exception 'All places on this link are taken.'; end if;
  if not (t.role = 'admin' or public.eff_plan(t) = 'author' or public.in_trial(t)) then raise exception 'Invite links work on the Author plan.'; end if;
  if en.student_email is null then
    cost := public._enroll(t.id, e, inv.title, inv.id);
    if inv.course_id is not null then update public.enrollments set all_courses = false where teacher_id = t.id and student_email = e; end if;
  elsif not en.all_courses then
    cost := case when t.role = 'admin' or public.in_trial(t) then 0 else public.author_price() end;
    if t.balance < cost then raise exception 'Not enough balance: a student costs % ₽ on the Author plan, you have % ₽.', cost, t.balance; end if;
    if cost > 0 then
      update public.profiles set balance = balance - cost where id = t.id;
      insert into public.ledger (teacher_id, amount, kind, note) values (t.id, -cost, 'student', e || ' · ' || inv.title);
    end if;
  end if;
  if inv.course_id is not null then
    insert into public.course_access (student_email, course_id, teacher_id, invite_id, cohort, paid, feedback_until, telegram)
    values (e, inv.course_id, t.id, inv.id, inv.title, cost, case when inv.feedback_days is null then null else now() + make_interval(days => inv.feedback_days) end, inv.telegram)
    on conflict do nothing;
  end if;
  update public.invites set uses = uses + 1 where id = inv.id;
  update public.profiles set teacher_id = t.id, role_chosen = true where email = e;
  delete from public.join_requests where invite_id = inv.id and student_email = e;
  return json_build_object('already', false, 'teacher_id', t.id, 'teacher_email', t.email, 'title', inv.title, 'course_id', inv.course_id);
end $$;

create or replace function public.join_invite(p_code text) returns json
language plpgsql security definer set search_path = public as $$
declare me public.profiles; inv public.invites; t public.profiles;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null then raise exception 'Sign in first.'; end if;
  select * into inv from public.invites where code = trim(p_code);
  if inv.id is null then raise exception 'This invite link doesn''t work. Check it with your teacher.'; end if;
  select * into t from public.profiles where id = inv.teacher_id;
  if t.id = me.id then raise exception 'This is your own invite link. Send it to your students.'; end if;
  if inv.course_id is not null and exists (select 1 from public.course_access where student_email = me.email and course_id = inv.course_id) then
    return public._grant(inv.id, me.email);   -- already has it: just says so
  end if;
  if not inv.active or (inv.closes_at is not null and inv.closes_at <= now()) then raise exception 'This invite link is closed. Ask your teacher for a new one.'; end if;
  if inv.max_uses is not null and inv.uses >= inv.max_uses then raise exception 'All places on this link are taken. Ask your teacher for a new one.'; end if;
  if not (t.role = 'admin' or public.eff_plan(t) = 'author' or public.in_trial(t)) then raise exception 'This invite link isn''t working right now. Please write to your teacher.'; end if;
  update public.profiles set role_chosen = true where id = me.id;
  if inv.approve then
    insert into public.join_requests (invite_id, teacher_id, student_email) values (inv.id, t.id, me.email) on conflict do nothing;
    return json_build_object('pending', true, 'already', false, 'teacher', coalesce(nullif(t.name, ''), split_part(t.email, '@', 1)), 'title', inv.title, 'course_id', inv.course_id);
  end if;
  begin
    return public._grant(inv.id, me.email);
  exception when others then
    raise exception 'Your teacher can''t take new students right now. Please write to them — they will sort it out.';
  end;
end $$;

-- the author's waiting list
create or replace function public.request_list()
returns table (id bigint, student_email text, student_name text, link_title text, course_title text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.id, r.student_email, coalesce(p.name, ''), i.title, c.title, r.created_at
  from public.join_requests r join public.invites i on i.id = r.invite_id
  left join public.courses c on c.id = i.course_id left join public.profiles p on p.email = r.student_email
  where r.teacher_id = auth.uid() order by r.created_at;
$$;

create or replace function public.request_decide(p_id bigint, p_accept boolean) returns json
language plpgsql security definer set search_path = public as $$
declare r public.join_requests;
begin
  select * into r from public.join_requests where id = p_id and teacher_id = auth.uid();
  if r.id is null then raise exception 'This request is gone.'; end if;
  if not p_accept then delete from public.join_requests where id = r.id; return json_build_object('declined', true); end if;
  return public._grant(r.invite_id, r.student_email);
end $$;

-- the student's own waiting requests
create or replace function public.my_requests()
returns table (link_title text, course_title text, teacher text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select i.title, c.title, coalesce(nullif(t.name, ''), split_part(t.email, '@', 1)), r.created_at
  from public.join_requests r join public.profiles me on me.id = auth.uid() and me.email = r.student_email
  join public.invites i on i.id = r.invite_id join public.profiles t on t.id = r.teacher_id left join public.courses c on c.id = i.course_id
  order by r.created_at;
$$;

-- links: the approve switch
drop function if exists public.invite_create(text, uuid, integer, timestamptz, integer, text);
create or replace function public.invite_create(p_title text, p_course uuid, p_max integer default null, p_closes timestamptz default null, p_feedback integer default 30, p_telegram text default '', p_approve boolean default true) returns json
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
  insert into public.invites (teacher_id, code, title, max_uses, closes_at, course_id, feedback_days, telegram, approve)
  values (me.id, substr(replace(gen_random_uuid()::text, '-', ''), 1, 10), left(trim(p_title), 80), p_max, p_closes, p_course, p_feedback, case when p_feedback is null then '' else tg end, coalesce(p_approve, true))
  returning * into inv;
  return to_json(inv);
end $$;

create or replace function public.invite_set_approve(p_id bigint, p_approve boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.invites set approve = p_approve where id = p_id and teacher_id = auth.uid();
  if not found then raise exception 'No such link.'; end if;
end $$;

drop function if exists public.invite_list();
create function public.invite_list()
returns table (id bigint, code text, title text, max_uses integer, closes_at timestamptz, active boolean, uses integer, created_at timestamptz, students integer, course_id uuid, course_title text, feedback_days integer, telegram text, approve boolean, waiting integer)
language sql stable security definer set search_path = public as $$
  select i.id, i.code, i.title, i.max_uses, i.closes_at, i.active, i.uses, i.created_at,
         (select count(*)::int from public.course_access a where a.invite_id = i.id) + (select count(*)::int from public.enrollments e where e.invite_id = i.id and e.all_courses),
         i.course_id, c.title, i.feedback_days, i.telegram, i.approve,
         (select count(*)::int from public.join_requests r where r.invite_id = i.id)
  from public.invites i left join public.courses c on c.id = i.course_id
  where i.teacher_id = auth.uid() order by i.created_at desc;
$$;

do $$ declare f text; begin
  foreach f in array array['join_invite(text)', 'request_list()', 'request_decide(bigint,boolean)', 'my_requests()',
                           'invite_create(text,uuid,integer,timestamptz,integer,text,boolean)', 'invite_set_approve(bigint,boolean)', 'invite_list()'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  execute 'revoke execute on function public._grant(bigint,text) from public, anon, authenticated';
end $$;

select 'stage 12 done' as status;
