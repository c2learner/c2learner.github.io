-- Brightword · stage 9: plans and price fences.
--   Free (2 students) · Tutor 5/10/20/40 (590/990/1690/2990 ₽ per 30 days from the balance)
--   Author (no monthly fee, 200 ₽ per student, no limit, invite links with cohorts).
--   Fences: invite links only on Author (and during the trial); seat limits; a removed student's seat
--   stays taken for 30 days, except a few free swaps a month; students of a teacher over their limit
--   can't open that teacher's courses until the plan is renewed (messages keep working).
-- Run once in Supabase: SQL Editor → New query → paste everything → Run. Safe to run again.
-- Needs stages 2–8.

-- ── columns ───────────────────────────────────────────────────────────
alter table public.profiles add column if not exists plan text not null default 'free';
alter table public.profiles add column if not exists plan_until timestamptz;          -- end of the paid 30 days (Tutor plans)
alter table public.profiles drop constraint if exists profiles_plan_check;
alter table public.profiles add constraint profiles_plan_check check (plan in ('free', 't5', 't10', 't20', 't40', 'author'));

alter table public.enrollments add column if not exists cohort text not null default '';     -- name of the invite link they came by
alter table public.enrollments add column if not exists invite_id bigint;
alter table public.enrollments add column if not exists author_paid boolean not null default false;  -- the 200 ₽ of the Author plan is paid (or was free in the trial)

alter table public.ledger drop constraint if exists ledger_kind_check;
alter table public.ledger add constraint ledger_kind_check check (kind in ('topup', 'student', 'refund', 'plan'));

-- students removed by a teacher: their seat stays taken for 30 days (see seats_held)
create table if not exists public.seat_log (
  id            bigserial primary key,
  teacher_id    uuid not null references public.profiles(id) on delete cascade,
  student_email text not null,
  added_at      timestamptz not null,
  removed_at    timestamptz not null default now(),
  joined        boolean not null default false     -- false: invited but never signed up (a typo) — frees the seat at once
);
create index if not exists seat_log_teacher on public.seat_log (teacher_id, removed_at);
alter table public.seat_log enable row level security;
revoke all on public.seat_log from anon, authenticated;

-- invite links ("cohorts"): brightword.ru/#/join/<code>
create table if not exists public.invites (
  id          bigserial primary key,
  teacher_id  uuid not null references public.profiles(id) on delete cascade,
  code        text not null unique,
  title       text not null check (length(trim(title)) between 1 and 80),
  max_uses    integer check (max_uses is null or max_uses between 1 and 10000),
  closes_at   timestamptz,
  active      boolean not null default true,
  uses        integer not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists invites_teacher on public.invites (teacher_id);
alter table public.invites enable row level security;
revoke all on public.invites from anon, authenticated;

-- ── the price list (one place; the site reads it from plan_info) ─────
create or replace function public.plan_catalog() returns jsonb language sql immutable as $$
  select '[
    {"id": "free",   "name": "Free",     "students": 2,  "price": 0,    "swaps": 1},
    {"id": "t5",     "name": "Tutor 5",  "students": 5,  "price": 590,  "swaps": 1},
    {"id": "t10",    "name": "Tutor 10", "students": 10, "price": 990,  "swaps": 2},
    {"id": "t20",    "name": "Tutor 20", "students": 20, "price": 1690, "swaps": 4},
    {"id": "t40",    "name": "Tutor 40", "students": 40, "price": 2990, "swaps": 8},
    {"id": "author", "name": "Author",   "students": null, "price": 0, "per_student": 200, "swaps": null}
  ]'::jsonb
$$;
create or replace function public.plan_def(p_plan text) returns jsonb language sql immutable as $$
  select x from jsonb_array_elements(public.plan_catalog()) x where x->>'id' = p_plan
$$;
create or replace function public.plan_days()    returns integer language sql immutable as $$ select 30 $$;
create or replace function public.plan_grace()   returns integer language sql immutable as $$ select 7 $$;   -- days a Tutor plan keeps working after its end, waiting for money
create or replace function public.author_price() returns integer language sql immutable as $$ select 200 $$;
create or replace function public.seat_hold()    returns integer language sql immutable as $$ select 30 $$;  -- days a removed student's seat stays taken
create or replace function public.is_tutor_plan(p text) returns boolean language sql immutable as $$ select p in ('t5', 't10', 't20', 't40') $$;

