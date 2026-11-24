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
/* Cloudflare's free AI allowance is shared by the whole site (10,000 "neurons" a day, reset at 00:00 UTC = 03:00 Moscow).
   When it runs out, every AI feature stops for everyone until the reset — say so plainly instead of a raw error. */
class SiteLimit extends Error { constructor(daily) { super(daily
  ? 'The free AI allowance for the whole site is used up for today. It comes back at 03:00 Moscow time (00:00 UTC). Your work is kept: try again after that.'
  : 'The AI is busy right now. Wait a minute and press the button again.'); this.siteLimit = true; this.daily = daily; } }
function quotaHit(status, j) {
  const t = JSON.stringify(j || '');
  if (/4006|daily free allocation|neurons/i.test(t)) return new SiteLimit(true);
  if (status === 429) return new SiteLimit(false);
  return null;
}
async function cf(path, body) {
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ID}/ai/${path}`, {
    method: 'POST', headers: { Authorization: 'Bearer ' + CF_TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const txt = await r.text(); let j = null; try { j = JSON.parse(txt); } catch { j = { error: { message: txt.slice(0, 200) } }; }
  if (!r.ok) { const lim = quotaHit(r.status, j); if (lim) throw lim; }
  return { ok: r.ok, status: r.status, j };
}
let llmImpl = null;                       // tests put a fake model here
const llm = (...a) => (llmImpl ? llmImpl(...a) : callModel(...a));
async function callModel(system, user, maxTokens, effort = 'low', jsonMode = false) {
  const errors = [];
  for (const m of MODELS) {
    try {
      let res;
      if (m.kind === 'responses') {
        const body = { model: m.id, reasoning: { effort }, input: [{ role: 'system', content: system }, { role: 'user', content: user }], max_output_tokens: maxTokens + 5000 };   // reasoning tokens count too: a tight cap cuts the JSON off
        if (jsonMode) body.text = { format: { type: 'json_object' } };
        res = await cf('v1/responses', body);
        if (res.status === 400 && body.text) { delete body.text; res = await cf('v1/responses', body); }
        if (res.status === 400) { delete body.max_output_tokens; res = await cf('v1/responses', body); }
      } else {
        const body = { messages: [{ role: 'system', content: system }, { role: 'user', content: user }], max_tokens: Math.round(maxTokens * 1.6) + 400, temperature: 0.6 };
        if (jsonMode) body.response_format = { type: 'json_object' };
        res = await cf('run/' + m.id, body);
        if (res.status === 400 && body.response_format) { delete body.response_format; res = await cf('run/' + m.id, body); }
      }
      const t = res.ok ? textOf(res.j) : '';
      if (t) return { text: t, model: m.id };
      errors.push(`${m.id}: ${res.ok ? 'empty answer' : cfError(res.j, res.status)}`);
    } catch (e) { if (e instanceof SiteLimit) throw e; errors.push(`${m.id}: ${e && e.message || e}`); }
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

/* which words to write items for: all topic words, or only the ones a first answer missed ("only") */
function targetsOf(p, ws, max) {
  const only = new Set((p.only || []).map(x => clean(x).toLowerCase()));
  const t = only.size ? ws.filter(w => only.has(w.head.toLowerCase())) : ws;
  return (t.length ? t : ws).slice(0, max);
}
function salvageGap(sentence, answer) {
  let s = clean(sentence).replace(GAP, '_____');
  if (!/_____/.test(s) && answer && answer.length >= 3) {   // the model wrote the answer instead of a gap
    const re = new RegExp('(^|[^A-Za-z])' + answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![A-Za-z])', 'i');
    s = s.replace(re, (m, pre) => pre + '_____');
  }
  return s;
}

async function taskCloze(p) {
  const ws = topicWords(p), heads = ws.map(w => w.head), targets = targetsOf(p, ws, 12);
  const user = `Topic: "${clean(p.title).slice(0, 80) || 'General'}".
All target words of the topic (for distractors) and their meanings:
${listOf(ws)}

