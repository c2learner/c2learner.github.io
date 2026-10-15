-- Lexicon · stage 3: teachers' courses.
-- Run once in Supabase → SQL Editor after stage2.sql. Safe to run again.

-- one row per course; topics and words live in `data` as JSON:
-- { "topics": [ { "id": "t1", "title": "Animals", "words": [ { "id": "w1", "head": "...", "pos": "noun", "meaning": "...",
--   "examples": ["..."], "ex": ["more examples"], "uk": {"ipa": "...", "mp3": "..."}, "us": {...} } ] } ] }
create table if not exists public.courses (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title       text not null check (length(trim(title)) between 1 and 120),
  description text not null default '',
  telegram    text not null default '',
  data        jsonb not null default '{"topics": []}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists courses_teacher on public.courses (teacher_id);

create or replace function public.is_teacher() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('teacher', 'admin'));
$$;

-- a student may read the courses of every teacher who added their email
create or replace function public.can_read_course(p_teacher uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_teacher = auth.uid() or public.is_admin()
      or exists (select 1 from public.enrollments e join public.profiles me on me.id = auth.uid()
                 where e.teacher_id = p_teacher and e.student_email = me.email);
$$;

alter table public.courses enable row level security;
drop policy if exists "read courses" on public.courses;
create policy "read courses" on public.courses for select using (public.can_read_course(teacher_id));
drop policy if exists "teacher writes own courses" on public.courses;
create policy "teacher writes own courses" on public.courses for all
  using (teacher_id = auth.uid() and public.is_teacher())
  with check (teacher_id = auth.uid() and public.is_teacher());
revoke all on public.courses from anon;
grant select, insert, update, delete on public.courses to authenticated;

create or replace function public.courses_touch() returns trigger language plpgsql as $$
begin new.updated_at := now(); new.teacher_id := old.teacher_id; return new; end $$;
drop trigger if exists courses_touch on public.courses;
create trigger courses_touch before update on public.courses for each row execute function public.courses_touch();

-- the course list for the library page (without the heavy word data)
create or replace function public.my_courses()
returns table (id uuid, title text, description text, teacher_name text, teacher_email text, mine boolean, topics integer, words integer, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select c.id, c.title, c.description, coalesce(nullif(t.name, ''), t.email), t.email, c.teacher_id = auth.uid(),
         jsonb_array_length(coalesce(c.data->'topics', '[]'::jsonb)),
         coalesce((select sum(jsonb_array_length(coalesce(tp->'words', '[]'::jsonb)))::int from jsonb_array_elements(coalesce(c.data->'topics', '[]'::jsonb)) tp), 0),
         c.updated_at
  from public.courses c join public.profiles t on t.id = c.teacher_id
  where public.can_read_course(c.teacher_id)
  order by (c.teacher_id = auth.uid()) desc, c.updated_at desc;
$$;
revoke execute on function public.my_courses() from public, anon;
grant execute on function public.my_courses() to authenticated;
revoke execute on function public.can_read_course(uuid) from public, anon;
grant execute on function public.can_read_course(uuid) to authenticated;