-- the plan that works now: a Tutor plan unpaid for longer than the grace period falls back to Free
create or replace function public.eff_plan(p public.profiles) returns text language sql stable as $$
  select case when public.is_tutor_plan(p.plan) and (p.plan_until is null or p.plan_until + make_interval(days => public.plan_grace()) < now()) then 'free' else p.plan end
$$;
create or replace function public.in_trial(p public.profiles) returns boolean language sql stable as $$
  select p.role = 'teacher' and p.trial_until is not null and p.trial_until > now()
$$;
-- how many students may be on the list at once; null = no limit
create or replace function public.seat_limit(p public.profiles) returns integer language sql stable as $$
  select case when p.role = 'admin' or public.eff_plan(p) = 'author' then null
              else greatest((public.plan_def(public.eff_plan(p))->>'students')::int, case when public.in_trial(p) then public.trial_students() else 0 end) end
$$;
create or replace function public.seats_active(p_teacher uuid) returns integer language sql stable security definer set search_path = public as $$
  select count(*)::int from public.enrollments where teacher_id = p_teacher
$$;
-- seats still taken by students removed in the last 30 days, after the plan's free swaps
create or replace function public.seats_held(p public.profiles) returns integer language sql stable security definer set search_path = public as $$
  select greatest(0, (select count(*)::int from public.seat_log s where s.teacher_id = p.id and s.joined and s.removed_at > now() - make_interval(days => public.seat_hold()))
                     - coalesce((public.plan_def(public.eff_plan(p))->>'swaps')::int, 1000000))
$$;

-- may the students of this teacher open the teacher's courses?
create or replace function public.teacher_active(p_teacher uuid) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select p.role <> 'teacher' or public.seat_limit(p) is null or public.seats_active(p.id) <= public.seat_limit(p)
                   from public.profiles p where p.id = p_teacher), true)
$$;

-- courses: a student reads them only while the teacher's plan covers all their students
create or replace function public.can_read_course(p_teacher uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_teacher = auth.uid() or public.is_admin()
      or (exists (select 1 from public.enrollments e join public.profiles me on me.id = auth.uid()
                  where e.teacher_id = p_teacher and e.student_email = me.email)
          and public.teacher_active(p_teacher));
$$;

-- ── renewal: a Tutor plan renews from the balance when the teacher or one of their students opens the site
create or replace function public._renew(p_teacher uuid) returns void
language plpgsql security definer set search_path = public as $$
declare p public.profiles; price integer;
begin
  select * into p from public.profiles where id = p_teacher for update;
  if p.id is null or not public.is_tutor_plan(p.plan) or p.plan_until is null or p.plan_until > now() then return; end if;
  price := (public.plan_def(p.plan)->>'price')::int;
  if p.balance < price then return; end if;
  update public.profiles
     set balance = balance - price,
         plan_until = case when p.plan_until + make_interval(days => public.plan_grace()) > now() then p.plan_until else now() end + make_interval(days => public.plan_days())
   where id = p.id;
  insert into public.ledger (teacher_id, amount, kind, note) values (p.id, -price, 'plan', (public.plan_def(p.plan)->>'name') || ', renewed');
end $$;

-- everything the Plans and Students pages show
create or replace function public.plan_info() returns json
language plpgsql security definer set search_path = public as $$
declare me public.profiles; eff text; lim integer; held integer; act integer; nxt timestamptz;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role in ('teacher', 'admin')) then raise exception 'This page is for teachers.'; end if;
  perform public._renew(auth.uid());
  select * into me from public.profiles where id = auth.uid();
  eff := public.eff_plan(me); lim := public.seat_limit(me); held := public.seats_held(me); act := public.seats_active(me.id);
  select min(s.removed_at) + make_interval(days => public.seat_hold()) into nxt from public.seat_log s
   where held > 0 and s.teacher_id = me.id and s.joined and s.removed_at > now() - make_interval(days => public.seat_hold());
  return json_build_object(
    'plan', me.plan, 'effective', eff, 'plan_until', me.plan_until,
    'overdue', public.is_tutor_plan(me.plan) and me.plan_until is not null and me.plan_until <= now() and eff = me.plan,
    'lapsed', public.is_tutor_plan(me.plan) and eff = 'free',
    'balance', me.balance, 'admin', me.role = 'admin',
    'limit', lim, 'active', act, 'held', held, 'next_free', nxt,
    'free_seats', case when lim is null then null else greatest(0, lim - act - held) end,
    'swaps', (public.plan_def(eff)->>'swaps')::int,
    'removed_recent', (select count(*)::int from public.seat_log s where s.teacher_id = me.id and s.joined and s.removed_at > now() - make_interval(days => public.seat_hold())),
    'unpaid_author', (select count(*)::int from public.enrollments e where e.teacher_id = me.id and not e.author_paid),
    'trial_until', me.trial_until, 'in_trial', public.in_trial(me), 'trial_students', public.trial_students(),
    'paused', not public.teacher_active(me.id),
    'can_invite', me.role = 'admin' or eff = 'author' or public.in_trial(me),
    'author_price', public.author_price(), 'plan_days', public.plan_days(), 'grace', public.plan_grace(), 'hold', public.seat_hold(),
    'catalog', public.plan_catalog());