Write exactly ${targets.length} multiple-choice gap-fill items, ONE FOR EACH of these words, in this order: ${targets.map(w => `"${w.head}"`).join(', ')}.
Style: Cambridge C2 Proficiency Reading and Use of English Part 1, one sentence each (15–30 words) with exactly one gap written as _____.
- The correct answer is the target word in the form the sentence needs. If the expression has a possessive (one's, your…), use the possessive that agrees with the sentence (e.g. "pull their socks up").
- The three distractors are other target words or real English words of the same part of speech and similar look or meaning, but each must be clearly WRONG in that sentence because of meaning, collocation or grammar. Exactly one option fits. Avoid near-synonyms that would also be correct.
- "why": one sentence explaining why the answer fits and the others do not.
Return {"items":[{"target":"the target word","sentence":"... _____ ...","options":["...","...","...","..."],"answer":"the correct option, exactly as in options","why":"..."}]}`;
  const r = await llm(SYSTEM, user, 150 * targets.length + 200);
  const raw = parseJSON(r.text).items || [];
  const dropped = [];
  const items = raw.map((x, i) => {
    const answer = clean(x && x.answer);
    let options = [...new Set((Array.isArray(x && x.options) ? x.options : []).map(clean).filter(Boolean))];
    if (answer && !options.some(o => o.toLowerCase() === answer.toLowerCase())) options = [answer].concat(options);
    if (options.length > 4) options = [options.find(o => o.toLowerCase() === answer.toLowerCase())].concat(options.filter(o => o.toLowerCase() !== answer.toLowerCase()).slice(0, 3));
    const sentence = salvageGap(x && x.sentence, answer);
    const target = whichHead(clean(x && x.target), heads) || whichHead(answer, heads) || (targets.length === raw.length && targets[i] ? targets[i].head : null);
    const why = clean(x && x.why).slice(0, 300);
    const bad = (sentence.match(/_____/g) || []).length !== 1 ? 'no single gap' : options.length !== 4 ? 'not 4 options' : !answer ? 'no answer' : !target ? 'not one of the words' : '';
    if (bad) dropped.push(bad);
    return bad ? null : { sentence, options, answer: options.find(o => o.toLowerCase() === answer.toLowerCase()), target, why };
  }).filter(Boolean);
  const seen = new Set();
  return { cloze: items.filter(x => !seen.has(x.target) && seen.add(x.target)), dropped, model: r.model };
}

async function taskKwt(p) {
  const ws = topicWords(p), heads = ws.map(w => w.head), targets = targetsOf(p, ws, 10);
  const user = `Topic: "${clean(p.title).slice(0, 80) || 'General'}".
Target words and their meanings:
${listOf(ws)}

Write exactly ${targets.length} key word transformation items in the style of Cambridge C2 Proficiency (Reading and Use of English Part 4), ONE FOR EACH of these words, in this order: ${targets.map(w => `"${w.head}"`).join(', ')}.
For each item:
- "target": the target word or expression tested.
- "first": the first sentence, complete, WITHOUT the target expression.
- "key": ONE single key word in capitals that the student must use unchanged. It is the target word itself or one word of the target expression.
- "second": a second sentence with the same meaning as the first, with exactly one gap written as _____ .
- "answers": 1–4 fully correct ways to fill the gap: only the missing words, 3 to 8 words each (contractions count as two words), each containing the key word unchanged, each using the target word or expression. Possessives must agree with the sentence (their, his, her…).
- "why": one sentence on the grammar or vocabulary point.
Check every answer: the second sentence with the answer in the gap must be correct English and mean the same as the first sentence.
Return {"items":[{"target":"...","first":"...","key":"...","second":"... _____ ...","answers":["..."],"why":"..."}]}`;
  const r = await llm(SYSTEM, user, 190 * targets.length + 200);
  const raw = parseJSON(r.text).items || [];
  const dropped = [];
  const items = raw.map((x, i) => {
    let answers = (Array.isArray(x && x.answers) ? x.answers : [x && x.answer]).map(a => clean(a).replace(/^\.\.\.|\.\.\.$/g, '').replace(/[.!?]+$/, '').trim()).filter(Boolean);
    let key = clean(x && x.key).replace(/[^A-Za-z' -]/g, '').trim();
    if (/\s/.test(key)) {                                  // "SOCKS UP" → the word every answer contains
      const cand = words(key).filter(k => answers.every(a => words(a).includes(k)) && !FILLERS.has(k));
      key = cand[0] || '';
    }
    key = key.toUpperCase();
    answers = [...new Set(answers.filter(a => { const n = countWords(a); return n >= 3 && n <= 8 && words(a).includes(key.toLowerCase()); }))];
    const second = salvageGap(x && x.second, '');
    const target = whichHead(clean(x && x.target), heads) || answers.map(a => whichHead(a, heads)).find(Boolean) || (targets.length === raw.length && targets[i] ? targets[i].head : null);
    const bad = !clean(x && x.first) ? 'no first sentence' : !key ? 'no single key word' : (second.match(/_____/g) || []).length !== 1 ? 'no single gap' : !answers.length ? 'no answer of 3–8 words with the key word' : !target ? 'not one of the words' : '';
    if (bad) dropped.push(bad);
    return bad ? null : { first: clean(x.first), key, second, answers, target, why: clean(x && x.why).slice(0, 300) };
  }).filter(Boolean);
  const seen = new Set();
  return { kwt: items.filter(x => !seen.has(x.target) && seen.add(x.target)), dropped, model: r.model };
}

function topicWords(p) {
  const ws = (p.words || []).map(w => ({ head: clean(w.head).slice(0, 80), meaning: clean(w.meaning).slice(0, 200) })).filter(w => w.head).slice(0, 30);
  if (ws.length < 3) throw new Error('Add at least 3 words to the topic first.');
  return ws;
}

/* ---------------------------------------------------------------- writing: marked like a Cambridge examiner */
// Official subscales (Cambridge English teacher guides for writing, C1 Advanced and C2 Proficiency). Bands 0–5 each, 20 per task.
const SCALE = {
  cpe: `C2 PROFICIENCY WRITING ASSESSMENT SCALE (each subscale 0–5; band 4 shares features of 3 and 5, band 2 of 1 and 3, band 0 is below band 1)
CONTENT — 5: All content is relevant to the task. Target reader is fully informed. 3: Minor irrelevances and/or omissions may be present. Target reader is on the whole informed. 1: Irrelevances and misinterpretation of task may be present. Target reader is minimally informed. 0: Content is totally irrelevant; target reader is not informed.
COMMUNICATIVE ACHIEVEMENT — 5: Demonstrates complete command of the conventions of the communicative task. Communicates complex ideas in an effective and convincing way, holding the target reader's attention with ease, fulfilling all communicative purposes. 3: Uses the conventions of the communicative task with sufficient flexibility to communicate complex ideas in an effective way, holding the target reader's attention with ease, fulfilling all communicative purposes. 1: Uses the conventions of the communicative task effectively to hold the target reader's attention and communicate straightforward and complex ideas, as appropriate.
ORGANISATION — 5: Text is organised impressively and coherently using a wide range of cohesive devices and organisational patterns with complete flexibility. 3: Text is a well-organised, coherent whole, using a variety of cohesive devices and organisational patterns with flexibility. 1: Text is well organised and coherent, using a variety of cohesive devices and organisational patterns to generally good effect.
LANGUAGE — 5: Uses a wide range of vocabulary, including less common lexis, with fluency, precision, sophistication and style. Use of grammar is sophisticated, fully controlled and completely natural. Any inaccuracies occur only as slips. 3: Uses a range of vocabulary, including less common lexis, effectively and precisely. Uses a wide range of simple and complex grammatical forms with full control, flexibility and sophistication. Errors, if present, are related to less common words and structures, or occur as slips. 1: Uses a range of vocabulary, including less common lexis, appropriately. Uses a range of simple and complex grammatical forms with control and flexibility. Occasional errors may be present but do not impede communication.
On this scale band 3 or above means C2 level; bands 1–2 mean C1.`,
  cae: `C1 ADVANCED WRITING ASSESSMENT SCALE (each subscale 0–5; band 4 shares features of 3 and 5, band 2 of 1 and 3, band 0 is below band 1)
CONTENT — 5: All content is relevant to the task. Target reader is fully informed. 3: Minor irrelevances and/or omissions may be present. Target reader is on the whole informed. 1: Irrelevances and misinterpretation of task may be present. Target reader is minimally informed. 0: Content is totally irrelevant; target reader is not informed.
COMMUNICATIVE ACHIEVEMENT — 5: Uses the conventions of the communicative task with sufficient flexibility to communicate complex ideas in an effective way, holding the target reader's attention with ease, fulfilling all communicative purposes. 3: Uses the conventions of the communicative task effectively to hold the target reader's attention and communicate straightforward and complex ideas, as appropriate. 1: Uses the conventions of the communicative task to hold the target reader's attention and communicate straightforward ideas.
ORGANISATION — 5: Text is a well-organised, coherent whole, using a variety of cohesive devices and organisational patterns with flexibility. 3: Text is well organised and coherent, using a variety of cohesive devices and organisational patterns to generally good effect. 1: Text is generally well organised and coherent, using a variety of linking words and cohesive devices.
LANGUAGE — 5: Uses a range of vocabulary, including less common lexis, effectively and precisely. Uses a wide range of simple and complex grammatical forms with full control, flexibility and sophistication. Errors, if present, are related to less common words and structures, or occur as slips. 3: Uses a range of vocabulary, including less common lexis, appropriately. Uses a range of simple and complex grammatical forms with control and flexibility. Occasional errors may be present but do not impede communication. 1: Uses a range of everyday vocabulary appropriately, with occasional inappropriate use of less common lexis. Uses a range of simple and some complex grammatical forms with a good degree of control. Errors do not impede communication.
On this scale band 3 or above means C1 level; bands 1–2 mean B2.`,
};
const LIMITS = { cpe: { 1: [240, 280], 2: [280, 320] }, cae: { 1: [220, 260], 2: [220, 260] } };
const SUBS = ['content', 'communicative', 'organisation', 'language'];
const SECRET = (() => {
  try { const j = JSON.parse(globalThis.Deno?.env.get('SUPABASE_SECRET_KEYS') || '{}'); const v = Object.values(j)[0]; if (v) return String(v); } catch { /* */ }
  return globalThis.Deno?.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
})();
async function svc(fn, args) {             // database functions only the server may call (quota, saving the mark)
  if (!SECRET) return { ok: false, j: null };
  const headers = { apikey: SECRET, 'Content-Type': 'application/json' };
  if (SECRET.split('.').length === 3) headers.Authorization = 'Bearer ' + SECRET;   // legacy service_role JWT
  const r = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, { method: 'POST', headers, body: JSON.stringify(args) });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { j = t; }
  return { ok: r.ok, j };
}
const WRITING_PER_DAY = { student: 3, teacher: 20, admin: 50 };
async function hasAccess(me) {             // students: only those a teacher added (same rule as the tests)
  if (me.role === 'teacher' || me.role === 'admin' || !me.auth) return true;
  const a = await fetch(`${SB_URL}/rest/v1/rpc/exam_access`, { method: 'POST', headers: { Authorization: me.auth, apikey: me.apikey, 'Content-Type': 'application/json' }, body: '{}' }).then(r => r.ok ? r.json() : null).catch(() => null);
  return a !== false;
}

async function taskWriting(p, me) {
  const exam = p.exam === 'cae' ? 'cae' : 'cpe', part = +p.part === 2 ? 2 : 1;
  const text = String(p.text || '').replace(/\r/g, '').trim().slice(0, 9000);
  const n = clean(text).split(' ').filter(w => /[A-Za-z]/.test(w)).length;
  if (n < 60) throw new Error('Write at least 60 words before asking for a mark.');
  const [lo, hi] = LIMITS[exam][part];
  if (!(await hasAccess(me))) return { error: 'Writing practice is open to students of a teacher on Lexicon. Ask your teacher to add your email.' };
  const limit = WRITING_PER_DAY[me.role] || 3;
  const q = await svc('ai_take', { p_user: me.id, p_kind: 'writing', p_limit: limit });
  if (q.ok && q.j === -1) return { error: `Today's ${limit} AI checks are used up. They come back tomorrow.`, limit: true };
  if (q.ok) me.took = 'writing';
  const level = exam === 'cpe' ? 'C2 Proficiency (CPE)' : 'C1 Advanced (CAE)';
  const user = `You are a senior Cambridge English examiner marking ${level} Writing, Part ${part}.
TASK (type: ${clean(p.type) || (part === 1 ? 'essay' : 'not given')}; required length ${lo}–${hi} words):
"""${String(p.prompt || '').slice(0, 3000)}"""

${SCALE[exam]}

How to mark:
- Mark against THIS level's descriptors exactly as a trained Cambridge examiner would. Be strict and realistic: do not inflate. Band 5 is rare. A competent but unremarkable answer is band 3.
- Content: check every required element of the task (for a Part 1 CPE essay: summary AND evaluation of the key points of BOTH texts plus the writer's own ideas; for a C1 essay: two of the three aspects discussed, which is more important and why). Missing elements lower Content.
- Communicative achievement: register, format and conventions of the task type (essay, article, letter, report, review, proposal, email) and the effect on the target reader.
- The text has ${n} words (required ${lo}–${hi}). A much shorter text usually cannot fully inform the reader; a much longer one tends to lose focus. Mention length only if it matters.
- Errors: quote the exact words from the text.
Return one JSON object:
{"scores":{"content":{"band":0-5,"why":"1–2 sentences"},"communicative":{"band":0-5,"why":"..."},"organisation":{"band":0-5,"why":"..."},"language":{"band":0-5,"why":"..."}},
"summary":"2–3 sentences: overall impression and the level this text shows",
"strengths":["2–4 specific strengths"],
"priorities":["the 3 changes that would raise the mark most, specific and actionable"],
"errors":[{"quote":"exact words from the text","fix":"corrected version","why":"short reason"}],
"vocabulary":[{"instead":"word or phrase used","try":"more precise / higher-level alternative","why":"short"}],
"model":"the weakest paragraph rewritten at band 5 level, keeping the writer's ideas"}
Give up to 12 errors (the most important first) and up to 6 vocabulary upgrades.

THE CANDIDATE'S TEXT:
"""${text}"""`;
  const r = await llm(SYSTEM, user, 2600, 'medium');
  const j = parseJSON(r.text);
  const sc = {}; let total = 0;
  for (const k of SUBS) {
    const x = (j.scores && j.scores[k]) || {};
    const b = Math.max(0, Math.min(5, Math.round(+x.band || 0)));
    sc[k] = { band: b, why: clean(x.why).slice(0, 400) }; total += b;
  }
  const low = text.toLowerCase();
  const result = {
    scores: sc, total, words: n, range: [lo, hi], model: r.model,
    summary: clean(j.summary).slice(0, 800),
    strengths: (j.strengths || []).map(clean).filter(Boolean).slice(0, 4),
    priorities: (j.priorities || []).map(clean).filter(Boolean).slice(0, 3),
    errors: (j.errors || []).map(e => ({ quote: clean(e && e.quote), fix: clean(e && e.fix), why: clean(e && e.why).slice(0, 200) }))
      .filter(e => e.quote && e.fix && e.quote.toLowerCase() !== e.fix.toLowerCase() && low.includes(e.quote.toLowerCase())).slice(0, 12),
    vocabulary: (j.vocabulary || []).map(v => ({ instead: clean(v && v.instead), try: clean(v && v.try), why: clean(v && v.why).slice(0, 200) })).filter(v => v.instead && v.try).slice(0, 6),
    example: String(j.model || '').trim().slice(0, 2500),
    left: q.ok && typeof q.j === 'number' ? q.j : null,
  };
  const saved = await svc('writing_save', { p_user: me.id, p_exam: exam, p_task: clean(p.taskId).slice(0, 60) || 'free', p_part: part, p_title: clean(p.title).slice(0, 200), p_text: text, p_words: n, p_score: total, p_result: result });
  result.id = saved.ok && typeof saved.j === 'string' ? saved.j : null;
  return { writing: result };
}

