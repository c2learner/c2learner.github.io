-- Lexicon · C2 Companion — database, stage 1 (accounts + progress sync)
-- Run once in Supabase: SQL Editor → New query → paste everything → Run.
-- Safe to run again: every statement is idempotent.

-- ── profiles: one row per account ─────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  name        text not null default '',
  role        text not null default 'student' check (role in ('admin', 'teacher', 'student')),
  skipper     boolean not null default false,          -- may open Mark Skipper's book
  teacher_id  uuid references public.profiles(id) on delete set null,
  balance     integer not null default 0,              -- teacher balance in roubles (stage 2)
  created_at  timestamptz not null default now()
);

-- ── progress: the whole learning state of one account, as JSON ───────
create table if not exists public.progress (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- ── secrets the site may hand to allowed accounts (the book key) ─────
create table if not exists public.app_secrets (
  key    text primary key,
  value  text not null
);

-- a new sign-up gets a profile automatically
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, lower(new.email))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- the book key, only for accounts with Skipper access
create or replace function public.get_book_code() returns text
language sql stable security definer set search_path = public as $$
  select s.value from public.app_secrets s
  where s.key = 'skipper_code'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.skipper);
$$;

-- ── row-level security: everyone sees only their own rows ────────────
alter table public.profiles    enable row level security;
alter table public.progress    enable row level security;
alter table public.app_secrets enable row level security;   -- no policies: readable only via get_book_code()

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for select using (id = auth.uid() or public.is_admin());
drop policy if exists "rename self" on public.profiles;
create policy "rename self" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
-- users may change only their name; role, Skipper access and balance change only through admin functions (stage 2) or the SQL Editor
revoke update on public.profiles from authenticated, anon;
grant  update (name) on public.profiles to authenticated;
grant  select on public.profiles to authenticated;

drop policy if exists "own progress" on public.progress;
create policy "own progress" on public.progress for all using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update on public.progress to authenticated;

grant execute on function public.get_book_code() to authenticated;
revoke execute on function public.get_book_code() from public, anon;
