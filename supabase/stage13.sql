-- Brightword · stage 13: consent to personal data processing (152-FZ).
-- The site records when each person gave consent and to which version of the documents.
-- Run once in Supabase: SQL Editor → New query → paste everything → Run. Safe to run again.

alter table public.profiles add column if not exists consent_at timestamptz;
alter table public.profiles add column if not exists consent_version text;

create or replace function public.give_consent(p_version text) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare r timestamptz;
begin
  update public.profiles set consent_at = now(), consent_version = left(coalesce(p_version, ''), 20)
   where id = auth.uid() returning consent_at into r;
  if r is null then raise exception 'Sign in first.'; end if;
  return r;
end $$;
revoke execute on function public.give_consent(text) from public, anon;
grant execute on function public.give_consent(text) to authenticated;

select 'stage 13 done' as status;
