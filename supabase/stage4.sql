-- Lexicon · stage 4: CAE/CPE practice tests with server-side marking, explanations and teacher analytics.
-- Run once in Supabase → SQL Editor after stage3.sql. Safe to run again.
-- Test content (questions + answer keys) is NOT in this file: the admin imports it on the Admin page.
-- Answer keys never leave the database before a test is finished: every read goes through the functions below.

-- ── tables ────────────────────────────────────────────────────────────
create table if not exists public.exam_tests (
  id         text primary key,                                   -- e.g. 'cpe-rue-1'
  exam       text not null check (exam in ('cae', 'cpe')),
  paper      text not null default 'rue',                        -- rue = Reading and Use of English
  title      text not null,
  minutes    integer not null check (minutes between 1 and 300),
  max_score  integer not null default 0,
  published  boolean not null default true,
  sort       integer not null default 0,
  data       jsonb not null,                                     -- parts and questions, without answers
  updated_at timestamptz not null default now()
);
create table if not exists public.exam_keys (
  test_id text primary key references public.exam_tests(id) on delete cascade,
  key     jsonb not null                                         -- {"items": {"1": {"type","answer"|"accept","halves","marks","part","tags","why"}}}
);
create table if not exists public.exam_attempts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  test_id     text not null references public.exam_tests(id) on delete cascade,
  started_at  timestamptz not null default now(),
  deadline    timestamptz not null,
  finished_at timestamptz,
  answers     jsonb not null default '{}'::jsonb,
  score       integer,
  max_score   integer,
  result      jsonb                                              -- marks per question, part and topic
);
create index if not exists exam_attempts_user on public.exam_attempts (user_id, started_at desc);

-- nothing is readable directly: only through the functions below
alter table public.exam_tests    enable row level security;
alter table public.exam_keys     enable row level security;
alter table public.exam_attempts enable row level security;
revoke all on public.exam_tests, public.exam_keys, public.exam_attempts from anon, authenticated;

-- ── who may do what ───────────────────────────────────────────────────
-- tests are open to teachers, admins and students a teacher has added
create or replace function public.exam_access() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid()
                 and (p.role in ('teacher', 'admin')
                      or exists (select 1 from public.enrollments e where e.student_email = p.email)));
