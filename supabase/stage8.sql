-- Lexicon · stage 8: "I'm a teacher / I'm a student" at sign-up with a 14-day free trial,
-- a feedback box for teachers, and messages between a teacher and each student.
-- Run once in Supabase: SQL Editor → New query → paste everything → Run. Safe to run again.
-- Needs stages 2–7.

-- ── role chosen at sign-up, free trial ────────────────────────────────
alter table public.profiles add column if not exists role_chosen boolean not null default false;
alter table public.profiles add column if not exists trial_until timestamptz;
-- accounts that existed before this stage are not asked again
update public.profiles set role_chosen = true where not role_chosen and created_at < timestamptz '2026-10-29 06:00+03';

create or replace function public.trial_days() returns integer language sql immutable as $$ select 14 $$;
create or replace function public.trial_students() returns integer language sql immutable as $$ select 5 $$;

-- asked once; a teacher gets the free trial, a student just goes on
create or replace function public.choose_role(p_role text) returns json
language plpgsql security definer set search_path = public as $$
declare me public.profiles;
begin
  select * into me from public.profiles where id = auth.uid() for update;
  if me.id is null then raise exception 'Sign in first.'; end if;
  if p_role not in ('teacher', 'student') then raise exception 'Choose teacher or student.'; end if;
  if not me.role_chosen then
    if p_role = 'teacher' and me.role = 'student' then
      update public.profiles set role = 'teacher', trial_until = now() + make_interval(days => public.trial_days()), role_chosen = true where id = me.id
      returning * into me;
    else
      update public.profiles set role_chosen = true where id = me.id returning * into me;
    end if;
  end if;
  return json_build_object('role', me.role, 'trial_until', me.trial_until);
end $$;

-- adding a student: free for the first 5 students while the trial lasts, then 150 ₽ from the balance as before
create or replace function public.add_student(p_email text) returns json
language plpgsql security definer set search_path = public as $$
declare me public.profiles; e text := lower(trim(p_email)); cost integer := public.student_price();
begin
  select * into me from public.profiles where id = auth.uid() for update;
  if me.id is null or me.role not in ('teacher', 'admin') then raise exception 'Only teachers can add students.'; end if;
  if e !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'That email doesn''t look right.'; end if;
  if e = me.email then raise exception 'That is your own email.'; end if;
  if exists (select 1 from public.enrollments where student_email = e and teacher_id = me.id) then raise exception 'This student is already on your list.'; end if;
  if me.role = 'admin' then cost := 0;
  elsif me.trial_until > now() and (select count(*) from public.enrollments where teacher_id = me.id) < public.trial_students() then cost := 0;
  end if;
  if me.balance < cost then
    if me.trial_until > now() then
      raise exception 'Your free trial covers % students. Each next student costs % ₽, and you have % ₽. Write to us with the Feedback button to top up.', public.trial_students(), cost, me.balance;
    end if;
    raise exception 'Not enough balance: a student costs % ₽, you have % ₽. Write to us with the Feedback button to top up.', cost, me.balance;
  end if;
  if cost > 0 then
    update public.profiles set balance = balance - cost where id = me.id;
    insert into public.ledger (teacher_id, amount, kind, note) values (me.id, -cost, 'student', e);
  end if;
  insert into public.enrollments (student_email, teacher_id, price) values (e, me.id, cost);
  update public.profiles set teacher_id = me.id where email = e and (teacher_id is null or teacher_id <> me.id);
  return json_build_object('price', cost, 'balance', me.balance - cost, 'has_account', exists (select 1 from public.profiles where email = e));
end $$;