end $$;

-- the teacher changes their plan; the unused days of a Tutor plan come back to the balance
create or replace function public.set_plan(p_plan text) returns json
language plpgsql security definer set search_path = public as $$
declare me public.profiles; d jsonb := public.plan_def(p_plan); price integer; credit integer := 0; net integer; extra integer := 0; nlim integer; act integer; held integer; tmp public.profiles;
begin
  select * into me from public.profiles where id = auth.uid() for update;
  if me.id is null or me.role not in ('teacher', 'admin') then raise exception 'Plans are for teachers.'; end if;
  if d is null then raise exception 'Unknown plan.'; end if;
  if me.role = 'admin' then raise exception 'As the admin you don''t need a plan.'; end if;
  if p_plan = public.eff_plan(me) and not (public.is_tutor_plan(p_plan) and me.plan_until <= now()) then raise exception 'This is already your plan.'; end if;
  -- will the students fit?
  tmp := me; tmp.plan := p_plan; tmp.plan_until := now() + make_interval(days => public.plan_days());
  nlim := public.seat_limit(tmp); act := public.seats_active(me.id); held := public.seats_held(tmp);
  if nlim is not null and act + held > nlim then
    raise exception '% has % seats, and you have % students%. Remove some students first, or choose a bigger plan.', d->>'name', nlim, act,
      case when held > 0 then format(' plus %s seats still taken by students you removed recently', held) else '' end;
  end if;
  price := (d->>'price')::int;
  if public.is_tutor_plan(me.plan) and me.plan_until > now() then
    credit := round((public.plan_def(me.plan)->>'price')::numeric * extract(epoch from me.plan_until - now()) / (public.plan_days() * 86400));
  end if;
  -- moving to Author: students added under another plan are paid for now (in the trial they are free)
  if p_plan = 'author' and not public.in_trial(me) then
    extra := public.author_price() * (select count(*) from public.enrollments where teacher_id = me.id and not author_paid);
  end if;
  net := price + extra - credit;
  if net > me.balance then
    raise exception 'This costs % ₽%, and your balance is % ₽. Write to us with the Feedback button to top up.', price + extra,
      case when credit > 0 then format(' minus %s ₽ back for the unused days of your plan', credit) else '' end, me.balance;
  end if;
  update public.profiles set balance = balance - net, plan = p_plan,
         plan_until = case when public.is_tutor_plan(p_plan) then now() + make_interval(days => public.plan_days()) else null end
   where id = me.id;
  if credit > 0 then insert into public.ledger (teacher_id, amount, kind, note) values (me.id, credit, 'refund', 'Unused days of ' || (public.plan_def(me.plan)->>'name')); end if;
  if price > 0 then insert into public.ledger (teacher_id, amount, kind, note) values (me.id, -price, 'plan', d->>'name'); end if;
  if extra > 0 then insert into public.ledger (teacher_id, amount, kind, note) values (me.id, -extra, 'student', 'Author plan: students already on the list'); end if;
  if p_plan = 'author' then update public.enrollments set author_paid = true where teacher_id = me.id; end if;
  return json_build_object('plan', p_plan, 'charged', net, 'balance', me.balance - net);
end $$;

