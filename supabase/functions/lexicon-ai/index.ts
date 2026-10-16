// @ts-nocheck — plain JavaScript in a .ts file, so the dashboard deploys it without type errors
// Lexicon AI — Supabase Edge Function "lexicon-ai".
// Writes learner-friendly dictionary entries and course exercises with Cloudflare Workers AI (free tier).
// Secrets (Supabase → Edge Functions → Secrets): CF_ACCOUNT_ID, CF_AI_TOKEN. SUPABASE_URL is provided by Supabase.
// Only signed-in teachers and admins may call it. Nothing here is secret: the keys live in the secrets above.

const CF_ID = (globalThis.Deno?.env.get('CF_ACCOUNT_ID') ?? '').trim();
const CF_TOKEN = (globalThis.Deno?.env.get('CF_AI_TOKEN') ?? '').trim();
const SB_URL = (globalThis.Deno?.env.get('SUPABASE_URL') ?? '').replace(/\/+$/, '');
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

/* ---------------------------------------------------------------- model call */
const MODELS = [
  { id: '@cf/openai/gpt-oss-120b', kind: 'responses' },
  { id: '@cf/meta/llama-3.3-70b-instruct-fp8-fast', kind: 'run' },
];
function textOf(j) {
  const x = j && j.result !== undefined ? j.result : j;
  if (!x) return '';
  if (typeof x === 'string') return x;
  if (typeof x.output_text === 'string' && x.output_text) return x.output_text;
  if (Array.isArray(x.output)) {
    const t = x.output.filter(o => o && (o.type === 'message' || (!o.type && o.content)))
      .flatMap(o => (Array.isArray(o.content) ? o.content : []).map(c => (c && (c.text || c.output_text)) || '')).join('');
    if (t) return t;
  }
  if (typeof x.response === 'string') return x.response;
  if (x.response && typeof x.response === 'object') return JSON.stringify(x.response);
  const c = x.choices && x.choices[0] && x.choices[0].message && x.choices[0].message.content;
  return typeof c === 'string' ? c : '';
}
function cfError(j, status) {
  const e = j && (j.errors || (j.error && [j.error]));
  const m = Array.isArray(e) && e.length ? e.map(x => (x && (x.message || x.code)) || String(x)).join('; ') : (j && j.error && j.error.message) || '';
  return `HTTP ${status}${m ? ': ' + m : ''}`;
}
async function cf(path, body) {
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ID}/ai/${path}`, {
    method: 'POST', headers: { Authorization: 'Bearer ' + CF_TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const txt = await r.text(); let j = null; try { j = JSON.parse(txt); } catch { j = { error: { message: txt.slice(0, 200) } }; }
  return { ok: r.ok, status: r.status, j };
}
let llmImpl = null;                       // tests put a fake model here
const llm = (...a) => (llmImpl ? llmImpl(...a) : callModel(...a));
async function callModel(system, user, maxTokens) {
  const errors = [];
  for (const m of MODELS) {
    try {
      let res;
      if (m.kind === 'responses') {
        const body = { model: m.id, reasoning: { effort: 'low' }, input: [{ role: 'system', content: system }, { role: 'user', content: user }], max_output_tokens: maxTokens + 1500 };
        res = await cf('v1/responses', body);
        if (res.status === 400) { delete body.max_output_tokens; res = await cf('v1/responses', body); }
      } else {
        res = await cf('run/' + m.id, { messages: [{ role: 'system', content: system }, { role: 'user', content: user }], max_tokens: maxTokens, temperature: 0.6 });
      }
      const t = res.ok ? textOf(res.j) : '';
      if (t) return { text: t, model: m.id };
      errors.push(`${m.id}: ${res.ok ? 'empty answer' : cfError(res.j, res.status)}`);
    } catch (e) { errors.push(`${m.id}: ${e && e.message || e}`); }
  }
  throw new Error('The AI service did not answer. ' + errors.join(' | '));
}
function parseJSON(t) {
  let s = String(t || '').replace(/^﻿/, '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error('The AI answer was not JSON.');
  s = s.slice(a, b + 1);
  try { return JSON.parse(s); } catch { return JSON.parse(s.replace(/,\s*([}\]])/g, '$1')); }
}
const SYSTEM = 'You are an experienced Cambridge English examiner and lexicographer who writes materials for C1–C2 (Advanced and Proficiency) learners. You write natural, accurate, modern British English. You answer with one JSON object only, no comments, no markdown.';

/* ---------------------------------------------------------------- text helpers (also used to check the AI) */
const FILLERS = new Set(['sb', 'sth', 'someone', 'somebody', 'something', "one's", 'oneself', 'one', 'to', 'a', 'an', 'the', 'be', 'of', 'in', 'on', 'at', 'for', 'with', 'up', 'out', 'off', 'by', 'it', 'as', 'and', 'or', 'your', 'his', 'her', 'their', 'my']);
const words = s => String(s || '').toLowerCase().replace(/[’‘`]/g, "'").match(/[a-z]+(?:['-][a-z]+)*/g) || [];
const keyTokens = head => { const w = words(head.replace(/\([^)]*\)/g, ' ')); const k = w.filter(x => !FILLERS.has(x) && x.length >= 3); return k.length ? k : w; };
const stemOf = t => t.length <= 4 ? t.slice(0, 3) : t.slice(0, Math.max(4, t.length - 2));
// does text contain a form of head? at least half of its key words (by stem), at least one
function hasForm(text, head) {
  const ws = words(text), ks = keyTokens(head);
  if (!ks.length) return false;
  const hit = ks.filter(k => ws.some(w => w === k || w.startsWith(stemOf(k)) || w.split('-').some(p => p === k)));
  return hit.length >= Math.ceil(ks.length / 2);
}
function whichHead(text, heads) {
  let best = null, score = 0;
  for (const h of heads) { if (!hasForm(text, h)) continue; const s = keyTokens(h).length; if (s > score) { best = h; score = s; } }
  return best;
}
const clean = s => String(s || '').replace(/\s+/g, ' ').trim();
const countWords = s => clean(s).split(' ').filter(Boolean).reduce((n, w) => n + (/\w'(t|d|s|ll|ve|re|m)$/i.test(w.replace(/’/g, "'")) && !/^(let's)$/i.test(w) ? 2 : 1), 0);
const GAP = /_{3,}/g;
const listOf = ws => ws.map((w, i) => `${i + 1}. ${w.head}${w.meaning ? ' — ' + clean(w.meaning).slice(0, 160) : ''}`).join('\n');

/* ---------------------------------------------------------------- tasks */
async function taskWords(p) {
  const items = (p.words || []).slice(0, 20).map(w => ({ head: clean(w.head).slice(0, 80), hint: clean(w.hint || '').slice(0, 200) })).filter(w => w.head);
  if (!items.length) throw new Error('No words given.');
  const user = `For each item below, write a learner's dictionary entry in the style of the Cambridge Advanced Learner's Dictionary.
Rules:
- "meaning": ONE clear definition, 6–25 words, plain English, no labels or brackets, and do not use the item itself in the definition. If the item has several meanings, choose the most common one in modern English, or the one that matches the hint.
- "pos": part of speech, e.g. noun, verb, adjective, adverb, phrasal verb, idiom, phrase.
- "register": one of neutral, formal, informal, literary, slang, old-fashioned.
- "examples": exactly 3 natural example sentences, 8–22 words each, typical of educated modern English, each containing the item (inflected forms are fine, e.g. "took" for "take"), in varied contexts, matching the meaning you gave.
Return {"words":[{"head":"...","pos":"...","register":"...","meaning":"...","examples":["...","...","..."]}]} with the items in the same order.
Items:
${items.map((w, i) => `${i + 1}. ${w.head}${w.hint ? ` (hint: ${w.hint})` : ''}`).join('\n')}`;
  const r = await llm(SYSTEM, user, 220 * items.length + 200);
  const out = parseJSON(r.text).words || [];
  const res = items.map((it, i) => {
    const g = out.find(x => x && clean(x.head).toLowerCase() === it.head.toLowerCase()) || out[i] || {};
    const ex = (Array.isArray(g.examples) ? g.examples : []).map(clean).filter(x => x.length > 10 && x.length < 260);
    const good = ex.filter(x => hasForm(x, it.head));
    return { head: it.head, pos: clean(g.pos).toLowerCase().slice(0, 30), register: clean(g.register).toLowerCase().slice(0, 20), meaning: clean(g.meaning).replace(/^["']|["']$/g, '').slice(0, 300), examples: (good.length ? good : ex).slice(0, 3) };
  });
  return { words: res, model: r.model };
}

async function taskText(p) {
  const ws = topicWords(p), heads = ws.map(w => w.head);
  const n = Math.min(12, Math.max(4, Math.round(ws.length * 0.8)));
  const user = `Topic: "${clean(p.title).slice(0, 80) || 'General'}".
Target words and their meanings:
${listOf(ws)}

Write an engaging, coherent text for C1–C2 learners: 180–260 words, 2–4 paragraphs, on this topic (a short article, story or blog post). It must naturally use ${Math.min(n, ws.length)} different target words from the list (choose the ones that fit best), each once, in the meaning given.
Wrap each target word or phrase exactly as it appears in your text in double curly braces, inflected as needed, e.g. {{reluctant}}, {{took it for granted}}. Wrap only the target words themselves, nothing else, and never two targets in one pair of braces.
Return {"title":"a short title","paragraphs":["...","..."]}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await llm(SYSTEM, user, 900);
    const j = parseJSON(r.text);
    const paras = (Array.isArray(j.paragraphs) ? j.paragraphs : [j.text || '']).map(x => String(x || '')).filter(x => x.trim());
    const gaps = [], used = new Set();
    const out = paras.map(par => clean(par.replace(/\{\{([^{}]{1,60})\}\}/g, (_, form) => {
      const f = clean(form), h = whichHead(f, heads);
      if (!h || used.has(h)) return f;                          // not one of the words, or a repeat: leave it as plain text
      used.add(h); gaps.push({ n: gaps.length + 1, head: h, form: f });
      return `[[${gaps.length}]]`;
    })).replace(/\{\{|\}\}/g, ''));
    if (gaps.length >= Math.min(4, ws.length)) return { text: { title: clean(j.title).slice(0, 90), paragraphs: out, gaps }, model: r.model };
  }
  throw new Error('The AI could not write a good text with these words. Try again.');
}

async function taskCloze(p) {
  const ws = topicWords(p), heads = ws.map(w => w.head);
  const n = Math.min(10, Math.max(4, ws.length));
  const user = `Topic: "${clean(p.title).slice(0, 80) || 'General'}".
Target words and their meanings:
${listOf(ws)}

Write ${n} multiple-choice gap-fill items in the style of Cambridge C2 Proficiency Reading and Use of English Part 1, one sentence each (15–30 words) with exactly one gap written as _____.
- The correct answer is one target word (in the form needed); use each target word at most once.
- The three distractors are other target words or real English words of the same part of speech and similar look or meaning, but each must be clearly WRONG in that sentence because of meaning, collocation or grammar. Exactly one option fits. Avoid near-synonyms that would also be correct.
- "why": one sentence explaining why the answer fits and the others do not.
Return {"items":[{"sentence":"... _____ ...","options":["...","...","...","..."],"answer":"the correct option, exactly as in options","target":"the target word","why":"..."}]}`;
  const r = await llm(SYSTEM, user, 140 * n + 200);
  const items = (parseJSON(r.text).items || []).map(x => {
    const sentence = clean(x && x.sentence).replace(GAP, '_____');
    const options = [...new Set((Array.isArray(x && x.options) ? x.options : []).map(clean).filter(Boolean))];
    const answer = clean(x && x.answer);
    const target = whichHead(answer, heads) || whichHead(clean(x && x.target), heads);
    return { sentence, options, answer, target, why: clean(x && x.why).slice(0, 300) };
  }).filter(x => (x.sentence.match(/_____/g) || []).length === 1 && x.options.length === 4 && x.options.some(o => o.toLowerCase() === x.answer.toLowerCase()) && x.target);
  const seen = new Set();
  return { cloze: items.filter(x => !seen.has(x.target) && seen.add(x.target)).map(x => ({ ...x, answer: x.options.find(o => o.toLowerCase() === x.answer.toLowerCase()) })), model: r.model };
}

async function taskKwt(p) {
  const ws = topicWords(p), heads = ws.map(w => w.head);
  const n = Math.min(8, Math.max(3, Math.round(ws.length * 0.6)));
  const user = `Topic: "${clean(p.title).slice(0, 80) || 'General'}".
Target words and their meanings:
${listOf(ws)}

Write ${n} key word transformation items in the style of Cambridge C2 Proficiency (Reading and Use of English Part 4). Each item tests one target word or expression (each at most once; prefer ones that can be tested naturally).
For each item:
- "first": the first sentence, complete.
- "key": ONE key word, which the student must use without changing it. It is the target word itself or one word of the target expression.
- "second": a second sentence with the same meaning as the first, with exactly one gap written as _____ .
- "answers": 1–4 fully correct ways to fill the gap: only the missing words, 3 to 8 words each (contractions count as two words), each containing the key word unchanged, each using the target word or expression.
- "target": the target word or expression tested.
- "why": one sentence on the grammar or vocabulary point.
Check every answer: the second sentence with the answer in the gap must be correct English and mean the same as the first sentence.
Return {"items":[{"first":"...","key":"...","second":"... _____ ...","answers":["..."],"target":"...","why":"..."}]}`;
  const r = await llm(SYSTEM, user, 170 * n + 200);
  const items = (parseJSON(r.text).items || []).map(x => {
    const key = clean(x && x.key).replace(/[^A-Za-z'-]/g, '').toUpperCase();
    const second = clean(x && x.second).replace(GAP, '_____');
    const answers = [...new Set((Array.isArray(x && x.answers) ? x.answers : []).map(a => clean(a).replace(/[.!?]+$/, '')).filter(a => {
      const n = countWords(a);
      return n >= 3 && n <= 8 && words(a).includes(key.toLowerCase());
    }))];
    const target = whichHead(clean(x && x.target), heads) || answers.map(a => whichHead(a + ' ' + second, heads)).find(Boolean);
    return { first: clean(x && x.first), key, second, answers, target, why: clean(x && x.why).slice(0, 300) };
  }).filter(x => x.first && x.key && !/\s/.test(x.key) && (x.second.match(/_____/g) || []).length === 1 && x.answers.length && x.target);
  return { kwt: items, model: r.model };
}

function topicWords(p) {
  const ws = (p.words || []).map(w => ({ head: clean(w.head).slice(0, 80), meaning: clean(w.meaning).slice(0, 200) })).filter(w => w.head).slice(0, 30);
  if (ws.length < 3) throw new Error('Add at least 3 words to the topic first.');
  return ws;
}

const TASKS = { words: taskWords, text: taskText, cloze: taskCloze, kwt: taskKwt };

/* ---------------------------------------------------------------- request */
async function who(req) {
  const auth = req.headers.get('authorization') || '', apikey = req.headers.get('apikey') || '';
  if (!/^Bearer\s+\S+/.test(auth)) return null;
  const u = await fetch(SB_URL + '/auth/v1/user', { headers: { Authorization: auth, apikey } });
  if (!u.ok) return null;
  const user = await u.json();
  const p = await fetch(`${SB_URL}/rest/v1/profiles?select=role&id=eq.${encodeURIComponent(user.id)}`, { headers: { Authorization: auth, apikey } }).then(r => r.ok ? r.json() : []);
  return { id: user.id, role: p && p[0] && p[0].role };
}

export async function handle(req) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'Use POST.' });
  try {
    const me = await who(req);
    if (!me) return json(401, { error: 'Sign in again to use AI.' });
    if (me.role !== 'teacher' && me.role !== 'admin') return json(403, { error: 'Only teachers can use AI.' });
    const body = await req.json().catch(() => ({}));
    if (body.task === 'ping') return json(200, { ok: true, cloudflare: !!(CF_ID && CF_TOKEN) });
    if (!CF_ID || !CF_TOKEN) return json(500, { error: 'AI is not set up: add the secrets CF_ACCOUNT_ID and CF_AI_TOKEN in Supabase.' });
    const fn = TASKS[body.task];
    if (!fn) return json(400, { error: 'Unknown task.' });
    return json(200, await fn(body));
  } catch (e) {
    return json(502, { error: String(e && e.message || e).slice(0, 600) });
  }
}

export const _test = { textOf, parseJSON, hasForm, whichHead, countWords, keyTokens, TASKS, setLLM: f => { llmImpl = f; } };

if (globalThis.Deno) Deno.serve(handle);