-- the admin list now shows when a trial ends
drop function if exists public.admin_users();
create function public.admin_users()
returns table (email text, name text, role text, skipper boolean, balance integer, teacher_email text, students integer, words integer, created_at timestamptz, last_active timestamptz, trial_until timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  return query
  select p.email, p.name, p.role, p.skipper, p.balance, t.email,
         (select count(*)::int from public.enrollments en where en.teacher_id = p.id),
         coalesce((select count(*)::int from jsonb_object_keys(coalesce(g.data->'cards', '{}'::jsonb))), 0),
         p.created_at, g.updated_at, p.trial_until
  from public.profiles p
  left join public.profiles t on t.id = p.teacher_id
  left join public.progress g on g.user_id = p.id
  order by p.created_at desc;
end $$;

-- ── feedback from teachers to the admin ───────────────────────────────
create table if not exists public.feedback (
  id         bigserial primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  body       text not null check (length(trim(body)) between 1 and 4000),
  page       text not null default '',
  done       boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.feedback enable row level security;
revoke all on public.feedback from anon, authenticated;

create or replace function public.send_feedback(p_body text, p_page text default '') returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role in ('teacher', 'admin')) then raise exception 'Feedback is for teachers.'; end if;
  if length(trim(coalesce(p_body, ''))) = 0 then raise exception 'Write a few words first.'; end if;
  if (select count(*) from public.feedback where user_id = auth.uid() and created_at > now() - interval '1 day') >= 30 then raise exception 'That is a lot of messages for one day. Try again tomorrow.'; end if;
  insert into public.feedback (user_id, body, page) values (auth.uid(), left(trim(p_body), 4000), left(coalesce(p_page, ''), 200));
end $$;

create or replace function public.admin_feedback()
returns table (id bigint, email text, name text, body text, page text, done boolean, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  return query select f.id, p.email, p.name, f.body, f.page, f.done, f.created_at
    from public.feedback f join public.profiles p on p.id = f.user_id order by f.done, f.created_at desc limit 300;
end $$;

create or replace function public.admin_feedback_done(p_id bigint, p_done boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  update public.feedback set done = p_done where id = p_id;
end $$;

-- ── messages between a teacher and a student ──────────────────────────
-- one conversation per (teacher, student email), so a teacher can write before the student has signed up
create table if not exists public.messages (
  id            bigserial primary key,
  teacher_id    uuid not null references public.profiles(id) on delete cascade,
  student_email text not null,
  from_teacher  boolean not null,
  body          text not null check (length(trim(body)) between 1 and 4000),
  created_at    timestamptz not null default now(),
  read_at       timestamptz
);
create index if not exists messages_pair on public.messages (teacher_id, student_email, id);
alter table public.messages enable row level security;
revoke all on public.messages from anon, authenticated;

-- true when the signed-in person is one side of this enrolled pair; says which side
create or replace function public.msg_side(p_teacher uuid, p_student text) returns text
language sql stable security definer set search_path = public as $$
  select case
    when not exists (select 1 from public.enrollments e where e.teacher_id = p_teacher and e.student_email = lower(trim(p_student))) then null
    when p_teacher = auth.uid() then 'teacher'
    when lower(trim(p_student)) = (select email from public.profiles where id = auth.uid()) then 'student'
  end;
$$;

-- every conversation of the signed-in person: as a teacher (one per student) and as a student (one per teacher)
create or replace function public.msg_threads()
returns table (teacher_id uuid, student_email text, other_name text, i_am_teacher boolean, unread integer, last_body text, last_at timestamptz, has_account boolean)
language sql stable security definer set search_path = public as $$
  with me as (select id, email from public.profiles where id = auth.uid()),
  pairs as (
    select e.teacher_id, e.student_email, true as i_am_teacher from public.enrollments e, me where e.teacher_id = me.id
    union all
    select e.teacher_id, e.student_email, false from public.enrollments e, me where e.student_email = me.email and e.teacher_id <> me.id)
  select p.teacher_id, p.student_email,
         case when p.i_am_teacher then coalesce(nullif(s.name, ''), p.student_email) else coalesce(nullif(t.name, ''), t.email) end,
         p.i_am_teacher,
         (select count(*)::int from public.messages m where m.teacher_id = p.teacher_id and m.student_email = p.student_email and m.read_at is null and m.from_teacher <> p.i_am_teacher),
         l.body, l.created_at,
         case when p.i_am_teacher then s.id is not null else true end
  from pairs p
  join public.profiles t on t.id = p.teacher_id
  left join public.profiles s on s.email = p.student_email
  left join lateral (select m.body, m.created_at from public.messages m where m.teacher_id = p.teacher_id and m.student_email = p.student_email order by m.id desc limit 1) l on true
  order by l.created_at desc nulls last, 3;
$$;

create or replace function public.msg_unread() returns integer
language sql stable security definer set search_path = public as $$
  select coalesce(sum(unread), 0)::int from public.msg_threads();
$$;

-- the conversation; opening it marks the other side's messages as read
create or replace function public.msg_list(p_teacher uuid, p_student text)
returns table (id bigint, mine boolean, body text, created_at timestamptz, read boolean)
language plpgsql security definer set search_path = public as $$
declare side text := public.msg_side(p_teacher, p_student); e text := lower(trim(p_student));
begin
  if side is null then raise exception 'This conversation is not available.'; end if;
  update public.messages m set read_at = now()
   where m.teacher_id = p_teacher and m.student_email = e and m.read_at is null and m.from_teacher = (side = 'student');
  return query select m.id, m.from_teacher = (side = 'teacher'), m.body, m.created_at, m.read_at is not null
    from public.messages m where m.teacher_id = p_teacher and m.student_email = e order by m.id desc limit 300;
end $$;

create or replace function public.msg_send(p_teacher uuid, p_student text, p_body text) returns void
language plpgsql security definer set search_path = public as $$
declare side text := public.msg_side(p_teacher, p_student);
begin
  if side is null then raise exception 'You can only write to your own teacher or students.'; end if;
  if length(trim(coalesce(p_body, ''))) = 0 then raise exception 'Write something first.'; end if;
  if (select count(*) from public.messages m where m.teacher_id = p_teacher and m.created_at > now() - interval '1 day'
        and ((side = 'teacher' and m.from_teacher) or (side = 'student' and not m.from_teacher and m.student_email = lower(trim(p_student))))) >= 300
    then raise exception 'Too many messages today. Try again tomorrow.'; end if;
  insert into public.messages (teacher_id, student_email, from_teacher, body) values (p_teacher, lower(trim(p_student)), side = 'teacher', left(trim(p_body), 4000));
end $$;

do $$ declare f text; begin
  foreach f in array array['choose_role(text)', 'add_student(text)', 'admin_users()', 'send_feedback(text,text)', 'admin_feedback()', 'admin_feedback_done(bigint,boolean)',
                           'msg_side(uuid,text)', 'msg_threads()', 'msg_unread()', 'msg_list(uuid,text)', 'msg_send(uuid,text,text)'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

select 'stage 8 done' as status;
