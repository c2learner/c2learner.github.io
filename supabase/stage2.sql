-- Lexicon · stage 2: teachers, students, balance, admin tools.
-- Run once in Supabase → SQL Editor after schema.sql. Safe to run again.

-- price a teacher pays for one student, in roubles
create or replace function public.student_price() returns integer language sql immutable as $$ select 150 $$;

-- which teacher added which student (by email, so a student can be added before they sign up)
create table if not exists public.enrollments (
  student_email text not null,
  teacher_id    uuid not null references public.profiles(id) on delete cascade,
  price         integer not null default 0,
  created_at    timestamptz not null default now(),
  primary key (student_email, teacher_id)
);

-- every change of a teacher's balance: + top-up by the admin, − a student added
create table if not exists public.ledger (
  id          bigserial primary key,
  teacher_id  uuid not null references public.profiles(id) on delete cascade,
  amount      integer not null,
  kind        text not null check (kind in ('topup', 'student', 'refund')),
  note        text,
  created_at  timestamptz not null default now()
);

alter table public.enrollments enable row level security;
alter table public.ledger      enable row level security;
drop policy if exists "own enrollments" on public.enrollments;
create policy "own enrollments" on public.enrollments for select using (teacher_id = auth.uid() or public.is_admin());
drop policy if exists "own ledger" on public.ledger;
create policy "own ledger" on public.ledger for select using (teacher_id = auth.uid() or public.is_admin());
revoke all on public.enrollments, public.ledger from anon;
revoke insert, update, delete on public.enrollments, public.ledger from authenticated;
grant select on public.enrollments, public.ledger to authenticated;

-- a new account is linked to the teacher who added that email
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, teacher_id)
  values (new.id, lower(new.email),
          (select e.teacher_id from public.enrollments e where e.student_email = lower(new.email) order by e.created_at desc limit 1))
  on conflict (id) do nothing;
  return new;
end $$;

-- ── teacher tools ─────────────────────────────────────────────────────
create or replace function public.add_student(p_email text) returns json
language plpgsql security definer set search_path = public as $$
declare me public.profiles; e text := lower(trim(p_email)); cost integer := public.student_price();
begin
  select * into me from public.profiles where id = auth.uid() for update;
  if me.id is null or me.role not in ('teacher', 'admin') then raise exception 'Only teachers can add students.'; end if;
  if e !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'That email doesn''t look right.'; end if;
  if e = me.email then raise exception 'That is your own email.'; end if;
  if exists (select 1 from public.enrollments where student_email = e and teacher_id = me.id) then raise exception 'This student is already on your list.'; end if;
  if me.role = 'admin' then cost := 0; end if;
  if me.balance < cost then raise exception 'Not enough balance: a student costs % ₽, you have % ₽. Ask the admin to top up.', cost, me.balance; end if;
  if cost > 0 then
    update public.profiles set balance = balance - cost where id = me.id;
    insert into public.ledger (teacher_id, amount, kind, note) values (me.id, -cost, 'student', e);
  end if;
  insert into public.enrollments (student_email, teacher_id, price) values (e, me.id, cost);
  update public.profiles set teacher_id = me.id where email = e and (teacher_id is null or teacher_id <> me.id);
  return json_build_object('price', cost, 'balance', me.balance - cost, 'has_account', exists (select 1 from public.profiles where email = e));
end $$;

create or replace function public.remove_student(p_email text) returns void
language plpgsql security definer set search_path = public as $$
declare e text := lower(trim(p_email));
begin
  delete from public.enrollments where student_email = e and teacher_id = auth.uid();
  update public.profiles set teacher_id = null where email = e and teacher_id = auth.uid();
end $$;

create or replace function public.my_students()
returns table (email text, name text, has_account boolean, words integer, last_active timestamptz, added_at timestamptz)
language sql stable security definer set search_path = public as $$
  select en.student_email, coalesce(p.name, ''),
         exists (select 1 from auth.users u where u.id = p.id and u.last_sign_in_at is not null),   -- has signed in at least once
         coalesce((select count(*)::int from jsonb_object_keys(coalesce(g.data->'cards', '{}'::jsonb))), 0),
         g.updated_at, en.created_at
  from public.enrollments en
  left join public.profiles p on p.email = en.student_email
  left join public.progress g on g.user_id = p.id
  where en.teacher_id = auth.uid()
  order by en.created_at desc;
$$;

create or replace function public.my_teacher() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object('name', t.name, 'email', t.email)
  from public.profiles me join public.profiles t on t.id = me.teacher_id
  where me.id = auth.uid();
$$;

-- ── admin tools ───────────────────────────────────────────────────────
create or replace function public.admin_users()
returns table (email text, name text, role text, skipper boolean, balance integer, teacher_email text, students integer, words integer, created_at timestamptz, last_active timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  return query
  select p.email, p.name, p.role, p.skipper, p.balance, t.email,
         (select count(*)::int from public.enrollments en where en.teacher_id = p.id),
         coalesce((select count(*)::int from jsonb_object_keys(coalesce(g.data->'cards', '{}'::jsonb))), 0),
         p.created_at, g.updated_at
  from public.profiles p
  left join public.profiles t on t.id = p.teacher_id
  left join public.progress g on g.user_id = p.id
  order by p.created_at desc;
end $$;

create or replace function public.admin_set_role(p_email text, p_role text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  if p_role not in ('admin', 'teacher', 'student') then raise exception 'Unknown role.'; end if;
  if lower(trim(p_email)) = (select email from public.profiles where id = auth.uid()) and p_role <> 'admin' then raise exception 'You can''t remove your own admin role.'; end if;
  update public.profiles set role = p_role where email = lower(trim(p_email));
  if not found then raise exception 'No account with this email.'; end if;
end $$;

create or replace function public.admin_set_skipper(p_email text, p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  update public.profiles set skipper = p_on where email = lower(trim(p_email));
  if not found then raise exception 'No account with this email.'; end if;
end $$;

create or replace function public.admin_topup(p_email text, p_amount integer, p_note text default null) returns integer
language plpgsql security definer set search_path = public as $$
declare t public.profiles;
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  if p_amount = 0 or abs(p_amount) > 1000000 then raise exception 'Enter an amount in roubles.'; end if;
  select * into t from public.profiles where email = lower(trim(p_email)) for update;
  if t.id is null then raise exception 'No account with this email.'; end if;
  if t.balance + p_amount < 0 then raise exception 'The balance can''t go below zero.'; end if;
  update public.profiles set balance = balance + p_amount where id = t.id;
  insert into public.ledger (teacher_id, amount, kind, note) values (t.id, p_amount, case when p_amount > 0 then 'topup' else 'refund' end, p_note);
  return t.balance + p_amount;
end $$;

do $$ declare f text; begin
  foreach f in array array['add_student(text)', 'remove_student(text)', 'my_students()', 'my_teacher()', 'admin_users()',
                           'admin_set_role(text,text)', 'admin_set_skipper(text,boolean)', 'admin_topup(text,integer,text)'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