-- ── adding and removing students ──────────────────────────────────────
-- internal: puts one email on a teacher's list and takes the money; used by add_student and join_invite
create or replace function public._enroll(p_teacher uuid, p_email text, p_cohort text, p_invite bigint) returns integer
language plpgsql security definer set search_path = public as $$
declare me public.profiles; e text := lower(trim(p_email)); cost integer := 0; lim integer; act integer; held integer; nxt timestamptz; eff text; paid boolean := false;
begin
  select * into me from public.profiles where id = p_teacher for update;
  if me.id is null or me.role not in ('teacher', 'admin') then raise exception 'Only teachers can add students.'; end if;
  if e !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'That email doesn''t look right.'; end if;
  if e = me.email then raise exception 'That is your own email.'; end if;
  if exists (select 1 from public.enrollments where student_email = e and teacher_id = me.id) then raise exception 'This student is already on your list.'; end if;
  eff := public.eff_plan(me); act := public.seats_active(me.id);
  if me.role = 'admin' then cost := 0;
  elsif eff = 'author' then
    paid := true;
    cost := case when public.in_trial(me) and act < public.trial_students() then 0 else public.author_price() end;
  else
    lim := public.seat_limit(me); held := public.seats_held(me);
    if act + held >= lim then
      select min(s.removed_at) + make_interval(days => public.seat_hold()) into nxt from public.seat_log s
       where held > 0 and s.teacher_id = me.id and s.joined and s.removed_at > now() - make_interval(days => public.seat_hold());
      raise exception 'All % seats of your plan are taken%. Choose a bigger plan on the Plans page.', lim,
        case when held > 0 then format(' (%s by students you removed recently; the next one frees on %s)', held, to_char(nxt, 'DD Mon')) else '' end;
    end if;
  end if;
  if me.balance < cost then raise exception 'Not enough balance: a student costs % ₽ on the Author plan, you have % ₽. Write to us with the Feedback button to top up.', cost, me.balance; end if;
  if cost > 0 then
    update public.profiles set balance = balance - cost where id = me.id;
    insert into public.ledger (teacher_id, amount, kind, note) values (me.id, -cost, 'student', e);
  end if;
  insert into public.enrollments (student_email, teacher_id, price, cohort, invite_id, author_paid) values (e, me.id, cost, coalesce(p_cohort, ''), p_invite, paid);
  update public.profiles set teacher_id = me.id where email = e and (teacher_id is null or teacher_id <> me.id);
  return cost;
end $$;

create or replace function public.add_student(p_email text) returns json
language plpgsql security definer set search_path = public as $$
declare cost integer; e text := lower(trim(p_email));
begin
  cost := public._enroll(auth.uid(), e, '', null);
  return json_build_object('price', cost, 'balance', (select balance from public.profiles where id = auth.uid()), 'has_account', exists (select 1 from public.profiles where email = e));
end $$;

create or replace function public.remove_student(p_email text) returns void
language plpgsql security definer set search_path = public as $$
declare e text := lower(trim(p_email)); en public.enrollments;
begin
  select * into en from public.enrollments where student_email = e and teacher_id = auth.uid();
  if en.student_email is null then return; end if;
  insert into public.seat_log (teacher_id, student_email, added_at, joined)
  values (auth.uid(), e, en.created_at, exists (select 1 from public.profiles p join auth.users u on u.id = p.id where p.email = e and u.last_sign_in_at is not null));
  delete from public.enrollments where student_email = e and teacher_id = auth.uid();
  update public.profiles set teacher_id = null where email = e and teacher_id = auth.uid();
end $$;

drop function if exists public.my_students();
create function public.my_students()
returns table (email text, name text, has_account boolean, words integer, last_active timestamptz, added_at timestamptz, cohort text)
language sql stable security definer set search_path = public as $$
  select en.student_email, coalesce(p.name, ''),
         exists (select 1 from auth.users u where u.id = p.id and u.last_sign_in_at is not null),
         coalesce((select count(*)::int from jsonb_object_keys(coalesce(g.data->'cards', '{}'::jsonb))), 0),
         g.updated_at, en.created_at, en.cohort
  from public.enrollments en
  left join public.profiles p on p.email = en.student_email
  left join public.progress g on g.user_id = p.id
  where en.teacher_id = auth.uid()
  order by en.created_at desc;
$$;