/* ---------------------------------------------------------------- full essay check: any task, strict examiner + line-by-line editor */
// Three calls run side by side so the answer stays well inside the function's time limit:
//   A — examiner: task achievement, the four subscales with evidence, strengths, paragraphs, cohesion, priorities;
//   B — editor: every error and every place that could be said better, each explained, with Cambridge Dictionary entries;
//   C — the whole text rewritten at the top band, keeping the writer's ideas.
const TYPES = { cae: { 1: ['essay'], 2: ['email', 'letter', 'proposal', 'report', 'review'] }, cpe: { 1: ['essay'], 2: ['article', 'letter', 'report', 'review', 'essay'] } };
const CONVENTIONS = {
  essay: 'Essay: formal or neutral register; a clear introduction, a logically developed argument in paragraphs, a conclusion that answers the question; the writer\'s view must be clear; no headings.',
  article: 'Article: written for the readers of a magazine or website; engaging title; hooks and holds the reader (direct questions, anecdotes, vivid language); register suits the publication; may be semi-formal; no letter features.',
  letter: 'Letter: appropriate opening and closing (Dear …, Yours sincerely / faithfully / best wishes) for the relationship; register consistent with the reader; clear reason for writing early on; paragraphs; no headings; avoid essay signposting such as "Firstly / In conclusion".',
  email: 'Email: as a letter, with register matching the relationship (formal to a manager, informal to a friend); greeting and sign-off; clear purpose.',
  report: 'Report: written for a superior or a group; factual, impersonal, formal register; a title and clear headings; an introduction stating the aim; sections that present information objectively; recommendations or a conclusion with justification; bullet points acceptable but not throughout.',
  review: 'Review: for readers of a magazine or website; describes AND evaluates; engaging, often semi-formal; a title; a clear recommendation for a particular kind of reader at the end.',
  proposal: 'Proposal: written for a superior or committee; formal; title and headings; states the purpose, describes the current situation, makes concrete suggestions and explains their benefits, persuades the reader; ends with a persuasive conclusion.',
};
const PART1 = {
  cpe: 'C2 Proficiency Writing Part 1 (compulsory essay, 240–280 words): the candidate reads two texts (about 100 words each) and must write an essay that SUMMARISES and EVALUATES the key points of BOTH texts and includes the candidate\'s OWN ideas, all integrated into a coherent argument, in the candidate\'s OWN WORDS. Lifting phrases from the texts, summarising only one text, describing without evaluating, or leaving out the candidate\'s own view all lower Content (and usually Communicative Achievement).',
  cae: 'C1 Advanced Writing Part 1 (compulsory essay, 220–260 words): based on notes taken in a class or after a discussion: the candidate must discuss TWO of the three points given, explain which of the two is more important (or more effective), and give reasons; the opinions in the notes may be used but in the candidate\'s own words. Discussing only one point, not saying which is more important, or not justifying it lowers Content.',
};
const STRICT = `HOW A TRAINED CAMBRIDGE EXAMINER MARKS — follow exactly, be strict:
- Each subscale is marked on its own. Start from band 3 and move up ONLY with clear evidence that the text matches the higher descriptor; move down at the first clear evidence of a lower one. Band 4 = all of band 3 and some of band 5. Band 5 is rare and needs a near-flawless, genuinely impressive text for this level.
- Examiners' questions — Content: has the candidate done everything the task asks, omitted anything, included anything irrelevant; would the target reader have all the information they need? Communicative achievement: is the register, tone and format right for the purpose and the target reader; are the conventions of this task type used, and is the reader's attention held? Organisation: is the text logical, ordered, easy to follow; are cohesive devices and organisational patterns varied and natural, or mechanical and repetitive ("Firstly… Secondly… In conclusion")? Language: range and precision of vocabulary and grammar, and accuracy; do errors distract or confuse?
- Glossary — Slip: a mistake with something the writer clearly knows and otherwise uses correctly. Error: a repeated or systematic mistake. Less common lexis: precise vocabulary that is not often used in this context. Flexibility: varying words, structures and patterns instead of repeating the same ones. Appropriate: fits both the context and the words around it (collocation, register).
- Language: errors that are not slips (repeated tense, article, preposition, agreement, collocation errors) keep Language at band 3 or below at this level; frequent errors or errors with basic structures mean band 2 or lower. Over-ambitious vocabulary that does not collocate or has the wrong register counts against the writer, not for them. Spelling and punctuation errors lower Language.
- Content: any missing part of the task means band 3 at most; a major part missing or a misread task means band 2 or lower. Irrelevant material also lowers Content.
- Communicative achievement: wrong register or conventions of another task type (e.g. essay signposting in a letter or article, no headings in a report) lower this mark.
- Length: Cambridge does not deduct marks for word count as such, but a text well under the limit rarely informs the reader fully (Content), and a text far over it usually contains irrelevance.
- Never reward a text for length, for "big words" or for being on topic alone. Do not be generous to be encouraging: the learner wants an exact, honest mark.`;
const CALIBRATE = {
  cae: `CALIBRATION FOR THE C1 ADVANCED SCALE (real examiners' marks; most candidates get 2–3 on each subscale):
- A typical B2 text — basic errors that recur (subject–verb agreement such as "governments has", "discuss about", "made people to do", "can be spend", missing apostrophes, effect/affect), everyday vocabulary with little less common lexis, formulaic linking ("In this essay I will…", "Firstly… Secondly… In conclusion"), opinions stated rather than developed — gets about Content 2–3, Communicative Achievement 2, Organisation 2, Language 1–2: 7–10 out of 20.
- A solid C1 text — few errors, mostly with less common words or structures; a range of less common lexis used appropriately; varied, natural cohesion; ideas developed with reasons and examples; consistent register — gets 3 on each subscale: about 12.
- Bands 4–5 are for texts close to C2: precise, natural, sophisticated, almost error-free. Never give 4 or 5 for Language if the text has more than two or three non-slip errors.`,
  cpe: `CALIBRATION FOR THE C2 PROFICIENCY SCALE (real examiners' marks; most candidates get 2–3 on each subscale):
- A typical C1 text — some recurring errors, vocabulary that is good but rarely precise or idiomatic, competent but predictable organisation, ideas that are clear but not argued with real sophistication — gets about 2 on each subscale: 7–10 out of 20. A B2-like text with basic errors gets 1 or 0 for Language.
- A solid C2 text — errors only with rare structures or as slips; precise, idiomatic, less common lexis; flexible organisation; a convincing, nuanced argument — gets 3 on each subscale: about 12.
- Bands 4–5 are for texts an educated native-speaker editor would barely change. Never give 4 or 5 for Language if the text has more than one or two non-slip errors.`,
};

