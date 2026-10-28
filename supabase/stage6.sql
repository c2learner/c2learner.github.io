-- Lexicon · stage 6: give back an AI check that failed on our side
-- Run once in Supabase: SQL Editor → New query → paste everything → Run. Safe to run again.
-- Needs stage 5 (ai_usage).

-- called only by the Edge Function (service role) when the AI itself failed
-- (for example the site-wide free allowance ran out): the person keeps their daily check
create or replace function public.ai_refund(p_user uuid, p_kind text) returns void
language sql security definer set search_path = public as $$
  update public.ai_usage set n = greatest(0, n - 1)
  where user_id = p_user and day = current_date and kind = p_kind;
$$;

revoke execute on function public.ai_refund(uuid, text) from public, anon, authenticated;
grant execute on function public.ai_refund(uuid, text) to service_role;