-- the student's teacher; also renews the teacher's plan, so students aren't locked out while there is money
drop function if exists public.my_teacher();
create function public.my_teacher() returns json
language plpgsql security definer set search_path = public as $$
declare t uuid := (select teacher_id from public.profiles where id = auth.uid());
begin
  if t is null then return null; end if;
  perform public._renew(t);
  return (select json_build_object('name', p.name, 'email', p.email, 'paused', not public.teacher_active(p.id)) from public.profiles p where p.id = t);
end $$;

-- ── invite links ──────────────────────────────────────────────────────
create or replace function public.invite_create(p_title text, p_max integer default null, p_closes timestamptz default null) returns json
language plpgsql security definer set search_path = public as $$
declare me public.profiles; inv public.invites;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null or me.role not in ('teacher', 'admin') then raise exception 'Only teachers can make invite links.'; end if;
  if not (me.role = 'admin' or public.eff_plan(me) = 'author' or public.in_trial(me)) then raise exception 'Invite links are part of the Author plan.'; end if;
  if length(trim(coalesce(p_title, ''))) = 0 then raise exception 'Give the link a name, for example “November cohort”.'; end if;
  if (select count(*) from public.invites where teacher_id = me.id) >= 200 then raise exception 'That is a lot of links. Switch some old ones off first.'; end if;
  insert into public.invites (teacher_id, code, title, max_uses, closes_at)
  values (me.id, substr(replace(gen_random_uuid()::text, '-', ''), 1, 10), left(trim(p_title), 80), p_max, p_closes) returning * into inv;
  return to_json(inv);
end $$;

create or replace function public.invite_list()
returns table (id bigint, code text, title text, max_uses integer, closes_at timestamptz, active boolean, uses integer, created_at timestamptz, students integer)
language sql stable security definer set search_path = public as $$
  select i.id, i.code, i.title, i.max_uses, i.closes_at, i.active, i.uses, i.created_at,
         (select count(*)::int from public.enrollments e where e.invite_id = i.id)
  from public.invites i where i.teacher_id = auth.uid() order by i.created_at desc;
$$;

