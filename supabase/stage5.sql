-- Lexicon · C2 Companion — stage 5: Writing checked by AI
-- Run once in Supabase: SQL Editor → New query → paste everything → Run. Safe to run again.
-- Needs stage 4 (exam_access, can_see_results).

-- ── one row per checked piece of writing ─────────────────────────────
create table if not exists public.writing_attempts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  exam        text not null check (exam in ('cpe', 'cae')),
  task_id     text not null,
  part        integer not null,
  title       text not null default '',
  text        text not null,
  words       integer not null default 0,
  score       integer,                 -- 0–20 (four subscales × 0–5)
  result      jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists writing_attempts_user on public.writing_attempts (user_id, created_at desc);
alter table public.writing_attempts enable row level security;
revoke all on public.writing_attempts from anon, authenticated;

-- ── daily AI allowance per account (the free AI has a daily limit for the whole site) ──
create table if not exists public.ai_usage (
  user_id  uuid not null references auth.users(id) on delete cascade,
  day      date not null default current_date,
  kind     text not null,
  n        integer not null default 0,
  primary key (user_id, day, kind)
);
alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from anon, authenticated;

-- called only by the Edge Function (service role): take one use if there is one left today
create or replace function public.ai_take(p_user uuid, p_kind text, p_limit integer) returns integer
language plpgsql security definer set search_path = public as $$
declare used integer;
begin
  insert into public.ai_usage (user_id, day, kind, n) values (p_user, current_date, p_kind, 0)
  on conflict (user_id, day, kind) do nothing;
  select n into used from public.ai_usage where user_id = p_user and day = current_date and kind = p_kind for update;
  if used >= p_limit then return -1; end if;
  update public.ai_usage set n = n + 1 where user_id = p_user and day = current_date and kind = p_kind;
  return p_limit - used - 1;                                    -- uses left today
end $$;

-- called only by the Edge Function (service role) after the AI marked the text: the score can't be faked from the browser
create or replace function public.writing_save(p_user uuid, p_exam text, p_task text, p_part integer, p_title text,
                                               p_text text, p_words integer, p_score integer, p_result jsonb) returns uuid
language sql security definer set search_path = public as $$
  insert into public.writing_attempts (user_id, exam, task_id, part, title, text, words, score, result)
  values (p_user, p_exam, p_task, p_part, left(p_title, 200), left(p_text, 12000), p_words, p_score, p_result)
  returning id;
$$;

-- the signed-in person's own attempts (or a student's, for their teacher / the admin)
create or replace function public.writing_list(p_user uuid default null)
returns table (id uuid, exam text, task_id text, part integer, title text, words integer, score integer, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select w.id, w.exam, w.task_id, w.part, w.title, w.words, w.score, w.created_at
  from public.writing_attempts w
  where w.user_id = coalesce(p_user, auth.uid()) and public.can_see_results(coalesce(p_user, auth.uid()))
  order by w.created_at desc limit 200;
$$;

create or replace function public.writing_get(p_id uuid)
returns table (id uuid, user_id uuid, exam text, task_id text, part integer, title text, text text, words integer, score integer, result jsonb, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select w.id, w.user_id, w.exam, w.task_id, w.part, w.title, w.text, w.words, w.score, w.result, w.created_at
  from public.writing_attempts w where w.id = p_id and public.can_see_results(w.user_id);
$$;

-- AI uses left today for the signed-in person (shown on the Writing page)
create or replace function public.ai_left(p_kind text, p_limit integer) returns integer
language sql stable security definer set search_path = public as $$
  select greatest(0, p_limit - coalesce((select n from public.ai_usage where user_id = auth.uid() and day = current_date and kind = p_kind), 0));
$$;

revoke execute on function public.ai_take(uuid, text, integer) from public, anon, authenticated;
revoke execute on function public.writing_save(uuid, text, text, integer, text, text, integer, integer, jsonb) from public, anon, authenticated;
grant execute on function public.ai_take(uuid, text, integer) to service_role;
grant execute on function public.writing_save(uuid, text, text, integer, text, text, integer, integer, jsonb) to service_role;
revoke execute on function public.writing_list(uuid) from public, anon;
revoke execute on function public.writing_get(uuid) from public, anon;
revoke execute on function public.ai_left(text, integer) from public, anon;
grant execute on function public.writing_list(uuid) to authenticated;
grant execute on function public.writing_get(uuid) to authenticated;
grant execute on function public.ai_left(text, integer) to authenticated;