$$;
-- may the signed-in person see this account's results? (themselves, their teacher, the admin)
create or replace function public.can_see_results(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_user = auth.uid() or public.is_admin()
      or exists (select 1 from public.profiles s join public.enrollments e on e.student_email = s.email
                 where s.id = p_user and e.teacher_id = auth.uid());
$$;

-- ── marking ───────────────────────────────────────────────────────────
-- answers are compared case-insensitively, ignoring extra spaces, curly quotes and a final full stop
create or replace function public.exam_norm(t text) returns text
language sql immutable as $$
  select btrim(regexp_replace(regexp_replace(lower(translate(coalesce(t, ''), '’‘`´“”', '''''''''""')), '[.!?,;:"]+\s*$', ''), '\s+', ' ', 'g'));
$$;

-- one question: choice (A–H), text (open cloze, word formation; list of accepted answers),
-- kwt (key word transformation: 2 marks; 1 mark for each correct half when the whole is not right)
create or replace function public.exam_grade_item(k jsonb, a text) returns integer
language plpgsql immutable as $$
declare n text := public.exam_norm(a); marks integer := coalesce((k->>'marks')::int, 1); got integer := 0; half jsonb;
begin
  if n = '' then return 0; end if;
  if k->>'type' = 'choice' then
    return case when upper(n) = upper(k->>'answer') then marks else 0 end;
  end if;
  if exists (select 1 from jsonb_array_elements_text(coalesce(k->'accept', '[]'::jsonb)) x where public.exam_norm(x) = n) then return marks; end if;
  if k->>'type' = 'kwt' then
    for half in select value from jsonb_array_elements(coalesce(k->'halves', '[]'::jsonb)) loop
      if exists (select 1 from jsonb_array_elements_text(half) f
                 where position(' ' || public.exam_norm(f) || ' ' in ' ' || n || ' ') > 0) then got := got + 1; end if;
    end loop;
    return least(got, marks);
  end if;
  return 0;
end $$;

-- a whole test: total, and marks per question, per part and per topic tag
create or replace function public.exam_grade(p_test text, p_answers jsonb) returns jsonb
language sql stable security definer set search_path = public as $$
  with it as (
    select k.key as n, k.value as v,
           public.exam_grade_item(k.value, coalesce(p_answers, '{}'::jsonb)->>k.key) as got,
           coalesce((k.value->>'marks')::int, 1) as mx
    from public.exam_keys ek, jsonb_each(ek.key->'items') k
    where ek.test_id = p_test
  )
  select jsonb_build_object(
    'score', coalesce((select sum(got) from it), 0),
    'max',   coalesce((select sum(mx) from it), 0),
    'items', coalesce((select jsonb_object_agg(n, jsonb_build_object('got', got, 'max', mx)) from it), '{}'::jsonb),
    'parts', coalesce((select jsonb_object_agg(part, jsonb_build_object('got', g, 'max', m))
                       from (select v->>'part' as part, sum(got) as g, sum(mx) as m from it group by 1) x), '{}'::jsonb),
    'tags',  coalesce((select jsonb_object_agg(tag, jsonb_build_object('got', g, 'max', m))
                       from (select t as tag, sum(got) as g, sum(mx) as m
                             from it, jsonb_array_elements_text(coalesce(v->'tags', '[]'::jsonb)) t group by 1) y), '{}'::jsonb));
$$;

-- an attempt whose time is up is marked with the answers saved so far (2 minutes of grace for slow connections)
create or replace function public.exam_close_expired(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare a record; r jsonb;
begin
  for a in select * from public.exam_attempts
           where user_id = p_user and finished_at is null and now() > deadline + interval '2 minutes' for update loop
    r := public.exam_grade(a.test_id, a.answers);
    update public.exam_attempts set finished_at = a.deadline, score = (r->>'score')::int, max_score = (r->>'max')::int, result = r where id = a.id;
  end loop;
end $$;

-- ── taking a test ─────────────────────────────────────────────────────
-- the tests I can take, with my attempts
create or replace function public.exam_list() returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  perform public.exam_close_expired(auth.uid());
  return jsonb_build_object(
    'access', public.exam_access(),
    'admin', public.is_admin(),
    'tests', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id, 'exam', t.exam, 'paper', t.paper, 'title', t.title, 'minutes', t.minutes, 'max_score', t.max_score, 'published', t.published,
        'parts', jsonb_array_length(coalesce(t.data->'parts', '[]'::jsonb)),
        'attempts', (select count(*) from public.exam_attempts a where a.test_id = t.id and a.user_id = auth.uid() and a.finished_at is not null),
        'best', (select max(a.score) from public.exam_attempts a where a.test_id = t.id and a.user_id = auth.uid() and a.finished_at is not null),
        'last', (select jsonb_build_object('id', a.id, 'score', a.score, 'max', a.max_score, 'at', a.finished_at)
                 from public.exam_attempts a where a.test_id = t.id and a.user_id = auth.uid() and a.finished_at is not null order by a.started_at desc limit 1),
        'open', (select jsonb_build_object('id', a.id, 'deadline', a.deadline)
                 from public.exam_attempts a where a.test_id = t.id and a.user_id = auth.uid() and a.finished_at is null order by a.started_at desc limit 1))
        order by t.exam desc, t.sort, t.id)
      from public.exam_tests t where t.published or public.is_admin()), '[]'::jsonb));
end $$;

-- start a test (or come back to the one already running): returns the attempt id
create or replace function public.exam_start(p_test text) returns uuid
language plpgsql security definer set search_path = public as $$
declare t public.exam_tests; a uuid;
begin
  if not public.exam_access() then raise exception 'Practice tests are open to students of a Lexicon teacher. Ask your teacher to add your email.'; end if;
  perform public.exam_close_expired(auth.uid());
  select * into t from public.exam_tests where id = p_test and (published or public.is_admin());
  if t.id is null then raise exception 'This test is not available.'; end if;
  select id into a from public.exam_attempts where user_id = auth.uid() and test_id = p_test and finished_at is null order by started_at desc limit 1;
  if a is null then
    insert into public.exam_attempts (user_id, test_id, deadline, max_score)
    values (auth.uid(), p_test, now() + make_interval(mins => t.minutes), t.max_score) returning id into a;
  end if;
  return a;
end $$;

-- the questions of my running attempt, my saved answers and the time left
create or replace function public.exam_get(p_attempt uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a public.exam_attempts; t public.exam_tests;
begin
  perform public.exam_close_expired(auth.uid());
  select * into a from public.exam_attempts where id = p_attempt and user_id = auth.uid();
  if a.id is null then raise exception 'This attempt doesn''t exist.'; end if;
  select * into t from public.exam_tests where id = a.test_id;
  return jsonb_build_object(
    'attempt', jsonb_build_object('id', a.id, 'test_id', a.test_id, 'started_at', a.started_at, 'deadline', a.deadline, 'finished', a.finished_at is not null, 'answers', a.answers),
    'test', jsonb_build_object('id', t.id, 'exam', t.exam, 'paper', t.paper, 'title', t.title, 'minutes', t.minutes, 'max_score', t.max_score, 'data', t.data),
    'now', now());
end $$;

-- autosave while the test runs; false when the time is already up
create or replace function public.exam_save(p_attempt uuid, p_answers jsonb) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if jsonb_typeof(p_answers) <> 'object' or length(p_answers::text) > 60000 then raise exception 'Answers can''t be saved.'; end if;
  update public.exam_attempts set answers = p_answers
  where id = p_attempt and user_id = auth.uid() and finished_at is null and now() <= deadline + interval '2 minutes';
  if found then return true; end if;
  perform public.exam_close_expired(auth.uid());
  return false;
end $$;

-- hand the test in: marked on the server; returns the score
create or replace function public.exam_finish(p_attempt uuid, p_answers jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a public.exam_attempts; r jsonb;
begin
  select * into a from public.exam_attempts where id = p_attempt and user_id = auth.uid() for update;
  if a.id is null then raise exception 'This attempt doesn''t exist.'; end if;
  if a.finished_at is not null then return jsonb_build_object('score', a.score, 'max', a.max_score); end if;
  if p_answers is not null and jsonb_typeof(p_answers) = 'object' and length(p_answers::text) <= 60000
     and now() <= a.deadline + interval '2 minutes' then a.answers := p_answers; end if;
  r := public.exam_grade(a.test_id, a.answers);
  update public.exam_attempts set answers = a.answers, finished_at = least(now(), a.deadline),
         score = (r->>'score')::int, max_score = (r->>'max')::int, result = r
  where id = a.id;
  return jsonb_build_object('score', r->'score', 'max', r->'max');
end $$;

-- after the test: questions, my answers, the key and the explanations
create or replace function public.exam_review(p_attempt uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a public.exam_attempts; t public.exam_tests; k jsonb; who public.profiles;
begin
  select * into a from public.exam_attempts where id = p_attempt;
  if a.id is null or not public.can_see_results(a.user_id) then raise exception 'This attempt doesn''t exist.'; end if;
  perform public.exam_close_expired(a.user_id);
  select * into a from public.exam_attempts where id = p_attempt;
  if a.finished_at is null then raise exception 'This test is still running.'; end if;
  select * into t from public.exam_tests where id = a.test_id;
  select key into k from public.exam_keys where test_id = a.test_id;
  select * into who from public.profiles where id = a.user_id;
  return jsonb_build_object(
    'attempt', jsonb_build_object('id', a.id, 'test_id', a.test_id, 'started_at', a.started_at, 'finished_at', a.finished_at, 'deadline', a.deadline,
                                  'answers', a.answers, 'score', a.score, 'max', a.max_score, 'result', a.result),
    'test', jsonb_build_object('id', t.id, 'exam', t.exam, 'paper', t.paper, 'title', t.title, 'minutes', t.minutes, 'max_score', t.max_score, 'data', t.data),
    'key', coalesce(k->'items', '{}'::jsonb),
    'student', jsonb_build_object('name', who.name, 'email', who.email, 'me', a.user_id = auth.uid()));
end $$;

-- ── results: for the student, their teacher and the admin ────────────
-- an attempt counts in the statistics only if at least a quarter of the questions were answered (not an abandoned test)
create or replace function public.exam_counted(p_answers jsonb, p_test text) returns boolean
language sql stable security definer set search_path = public as $$
  select (select count(*) from jsonb_object_keys(coalesce(p_answers, '{}'::jsonb))) * 4
      >= coalesce((select count(*) from public.exam_keys k, jsonb_object_keys(k.key->'items') where k.test_id = p_test), 0);
$$;
-- every finished attempt and the marks per topic tag and per part, over all attempts
create or replace function public.exam_stats(p_user uuid default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := coalesce(p_user, auth.uid()); who public.profiles;
begin
  if u is null or not public.can_see_results(u) then raise exception 'You can see only your own students.'; end if;
  perform public.exam_close_expired(u);
  select * into who from public.profiles where id = u;
  return jsonb_build_object(
    'student', jsonb_build_object('id', who.id, 'name', who.name, 'email', who.email, 'me', u = auth.uid()),
    'attempts', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'test_id', a.test_id, 'title', t.title, 'exam', t.exam,
                                   'started_at', a.started_at, 'finished_at', a.finished_at, 'score', a.score, 'max', a.max_score,
                                   'parts', a.result->'parts', 'counted', public.exam_counted(a.answers, a.test_id)) order by a.started_at)
                          from public.exam_attempts a join public.exam_tests t on t.id = a.test_id
                          where a.user_id = u and a.finished_at is not null), '[]'::jsonb),
    'tags', coalesce((select jsonb_agg(jsonb_build_object('tag', tag, 'got', g, 'max', m, 'last_got', lg, 'last_max', lm) order by tag)
                      from (select x.key as tag, sum((x.value->>'got')::int) as g, sum((x.value->>'max')::int) as m,
                                   sum((x.value->>'got')::int) filter (where a.rn <= 2) as lg, sum((x.value->>'max')::int) filter (where a.rn <= 2) as lm
                            from (select result, row_number() over (order by started_at desc) as rn
                                  from public.exam_attempts where user_id = u and finished_at is not null
                                  and public.exam_counted(answers, test_id)) a,
                                 jsonb_each(coalesce(a.result->'tags', '{}'::jsonb)) x
                            group by 1) s), '[]'::jsonb));
end $$;

-- the teacher's list: tests taken by each of my students
create or replace function public.my_students_exams() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('email', en.student_email, 'user_id', p.id,
           'attempts', (select count(*) from public.exam_attempts a where a.user_id = p.id and a.finished_at is not null),
           'last', (select jsonb_build_object('score', a.score, 'max', a.max_score, 'at', a.finished_at, 'exam', t.exam)
                    from public.exam_attempts a join public.exam_tests t on t.id = a.test_id
                    where a.user_id = p.id and a.finished_at is not null order by a.started_at desc limit 1))), '[]'::jsonb)
  from public.enrollments en left join public.profiles p on p.email = en.student_email
  where en.teacher_id = auth.uid();
$$;

-- ── admin: import tests (questions + key) from a file on the Admin page ─
create or replace function public.admin_upsert_test(p_test jsonb, p_key jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare id_ text := p_test->>'id'; mx integer; missing text;
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  if coalesce(id_, '') !~ '^[a-z0-9-]{3,40}$' then raise exception 'The test needs an id like cpe-rue-1.'; end if;
  if p_test->>'exam' not in ('cae', 'cpe') then raise exception 'exam must be cae or cpe.'; end if;
  if jsonb_typeof(p_key->'items') <> 'object' then raise exception 'The key has no items.'; end if;
  -- every question in the test must have a key, and the other way round
  select string_agg(q, ', ') into missing from (
    select qq->>'n' as q from jsonb_array_elements(p_test->'data'->'parts') pt, jsonb_array_elements(coalesce(pt->'questions', '[]'::jsonb)) qq
    where not (p_key->'items' ? (qq->>'n'))
    union all
    select k from jsonb_object_keys(p_key->'items') k
    where not exists (select 1 from jsonb_array_elements(p_test->'data'->'parts') pt, jsonb_array_elements(coalesce(pt->'questions', '[]'::jsonb)) qq where qq->>'n' = k)) m;
  if missing is not null then raise exception 'Questions and key don''t match: %', missing; end if;
  select sum(coalesce((v->>'marks')::int, 1)) into mx from jsonb_each(p_key->'items') e(k, v);
  insert into public.exam_tests (id, exam, paper, title, minutes, max_score, published, sort, data, updated_at)
  values (id_, p_test->>'exam', coalesce(p_test->>'paper', 'rue'), p_test->>'title', (p_test->>'minutes')::int, mx,
          coalesce((p_test->>'published')::boolean, true), coalesce((p_test->>'sort')::int, 0), p_test->'data', now())
  on conflict (id) do update set exam = excluded.exam, paper = excluded.paper, title = excluded.title, minutes = excluded.minutes,
         max_score = excluded.max_score, published = excluded.published, sort = excluded.sort, data = excluded.data, updated_at = now();
  insert into public.exam_keys (test_id, key) values (id_, p_key) on conflict (test_id) do update set key = excluded.key;
  return jsonb_build_object('id', id_, 'max', mx);
end $$;

do $$ declare f text; begin
  foreach f in array array['exam_access()', 'can_see_results(uuid)', 'exam_list()', 'exam_start(text)', 'exam_get(uuid)', 'exam_save(uuid,jsonb)',
                           'exam_finish(uuid,jsonb)', 'exam_review(uuid)', 'exam_stats(uuid)', 'my_students_exams()', 'admin_upsert_test(jsonb,jsonb)'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  -- internal helpers: not callable from the site
  foreach f in array array['exam_counted(jsonb,text)', 'exam_grade(text,jsonb)', 'exam_close_expired(uuid)', 'exam_grade_item(jsonb,text)', 'exam_norm(text)'] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
  end loop;
end $$;