create or replace function public.invite_set(p_id bigint, p_active boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.invites set active = p_active where id = p_id and teacher_id = auth.uid();
  if not found then raise exception 'No such link.'; end if;
end $$;

-- what the join page shows before signing in (open to everyone who has the code)
create or replace function public.invite_info(p_code text) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object('title', i.title, 'teacher', coalesce(nullif(t.name, ''), split_part(t.email, '@', 1)),
           'courses', (select coalesce(json_agg(c.title order by c.updated_at desc), '[]'::json) from public.courses c where c.teacher_id = t.id and not c.is_example),
           'open', i.active and (i.closes_at is null or i.closes_at > now()) and (i.max_uses is null or i.uses < i.max_uses)
                   and (t.role = 'admin' or public.eff_plan(t) = 'author' or public.in_trial(t)))
  from public.invites i join public.profiles t on t.id = i.teacher_id where i.code = trim(p_code);
$$;

create or replace function public.join_invite(p_code text) returns json
language plpgsql security definer set search_path = public as $$
declare me public.profiles; inv public.invites; t public.profiles;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null then raise exception 'Sign in first.'; end if;
  select * into inv from public.invites where code = trim(p_code) for update;
  if inv.id is null then raise exception 'This invite link doesn''t work. Check it with your teacher.'; end if;
  select * into t from public.profiles where id = inv.teacher_id;
  if t.id = me.id then raise exception 'This is your own invite link. Send it to your students.'; end if;
  if exists (select 1 from public.enrollments where teacher_id = t.id and student_email = me.email) then
    update public.profiles set teacher_id = t.id, role_chosen = true where id = me.id;
    return json_build_object('already', true, 'teacher_id', t.id, 'teacher_email', t.email, 'title', inv.title);
  end if;
  if not inv.active or (inv.closes_at is not null and inv.closes_at <= now()) then raise exception 'This invite link is closed. Ask your teacher for a new one.'; end if;
  if inv.max_uses is not null and inv.uses >= inv.max_uses then raise exception 'All places on this link are taken. Ask your teacher for a new one.'; end if;
  if not (t.role = 'admin' or public.eff_plan(t) = 'author' or public.in_trial(t)) then raise exception 'This invite link isn''t working right now. Please write to your teacher.'; end if;
  begin
    perform public._enroll(t.id, me.email, inv.title, inv.id);
  exception when others then
    raise exception 'Your teacher can''t take new students right now. Please write to them — they will sort it out.';
  end;
  update public.invites set uses = uses + 1 where id = inv.id;
  update public.profiles set role_chosen = true where id = me.id;
  return json_build_object('already', false, 'teacher_id', t.id, 'teacher_email', t.email, 'title', inv.title);
end $$;

-- ── admin ─────────────────────────────────────────────────────────────
-- give a plan for free (a pilot, a gift): Tutor plans for p_days days; Author just switches, the students on the list count as paid
create or replace function public.admin_set_plan(p_email text, p_plan text, p_days integer default 30) returns void
language plpgsql security definer set search_path = public as $$
declare t public.profiles;
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  if public.plan_def(p_plan) is null then raise exception 'Unknown plan.'; end if;
  select * into t from public.profiles where email = lower(trim(p_email)) for update;
  if t.id is null then raise exception 'No account with this email.'; end if;
  if t.role <> 'teacher' then raise exception 'Plans are for teachers.'; end if;
  update public.profiles set plan = p_plan,
         plan_until = case when public.is_tutor_plan(p_plan) then now() + make_interval(days => greatest(1, least(coalesce(p_days, 30), 3650))) else null end
   where id = t.id;
  if p_plan = 'author' then update public.enrollments set author_paid = true where teacher_id = t.id; end if;
  insert into public.ledger (teacher_id, amount, kind, note) values (t.id, 0, 'plan', 'Given by the admin: ' || (public.plan_def(p_plan)->>'name') || case when public.is_tutor_plan(p_plan) then format(', %s days', p_days) else '' end);
end $$;

drop function if exists public.admin_users();
create function public.admin_users()
returns table (email text, name text, role text, skipper boolean, balance integer, teacher_email text, students integer, words integer, created_at timestamptz, last_active timestamptz, trial_until timestamptz, plan text, plan_until timestamptz, paused boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  return query
  select p.email, p.name, p.role, p.skipper, p.balance, t.email,
         (select count(*)::int from public.enrollments en where en.teacher_id = p.id),
         coalesce((select count(*)::int from jsonb_object_keys(coalesce(g.data->'cards', '{}'::jsonb))), 0),
         p.created_at, g.updated_at, p.trial_until, public.eff_plan(p), p.plan_until, p.role = 'teacher' and not public.teacher_active(p.id)
  from public.profiles p
  left join public.profiles t on t.id = p.teacher_id
  left join public.progress g on g.user_id = p.id
  order by p.created_at desc;
end $$;

-- ── teachers who already have students past their trial get a free month of the plan that fits ──
update public.profiles p set
  plan = x.plan, plan_until = now() + interval '30 days'
from (select pr.id, case when n <= 5 then 't5' when n <= 10 then 't10' when n <= 20 then 't20' else 't40' end as plan
      from public.profiles pr join (select teacher_id, count(*) n from public.enrollments group by teacher_id) c on c.teacher_id = pr.id
      where pr.role = 'teacher' and pr.plan = 'free' and c.n > 2 and c.n <= 40 and (pr.trial_until is null or pr.trial_until <= now())) x
where p.id = x.id;
update public.profiles p set plan = 'author'
where p.role = 'teacher' and p.plan = 'free' and (select count(*) from public.enrollments e where e.teacher_id = p.id) > 40;
update public.enrollments e set author_paid = true from public.profiles p where p.id = e.teacher_id and p.plan = 'author';

-- ── permissions ───────────────────────────────────────────────────────
do $$ declare f text; begin
  foreach f in array array['plan_info()', 'set_plan(text)', 'add_student(text)', 'remove_student(text)', 'my_students()', 'my_teacher()',
                           'invite_create(text,integer,timestamptz)', 'invite_list()', 'invite_set(bigint,boolean)', 'join_invite(text)',
                           'admin_set_plan(text,text,integer)', 'admin_users()', 'can_read_course(uuid)'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  foreach f in array array['_renew(uuid)', '_enroll(uuid,text,text,bigint)', 'seats_active(uuid)', 'seats_held(public.profiles)', 'teacher_active(uuid)'] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
  end loop;
end $$;
revoke execute on function public.invite_info(text) from public;
grant execute on function public.invite_info(text) to anon, authenticated;

select 'stage 9 done' as status;