const dictLink = term => {
  const t = clean(clean(term).replace(/[“”"]/g, '').replace(/\([^)]*\)/g, ' ')).replace(/[’‘]/g, "'");
  if (!t || t.length > 60 || !/^[A-Za-z][A-Za-z' -]*[A-Za-z]$/.test(t)) return null;
  return { term: t, url: 'https://dictionary.cambridge.org/search/direct/?datasetsearch=english&q=' + encodeURIComponent(t.toLowerCase()) };   // finds the entry for inflected forms and phrasal verbs, suggests idioms
};
const links = a => [...new Map((Array.isArray(a) ? a : [a]).map(dictLink).filter(Boolean).map(l => [l.term.toLowerCase(), l])).values()].slice(0, 4);
const norm = s => String(s || '').replace(/[’‘`]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim().toLowerCase();
const ISSUE_TYPES = ['grammar', 'vocabulary', 'collocation', 'word choice', 'register', 'spelling', 'punctuation', 'cohesion', 'style', 'task'];
const LEVELS = { cpe: { hi: 'C2', lo: 'C1' }, cae: { hi: 'C1', lo: 'B2' } };

async function taskEssay(p, me) {
  const t0 = Date.now();
  const exam = p.exam === 'cae' ? 'cae' : 'cpe', part = +p.part === 2 ? 2 : 1;
  const type = TYPES[exam][part].includes(clean(p.type).toLowerCase()) ? clean(p.type).toLowerCase() : TYPES[exam][part][0];
  const text = String(p.text || '').replace(/\r/g, '').trim().slice(0, 9000);
  const prompt = String(p.prompt || '').replace(/\r/g, '').trim().slice(0, 4000);
  const n = clean(text).split(' ').filter(w => /[A-Za-z]/.test(w)).length;
  if (n < 80) throw new Error('Write at least 80 words before asking for a full check.');
  if (n > 900) throw new Error('This text is too long for one check (over 900 words). Check one task at a time.');
  const [lo, hi] = LIMITS[exam][part];
  if (!(await hasAccess(me))) return { error: 'Writing practice is open to students of a teacher on Brightword. Ask your teacher to add your email.' };
  const limit = WRITING_PER_DAY[me.role] || 3;
  const q = await svc('ai_take', { p_user: me.id, p_kind: 'writing', p_limit: limit });
  if (q.ok && q.j === -1) return { error: `Today's ${limit} AI checks are used up. They come back tomorrow.`, limit: true };
  if (q.ok) me.took = 'writing';

  const level = exam === 'cpe' ? 'C2 Proficiency (CPE)' : 'C1 Advanced (CAE)';
  const paras = text.split(/\n\s*\n|\n(?=\S)/).map(s => s.trim()).filter(Boolean);
  const numbered = paras.map((s, i) => `[P${i + 1}] ${s}`).join('\n\n');
  const context = `EXAM: ${level}, Writing Part ${part}. TASK TYPE: ${type}. Required length: ${lo}–${hi} words. The candidate wrote ${n} words in ${paras.length} paragraph(s).
${part === 1 ? PART1[exam] + '\n' : ''}CONVENTIONS OF THIS TASK TYPE: ${CONVENTIONS[type]}
THE TASK THE CANDIDATE ANSWERED:
"""${prompt || '(The candidate did not paste the task. Infer the most likely task from the text, judge Content on how fully and relevantly the text answers it, and say clearly that Content could not be checked against the exact task.)'}"""`;

  const userA = `${context}

${SCALE[exam]}

${STRICT}

${CALIBRATE[exam]}

Mark the text below. Write every explanation for the learner: specific, honest, referring to the text, quoting it where useful (short quotes, exact words).
Return ONE JSON object:
{"requirements":[{"point":"each thing the task requires, one per item (every content point, the target reader, the purpose, the format)","status":"met|partly|missing","comment":"1–2 sentences with evidence"}],
"scores":{
 "content":{"band":0-5,"descriptor":"the descriptor wording from the scale that this text matches","why":"3–5 sentences: exactly why this band and not one higher or lower, with evidence","evidence":["1–3 short exact quotes"],"next":"exactly what this text would need to get one band higher"},
 "communicative":{...same keys...},"organisation":{...},"language":{...}},
"summary":"3–4 sentences: overall verdict and the single biggest problem (do not name a CEFR level: it is worked out from the final mark)",
"strengths":[{"point":"a genuine strength","quote":"short exact quote showing it","why":"why it works for an examiner"}],
"paragraphs":[{"n":1,"role":"what this paragraph does","comment":"how well it does it and what to change"}],
"cohesion":{"good":["linking devices or patterns used well"],"weak":["devices that are mechanical, repeated, wrong or missing"],"advice":"1–2 sentences"},
"priorities":["the 4 changes that would raise the mark most, most important first, specific and actionable"]}
Give 3–6 strengths and one paragraphs item for each [P..] paragraph.

THE CANDIDATE'S TEXT (paragraphs numbered):
"""${numbered}"""`;

  const userB = `${context}

You are now the strictest possible copy editor and a Cambridge examiner of ${level}. Go through the text sentence by sentence and list EVERY problem and EVERY place where a ${LEVELS[exam].hi} writer would express it better:
- errors: grammar, tense, articles, prepositions, agreement, word order, wrong word, wrong collocation, word form, spelling, punctuation;
- improvements: imprecise or repetitive vocabulary, weak collocations, register that does not fit the task type and reader, wordy or clumsy phrasing, missed chances for more precise or less common lexis, weak or mechanical linking.
For each item:
- "quote": the EXACT words from the text, copied character for character, at least 3 words long (include the words around the problem so the quote is unique in the text), at most about 12 words;
- "fix": the corrected or improved version of exactly that part, so that it can replace the quote word for word; it must be fully correct and the most natural choice an experienced examiner would make;
- "type": one of grammar | vocabulary | collocation | word choice | register | spelling | punctuation | cohesion | style;
- "severity": "error" (it is wrong), "slip" (a one-off mistake with something the writer clearly knows) or "better" (correct, but a stronger choice exists);
- "why": a full explanation for the learner, 2–4 sentences: the rule or usage, why the original is wrong or weaker, why the fix is better, and if useful a second example of correct use;
- "dict": the dictionary headwords a learner should look up in the Cambridge Dictionary for the FIX (single words, phrasal verbs or idioms exactly as a dictionary lists them, e.g. "detrimental", "bear the brunt", "come to terms with"), [] if not useful.
Also flag formulaic or mechanical phrases examiners dislike ("In this essay I will", "Nowadays more and more", "Firstly/Secondly" used mechanically, empty conclusions) and repeated words.
Then "upgrades": vocabulary that is correct but basic or repeated, with stronger alternatives for this level that an educated writer would really use (precise and natural, never pompous or rare for its own sake — avoid words like "efficacious", "impactful", "utilise"): {"instead":"exact words from the text","try":"1–3 alternatives separated by ' / '","why":"what each adds (precision, register, collocation)","example":"one natural sentence using the first alternative","dict":["headwords"]}.
Be exhaustive: do not stop after the first few. Do not invent problems in correct, natural English, and do not "fix" British spelling to American. Order items as they appear in the text. Up to 45 issues and up to 15 upgrades.
Return ONE JSON object: {"issues":[...],"upgrades":[...]}

THE CANDIDATE'S TEXT:
"""${text}"""`;

  const userC = `${context}

Rewrite the candidate's text below as a model answer at band 5 for ${level}: keep the writer's ideas, position and paragraph plan, keep the task type conventions, correct every error, raise the precision and range of vocabulary and grammar, improve cohesion, and keep within ${lo}–${hi} words. Natural, modern British English, not showy.
Return ONE JSON object: {"improved":"the full rewritten text, paragraphs separated by blank lines","notes":["3–5 short notes on the most important changes you made and why"]}

THE CANDIDATE'S TEXT:
"""${text}"""`;

  // each call is asked again once if its answer is not valid JSON, while there is still time (the function stops at ~150 s)
  const ask = async (user, max, effort) => {
    for (let i = 0; ; i++) {
      const r = await llm(SYSTEM, user, max, effort, true);
      try { return { j: parseJSON(r.text), model: r.model }; } catch (e) { if (i >= 1 || Date.now() - t0 > 75000) throw e; }
    }
  };
  const [ra, rb, rc] = await Promise.allSettled([ask(userA, 3200, 'medium'), ask(userB, 5000, 'low'), ask(userC, 1200, 'low')]);
  if (ra.status !== 'fulfilled') throw ra.reason;
  const A = ra.value.j;
  let B = {}, C = {}; const missing = [];
  if (rb.status === 'fulfilled') B = rb.value.j; else { if (rb.reason instanceof SiteLimit) throw rb.reason; missing.push('corrections'); }
  if (rc.status === 'fulfilled') C = rc.value.j; else { if (rc.reason instanceof SiteLimit) throw rc.reason; missing.push('model answer'); }

  const sc = {}; let total = 0;
  for (const k of SUBS) {
    const x = (A.scores && A.scores[k]) || {};
    const b = Math.max(0, Math.min(5, Math.round(+x.band || 0)));
    sc[k] = { band: b, descriptor: clean(x.descriptor).slice(0, 400), why: clean(x.why).slice(0, 1200), evidence: (Array.isArray(x.evidence) ? x.evidence : []).map(clean).filter(Boolean).slice(0, 3), next: clean(x.next).slice(0, 600) };
    total += b;
  }
  const low = norm(text);
  const seen = new Set();
  const issuesRaw = (Array.isArray(B.issues) ? B.issues : []).map(e => {
    const quote = clean(e && e.quote), fix = clean(e && e.fix);
    const type = ISSUE_TYPES.includes(clean(e && e.type).toLowerCase()) ? clean(e.type).toLowerCase() : 'style';
    const severity = ['error', 'slip', 'better'].includes(clean(e && e.severity).toLowerCase()) ? clean(e.severity).toLowerCase() : 'better';
    return { quote, fix, type, severity, why: clean(e && e.why).slice(0, 900), dict: links(e && e.dict) };
  }).filter(e => e.quote && e.fix && norm(e.quote) !== norm(e.fix) && low.includes(norm(e.quote)) && (e.quote.includes(' ') || low.indexOf(norm(e.quote)) === low.lastIndexOf(norm(e.quote))) && !seen.has(norm(e.quote)) && seen.add(norm(e.quote)))
    .map(e => Object.assign(e, { at: low.indexOf(norm(e.quote)), end: low.indexOf(norm(e.quote)) + norm(e.quote).length }));
  // one comment per stretch of text: when comments overlap, keep errors before suggestions and the more precise (shorter) one
  const rank = { error: 0, slip: 1, better: 2 }, kept = [];
  for (const e of issuesRaw.slice().sort((a, b) => rank[a.severity] - rank[b.severity] || (a.end - a.at) - (b.end - b.at))) {
    if (!kept.some(k => e.at < k.end && e.end > k.at)) kept.push(e);
  }
  const issues = kept.sort((a, b) => a.at - b.at).slice(0, 45).map(({ end, ...e }) => e);
  const upgrades = (Array.isArray(B.upgrades) ? B.upgrades : []).map(v => ({ instead: clean(v && v.instead), try: clean(v && v.try), why: clean(v && v.why).slice(0, 600), example: clean(v && v.example).slice(0, 300), dict: links(v && v.dict) }))
    .filter(v => v.instead && v.try && low.includes(norm(v.instead))).slice(0, 15);
  // A second, mechanical check on the examiner: the editor's error count per 100 words caps Language, and
  // formulaic signposting caps Organisation, as the scale says. Every change is explained on the result page.
  const errs = issues.filter(e => e.severity === 'error').length + 0.5 * issues.filter(e => e.severity === 'slip').length;
  const density = n ? errs / n * 100 : 0;
  const langCap = exam === 'cpe' ? (density >= 3 ? 1 : density >= 1.5 ? 2 : density >= 0.7 ? 3 : density >= 0.3 ? 4 : 5)
    : (density >= 4 ? 1 : density >= 2.5 ? 2 : density >= 1.2 ? 3 : density >= 0.6 ? 4 : 5);
  const lowered = (k, cap, why) => {
    if (sc[k].band <= cap) return;
    total -= sc[k].band - cap; if (sc[k].aiBand == null) sc[k].aiBand = sc[k].band; sc[k].band = cap; sc[k].adjusted = (sc[k].adjusted ? sc[k].adjusted + ' ' : '') + why;
  };
  if (rb.status === 'fulfilled') lowered('language', langCap, `Lowered from ${sc.language.band} to ${langCap}: the text has ${Math.round(errs)} error${Math.round(errs) === 1 ? '' : 's'} in ${n} words (${density.toFixed(1)} per 100 words). On the ${exam === 'cpe' ? 'C2' : 'C1'} scale errors that are not slips keep Language at this band or below.`);
  const formulaic = ['in this essay i will', 'firstly', 'secondly', 'thirdly', 'lastly', 'in conclusion', 'to sum up', 'to conclude'].filter(f => low.includes(f));
  if (formulaic.length >= 3) lowered('organisation', exam === 'cpe' ? 2 : 3, `Lowered: the text relies on formulaic signposting (${formulaic.map(f => '“' + f + '”').join(', ')}). At this level examiners expect varied, natural cohesion.`);
  // Bands go together in real marking: when errors are this frequent, complex ideas cannot be communicated effectively
  // or organised with flexibility, so Communicative Achievement and Organisation stay close to Language.
  const gap = sc.language.band <= 2 ? 1 : 2;
  for (const [k, name] of [['communicative', 'Communicative Achievement'], ['organisation', 'Organisation']]) {
    lowered(k, sc.language.band + gap, `Lowered to ${sc.language.band + gap}: with Language at band ${sc.language.band}, ${name} cannot be more than ${gap} band${gap > 1 ? 's' : ''} higher — frequent errors stop the reader following complex ideas with ease.`);
  }
  const result = {
    v: 2, kind: 'full', exam, part, type, prompt, words: n, range: [lo, hi], paragraphsCount: paras.length,
    scores: sc, total, model: ra.value.model, density: Math.round(density * 10) / 10,
    summary: clean(A.summary).slice(0, 1200),
    requirements: (Array.isArray(A.requirements) ? A.requirements : []).map(r => ({ point: clean(r && r.point).slice(0, 300), status: ['met', 'partly', 'missing'].includes(clean(r && r.status).toLowerCase()) ? clean(r.status).toLowerCase() : 'partly', comment: clean(r && r.comment).slice(0, 500) })).filter(r => r.point).slice(0, 10),
    strengths: (Array.isArray(A.strengths) ? A.strengths : []).map(s => typeof s === 'string' ? { point: clean(s) } : { point: clean(s && s.point), quote: clean(s && s.quote).slice(0, 200), why: clean(s && s.why).slice(0, 500) }).filter(s => s.point).slice(0, 6),
    paragraphs: (Array.isArray(A.paragraphs) ? A.paragraphs : []).map(x => ({ n: +x.n || 0, role: clean(x && x.role).slice(0, 200), comment: clean(x && x.comment).slice(0, 700) })).filter(x => x.comment).slice(0, 12),
    cohesion: { good: ((A.cohesion && A.cohesion.good) || []).map(clean).filter(Boolean).slice(0, 8), weak: ((A.cohesion && A.cohesion.weak) || []).map(clean).filter(Boolean).slice(0, 8), advice: clean(A.cohesion && A.cohesion.advice).slice(0, 500) },
    priorities: (Array.isArray(A.priorities) ? A.priorities : []).map(clean).filter(Boolean).slice(0, 5),
    issues, upgrades,
    // the short lists the first version of the result page reads
    errors: issues.filter(e => e.severity !== 'better').slice(0, 12).map(e => ({ quote: e.quote, fix: e.fix, why: e.why.slice(0, 200) })),
    vocabulary: upgrades.slice(0, 6).map(v => ({ instead: v.instead, try: v.try, why: v.why.slice(0, 200) })),
    improved: String(C.improved || '').trim().slice(0, 4000),
    improvedNotes: (Array.isArray(C.notes) ? C.notes : []).map(clean).filter(Boolean).slice(0, 5),
    example: '', missing,
    left: q.ok && typeof q.j === 'number' ? q.j : null,
  };
  const title = clean(p.title).slice(0, 200) || `My ${type}`;
  if (p.noSave && me.role === 'admin') { result.id = null; result.ms = Date.now() - t0; return { writing: result }; }   // admin test runs are not stored
  const saved = await svc('writing_save', { p_user: me.id, p_exam: exam, p_task: 'custom', p_part: part, p_title: title, p_text: text, p_words: n, p_score: total, p_result: result });
  result.id = saved.ok && typeof saved.j === 'string' ? saved.j : null;
  return { writing: result };
}

const TASKS = { words: taskWords, text: taskText, cloze: taskCloze, kwt: taskKwt };
/* ---------------------------------------------------------------- speaking: speech → text (Whisper) → examiner feedback */
const SPEAKING_PER_DAY = { student: 3, teacher: 10, admin: 30 };
const b64ToBytes = b => Uint8Array.from(atob(b), c => c.charCodeAt(0));
async function transcribe(b64) {
  const errors = [];
  try {                                                       // 1) whisper-large-v3-turbo: base64 in JSON
    const r = await cf('run/@cf/openai/whisper-large-v3-turbo', { audio: b64, language: 'en', vad_filter: true });
    const t = r.ok && r.j && (r.j.result || r.j).text;
    if (typeof t === 'string') return t.trim();
    errors.push('turbo: ' + cfError(r.j, r.status));
  } catch (e) { if (e instanceof SiteLimit) throw e; errors.push('turbo: ' + (e && e.message || e)); }
  try {                                                       // 2) whisper: the raw file as the request body
    const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ID}/ai/run/@cf/openai/whisper`, { method: 'POST', headers: { Authorization: 'Bearer ' + CF_TOKEN, 'Content-Type': 'application/octet-stream' }, body: b64ToBytes(b64) });
    const j = await r.json().catch(() => null);
    if (!r.ok) { const lim = quotaHit(r.status, j); if (lim) throw lim; }
    const t = r.ok && j && (j.result || j).text;
    if (typeof t === 'string') return t.trim();
    errors.push('whisper: ' + cfError(j, r.status));
  } catch (e) { if (e instanceof SiteLimit) throw e; errors.push('whisper: ' + (e && e.message || e)); }
  throw new Error('Could not turn the recording into text. ' + errors.join(' | '));
}
const SPEAK_SCALE = {
  cpe: `C2 PROFICIENCY SPEAKING — analytical scales (0–5; 4 and 2 share features of the bands either side)
GRAMMATICAL RESOURCE — 5: maintains control of a wide range of grammatical forms and uses them with flexibility. 3: maintains control of a wide range of grammatical forms. 1: shows a good degree of control of a range of simple and some complex grammatical forms.
LEXICAL RESOURCE — 5: uses a wide range of appropriate vocabulary with flexibility to give and exchange views on unfamiliar and abstract topics. 3: uses a wide range of appropriate vocabulary to give and exchange views on unfamiliar and abstract topics. 1: uses a range of appropriate vocabulary to give and exchange views on familiar and unfamiliar topics.
DISCOURSE MANAGEMENT — 5: produces extended stretches of language with flexibility and ease and very little hesitation; contributions are relevant, coherent, varied and detailed; makes full and effective use of a wide range of cohesive devices and discourse markers. 3: produces extended stretches of language with ease and with very little hesitation; contributions are relevant, coherent and varied; uses a wide range of cohesive devices and discourse markers. 1: produces extended stretches of language with very little hesitation; contributions are relevant and there is a clear organisation of ideas; uses a range of cohesive devices and discourse markers.`,
  cae: `C1 ADVANCED SPEAKING — analytical scales (0–5; 4 and 2 share features of the bands either side)
GRAMMATICAL RESOURCE — 5: maintains control of a wide range of grammatical forms. 3: shows a good degree of control of a range of simple and some complex grammatical forms. 1: shows a good degree of control of simple grammatical forms, and attempts some complex grammatical forms.
LEXICAL RESOURCE — 5: uses a wide range of appropriate vocabulary to give and exchange views on a wide range of familiar and unfamiliar topics. 3: uses a range of appropriate vocabulary to give and exchange views on a wide range of familiar topics. 1: uses appropriate vocabulary to give and exchange views on a range of familiar topics.
DISCOURSE MANAGEMENT — 5: produces extended stretches of language with ease and with very little hesitation; contributions are relevant, coherent and varied; uses a wide range of cohesive devices and discourse markers. 3: produces extended stretches of language with very little hesitation; contributions are relevant and there is a clear organisation of ideas; uses a range of cohesive devices and discourse markers. 1: produces extended stretches of language with some hesitation; contributions are relevant and there is very little repetition; uses a range of cohesive devices.`,
};
const FILLER_RE = /\b(um+|uh+|erm*|er|ah+|hmm+|like|you know|i mean|kind of|sort of|basically|actually)\b/gi;

async function taskSpeaking(p, me) {
  if (!(await hasAccess(me))) return { error: 'Speaking practice with AI is open to students of a teacher on Lexicon. Ask your teacher to add your email.' };
  const exam = p.exam === 'cae' ? 'cae' : 'cpe';
  const secs = Math.max(1, Math.min(600, Math.round(+p.seconds || 0)));
  const b64 = String(p.audio || '');
  if (b64.length < 2000) throw new Error('The recording is empty.');
  if (b64.length > 4_500_000) throw new Error('The recording is too long for AI feedback: keep it under 4 minutes.');
  const limit = SPEAKING_PER_DAY[me.role] || 3;
  const q = await svc('ai_take', { p_user: me.id, p_kind: 'speaking', p_limit: limit });
  if (q.ok && q.j === -1) return { error: `Today's ${limit} AI speaking checks are used up. They come back tomorrow.`, limit: true };
  if (q.ok) me.took = 'speaking';
  const transcript = await transcribe(b64);
  const n = clean(transcript).split(' ').filter(w => /[A-Za-z]/.test(w)).length;
  if (n < 15) return { error: 'The AI could hardly hear any speech in this recording. Check the microphone and speak a little louder.' };
  const fillers = (transcript.match(FILLER_RE) || []).length;
  const level = exam === 'cpe' ? 'C2 Proficiency (CPE)' : 'C1 Advanced (CAE)';
  const user = `You are a senior Cambridge English speaking examiner (${level}). You only have an automatic TRANSCRIPT of one candidate's answer, so you cannot judge pronunciation or interaction; judge Grammatical Resource, Lexical Resource and Discourse Management only, against the scales below. Speech recognition may have small errors — do not punish obvious mis-hearings, punctuation or capital letters.
TASK (${clean(p.part)}):
"""${String(p.prompt || '').slice(0, 2000)}"""
The candidate spoke for ${secs} seconds (${n} words, ${Math.round(n / secs * 60)} words per minute; filler words such as "um/like/you know": ${fillers}).

${SPEAK_SCALE[exam]}

Be strict and realistic, as a trained examiner: band 3 is a solid performance at this level; band 5 is rare. Also judge whether the answer actually does what the task asks (relevance, development of ideas, use of the time).
Return one JSON object:
{"scores":{"grammar":{"band":0-5,"why":"1–2 sentences"},"vocabulary":{"band":0-5,"why":"..."},"discourse":{"band":0-5,"why":"..."}},
"task":"1–2 sentences: did the answer fully address the task?",
"summary":"2–3 sentences overall",
"priorities":["the 3 changes that would raise the mark most"],
"errors":[{"quote":"exact words from the transcript","fix":"corrected version","why":"short"}],
"phrases":[{"instead":"what the candidate said","try":"a more natural / higher-level way to say it"}],
"model":"a model answer to the same task at band 5 of this level, about ${Math.min(220, Math.max(80, Math.round(secs * 2.2)))} words, natural spoken English"}
Up to 8 errors and 6 phrases.

TRANSCRIPT:
"""${transcript.slice(0, 6000)}"""`;
  const r = await llm(SYSTEM, user, 2200, 'medium');
  const j = parseJSON(r.text);
  const scores = {}; let total = 0;
  for (const k of ['grammar', 'vocabulary', 'discourse']) {
    const x = (j.scores && j.scores[k]) || {};
    const b = Math.max(0, Math.min(5, Math.round(+x.band || 0)));
    scores[k] = { band: b, why: clean(x.why).slice(0, 400) }; total += b;
  }
  const low = transcript.toLowerCase();
  return { speaking: {
    transcript, words: n, seconds: secs, wpm: Math.round(n / secs * 60), fillers, scores, total, model: r.model,
    task: clean(j.task).slice(0, 400), summary: clean(j.summary).slice(0, 800),
    priorities: (j.priorities || []).map(clean).filter(Boolean).slice(0, 3),
    errors: (j.errors || []).map(e => ({ quote: clean(e && e.quote), fix: clean(e && e.fix), why: clean(e && e.why).slice(0, 200) }))
      .filter(e => e.quote && e.fix && e.quote.toLowerCase() !== e.fix.toLowerCase() && low.includes(e.quote.toLowerCase())).slice(0, 8),
    phrases: (j.phrases || []).map(v => ({ instead: clean(v && v.instead), try: clean(v && v.try) })).filter(v => v.instead && v.try).slice(0, 6),
    example: String(j.model || '').trim().slice(0, 2000),
    left: q.ok && typeof q.j === 'number' ? q.j : null,
  } };
}

const OPEN_TASKS = { writing: taskWriting, essay: taskEssay, speaking: taskSpeaking };     // any signed-in account (with a daily limit)

/* ---------------------------------------------------------------- request */
async function who(req) {
  const auth = req.headers.get('authorization') || '', apikey = req.headers.get('apikey') || '';
  if (!/^Bearer\s+\S+/.test(auth)) return null;
  const u = await fetch(SB_URL + '/auth/v1/user', { headers: { Authorization: auth, apikey } });
  if (!u.ok) return null;
  const user = await u.json();
  const p = await fetch(`${SB_URL}/rest/v1/profiles?select=role&id=eq.${encodeURIComponent(user.id)}`, { headers: { Authorization: auth, apikey } }).then(r => r.ok ? r.json() : []);
  return { id: user.id, role: p && p[0] && p[0].role, auth, apikey };
}

export async function handle(req) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'Use POST.' });
  let me = null;
  try {
    me = await who(req);
    if (!me) return json(401, { error: 'Sign in again to use AI.' });
    const body = await req.json().catch(() => ({}));
    if (body.task === 'ping') return json(200, { ok: true, cloudflare: !!(CF_ID && CF_TOKEN), quota: !!SECRET });
    if (!OPEN_TASKS[body.task] && me.role !== 'teacher' && me.role !== 'admin') return json(403, { error: 'Only teachers can use this AI tool.' });
    if (!CF_ID || !CF_TOKEN) return json(500, { error: 'AI is not set up: add the secrets CF_ACCOUNT_ID and CF_AI_TOKEN in Supabase.' });
    if (OPEN_TASKS[body.task]) { const r = await OPEN_TASKS[body.task](body, me); return json(r.error ? 429 : 200, r); }
    const fn = TASKS[body.task];
    if (!fn) return json(400, { error: 'Unknown task.' });
    return json(200, await fn(body));
  } catch (e) {
    // a check that failed on our side (AI down or the site-wide allowance gone) does not use up the person's own daily checks
    if (me && me.took) await svc('ai_refund', { p_user: me.id, p_kind: me.took }).catch(() => null);
    if (e instanceof SiteLimit) return json(429, { error: e.message, siteLimit: true, daily: e.daily });
    return json(502, { error: String(e && e.message || e).slice(0, 600) });
  }
}

export const _test = { SiteLimit, quotaHit, taskSpeaking, taskWriting, taskEssay, dictLink, textOf, parseJSON, hasForm, whichHead, countWords, keyTokens, TASKS, setLLM: f => { llmImpl = f; } };

if (globalThis.Deno) Deno.serve(handle);
