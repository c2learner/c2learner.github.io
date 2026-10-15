/* Skipper — C2 vocabulary trainer for Mark Skipper's "Advanced Grammar & Vocabulary".
   Static site (GitHub Pages). Book data is AES-GCM encrypted; the access code unlocks it in the browser.
   Progress lives in this browser (localStorage) and, when a Supabase project is configured
   (assets/config.js), also in the user's account so it follows them to any device. */
(() => {
'use strict';
const DAY = 86400000;
const KEY = 'skipper.v2';
const CODE_KEY = 'skipper.code';

/* ================================================================ helpers */
const h = (tag, props, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === false || v == null) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') { for (const [sk, sv] of Object.entries(v)) { if (sk.startsWith('--')) el.style.setProperty(sk, sv); else el.style[sk] = sv; } }
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'value') el.value = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
};
const $ = (s, el = document) => el.querySelector(s);
const clear = el => { while (el.firstChild) el.removeChild(el.firstChild); return el; };
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const sample = (a, n) => shuffle(a).slice(0, n);
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
const pad2 = n => String(n).padStart(2, '0');
const PLAY = '<svg viewBox="0 0 10 12"><path d="M0 0l10 6-10 6z" fill="currentColor"/></svg>';

/* timers / animation loops are tied to the current view and stopped on navigation */
const LIVE = { timers: new Set(), rafs: new Set(), token: 0 };
const every = (fn, ms) => { const t = setInterval(fn, ms); LIVE.timers.add(t); return t; };
const later = (fn, ms) => { const t = setTimeout(() => { LIVE.timers.delete(t); fn(); }, ms); LIVE.timers.add(t); return t; };
function stopLive() { LIVE.timers.forEach(t => { clearInterval(t); clearTimeout(t); }); LIVE.timers.clear(); LIVE.rafs.forEach(cancelAnimationFrame); LIVE.rafs.clear(); LIVE.token++; }

/* ================================================================ state */
const defaults = () => ({
  v: 2,
  profile: null,
  settings: { newPerDay: 15, retention: 0.9, accent: 'uk', theme: 'auto', chunk: 5, studyDays: 6, speak: true, order: 'cpe' },
  cards: {}, edits: {}, tests: {}, games: {}, daily: {}, queue: null, gameUnits: null, startedAt: Date.now(),
});
let S = defaults();
try {
  const raw = localStorage.getItem(KEY);
  if (raw) { const p = JSON.parse(raw); S = Object.assign(defaults(), p); S.settings = Object.assign(defaults().settings, p.settings || {}); }
} catch (e) { /* storage unavailable: run in memory */ }
const CLOUD = window.Cloud && window.Cloud.enabled ? window.Cloud : null;
const SYNC = { timer: null, busy: false, again: false, state: 'idle' };
const save = () => { S.updatedAt = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } if (CLOUD && CLOUD.user) { clearTimeout(SYNC.timer); SYNC.timer = setTimeout(pushNow, 2500); } };
async function pushNow() {
  clearTimeout(SYNC.timer);
  if (!CLOUD || !CLOUD.user) return;
  if (SYNC.busy) { SYNC.again = true; return; }
  SYNC.busy = true;
  try { await CLOUD.push(S); SYNC.state = 'ok'; } catch (e) { SYNC.state = 'error'; SYNC.timer = setTimeout(pushNow, 30000); }
  SYNC.busy = false;
  if (SYNC.again) { SYNC.again = false; pushNow(); }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && SYNC.timer) pushNow(); });
/* two copies of the progress (this device and the server) → one: every card keeps its latest review */
function mergeState(a, b) {
  if (!a) return b; if (!b) return a;
  const newer = (a.updatedAt || 0) >= (b.updatedAt || 0) ? a : b, older = newer === a ? b : a;
  const m = Object.assign(defaults(), older, newer);
  m.settings = Object.assign(defaults().settings, older.settings || {}, newer.settings || {});
  m.cards = Object.assign({}, older.cards);
  for (const [id, c] of Object.entries(newer.cards || {})) { const o = m.cards[id]; if (!o || (c.last || 0) > (o.last || 0) || ((c.last || 0) === (o.last || 0) && (c.reps || 0) >= (o.reps || 0))) m.cards[id] = c; }
  m.daily = Object.assign({}, older.daily);
  for (const [k, d] of Object.entries(newer.daily || {})) { const o = m.daily[k]; m.daily[k] = o ? { rev: Math.max(o.rev || 0, d.rev || 0), nw: Math.max(o.nw || 0, d.nw || 0), sec: Math.max(o.sec || 0, d.sec || 0) } : d; }
  m.tests = Object.assign({}, older.tests);
  for (const [k, t] of Object.entries(newer.tests || {})) { const o = m.tests[k]; m.tests[k] = !o ? t : Object.assign({}, (t.at || 0) >= (o.at || 0) ? t : o, { best: Math.max(t.best || 0, o.best || 0), n: Math.max(t.n || 0, o.n || 0) }); }
  m.games = Object.assign({}, older.games, newer.games);
  for (const [k, v] of Object.entries(older.games || {})) { const w = (newer.games || {})[k]; if (w == null) continue; const g = GAMES.find(x => x.id === k.split(':')[0]); m.games[k] = g && g.rec === 'time' ? Math.min(v, w) : Math.max(v, w); }
  m.edits = Object.assign({}, older.edits, newer.edits);
  const seen = new Set(); m.cpe = (older.cpe || []).concat(newer.cpe || []).filter(x => !seen.has(x.at) && seen.add(x.at)).sort((x, y) => x.at - y.at).slice(-30);
  m.planSet = !!(a.planSet || b.planSet); m.tourSeen = !!(a.tourSeen || b.tourSeen);
  m.startedAt = Math.min(a.startedAt || Date.now(), b.startedAt || Date.now());
  m.updatedAt = Math.max(a.updatedAt || 0, b.updatedAt || 0);
  return m;
}
const applyTheme = () => { if (S.settings.theme === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', S.settings.theme); };

/* ================================================================ data (filled after unlock) */
let BOOK = null, UNITS = [], UBY = {}, EBY = {}, ALL = [], PARTS = [];
let LITE = null;   /* signed in, but no book: home, teacher and admin pages only */
function indexBook(book) {
  BOOK = book; UNITS = book.units; UBY = {}; EBY = {};
  for (const u of UNITS) { UBY[u.id] = u; for (const e of u.entries) { e.unit = u.id; EBY[e.id] = e; } }
  ALL = UNITS.flatMap(u => u.entries);
  PARTS = (book.parts || []).map(p => Object.assign({}, p, { units: p.units.filter(id => UBY[id]) })).filter(p => p.units.length);
}
const E = id => { const e = EBY[id]; const ed = S.edits[id]; return ed ? Object.assign({}, e, ed) : e; };
const partOf = u => PARTS.find(p => p.units.includes(u.id));
const quizDef = id => { const e = E(id); return (S.edits[id] && S.edits[id].meaning ? e.meaning : e.q) || e.meaning || '…'; };

async function fetchBin() {
  if (fetchBin.cache) return fetchBin.cache;
  const r = await fetch('data/book.bin', { cache: 'no-cache' });
  if (!r.ok) throw new Error('data file missing (' + r.status + ')');
  fetchBin.cache = new Uint8Array(await r.arrayBuffer());
  return fetchBin.cache;
}
async function decryptBook(code) {
  const b = await fetchBin();
  const salt = b.slice(0, 16), iv = b.slice(16, 28), ct = b.slice(28);
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(code.trim()), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  const stream = new Blob([pt]).stream().pipeThrough(new DecompressionStream('gzip'));
  return JSON.parse(await new Response(stream).text());
}

/* ================================================================ scheduling */
const nowD = () => Date.now() / DAY;
const todayStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime() / DAY; };
const dkey = (ms = Date.now()) => { const d = new Date(ms); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); };
const daily = () => (S.daily[dkey()] = S.daily[dkey()] || { rev: 0, nw: 0, sec: 0 });
const state = id => { const c = S.cards[id]; if (!c || !c.s) return 'new'; return c.s >= 30 ? 'mature' : c.s >= 7 ? 'young' : 'learn'; };
const isDue = id => { const c = S.cards[id]; return !!c && c.due <= todayStart() + 1; };
const dueIds = unitIds => ALL.filter(e => (!unitIds || unitIds.includes(e.unit)) && isDue(e.id)).sort((a, b) => S.cards[a.id].due - S.cards[b.id].due).map(e => e.id);
const newIds = unitIds => ALL.filter(e => (!unitIds || unitIds.includes(e.unit)) && !S.cards[e.id]).map(e => e.id);
function gradeCard(id, g) {
  const now = nowD();
  const c = FSRS.review(S.cards[id] || {}, g, now, S.settings.retention);
  if (c.due - now >= 1) c.due = todayStart() + Math.max(1, Math.round(c.due - now));
  S.cards[id] = c; save(); return c;
}
function streak() {
  let n = 0; const d = new Date(); d.setHours(12, 0, 0, 0);
  const has = k => S.daily[k] && (S.daily[k].rev + S.daily[k].nw) > 0;
  if (!has(dkey(d.getTime()))) d.setDate(d.getDate() - 1);
  while (has(dkey(d.getTime()))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function countStates(ids) { const r = { new: 0, learn: 0, young: 0, mature: 0 }; for (const id of ids) r[state(id)]++; return r; }
const startedUnits = () => UNITS.filter(u => u.entries.some(e => S.cards[e.id])).map(u => u.id);

/* ================================================================ pronunciation: human recordings only */
const AUDIO_CAM = 'https://dictionary.cambridge.org', AUDIO_WM = 'https://upload.wikimedia.org/wikipedia/commons/';
const clipUrl = s => /^https?:/.test(s) ? s : s.charAt(0) === '/' ? AUDIO_CAM + s : AUDIO_WM + s;
let currentAudio = null, playToken = 0;
function stopAudio() {
  playToken++;
  if (currentAudio) { try { currentAudio.pause(); } catch (_) { /* */ } currentAudio = null; }
  document.querySelectorAll('.pron.playing').forEach(x => x.classList.remove('playing'));
}
function playClips(list, btn, onFail) {
  stopAudio(); const tok = playToken; let k = 0, played = 0;
  if (btn) btn.classList.add('playing');
  const fin = () => { if (tok === playToken && btn) btn.classList.remove('playing'); };
  const next = () => {
    if (tok !== playToken) return;
    if (k >= list.length) { if (!played && onFail) { onFail(); return; } fin(); return; }
    const a = new Audio(clipUrl(list[k++])); currentAudio = a;
    a.onended = () => { played++; setTimeout(next, 30); };
    a.onerror = () => next();
    const pr = a.play();
    if (pr && pr.catch) pr.catch(err => { if (err && err.name === 'NotAllowedError') fin(); else next(); });
  };
  next();
}
function playWord(id, acc, btn) {
  const c = E(id).cam || {}, other = acc === 'uk' ? 'us' : 'uk';
  const url = (c[acc] && c[acc].mp3) || (c[other] && c[other].mp3);
  if (url) playClips([url], btn);
}
function pronRow(id, compact) {
  const e = E(id), cam = e.cam || {};
  if (!((cam.uk && cam.uk.mp3) || (cam.us && cam.us.mp3))) return null;
  const one = (acc, label) => {
    const p = cam[acc] || {};
    const b = h('button', { class: 'pron', type: 'button', title: acc === 'uk' ? 'British pronunciation' : 'American pronunciation', onclick: ev => { ev.stopPropagation(); playWord(id, acc, b); } },
      h('span', { class: 'pi', html: PLAY }), h('b', {}, label), p.ipa && !compact ? h('span', { class: 'ipa' }, '/' + p.ipa + '/') : null);
    return b;
  };
  return h('div', { class: 'prons' }, one('uk', 'UK'), one('us', 'US'));
}
function cambridgeQuery(head) {
  let t = String(head).replace(/\[[^\]]*\]/g, ' ').replace(/\([^)]*\)/g, ' ');
  t = t.split('/')[0];
  t = t.replace(/\b(sb|sth|sb's|one's|oneself|yourself)\b/g, ' ').replace(/\.\.\.|…/g, ' ').replace(/^\s*(to be|to|a|an|the)\s+/i, '');
  return t.replace(/\s+/g, ' ').trim();
}
const cambridgeUrl = id => { const e = E(id); return (e.cam && e.cam.url) || 'https://dictionary.cambridge.org/search/direct/?datasetsearch=english&q=' + encodeURIComponent(cambridgeQuery(e.head)); };
const toneBadge = id => { const t = (E(id).cam && E(id).cam.tone) || E(id).tone || 'Neutral'; return h('span', { class: 'tone ' + t, title: 'Register: ' + t.toLowerCase() }, t); };

/* ================================================================ text matching (cloze + typed answers) */
const IRR = {};
('be:am,is,are,was,were,been,being;do:does,did,done,doing;have:has,had,having;go:goes,went,gone,going;get:got,gotten,getting;give:gave,given,giving;' +
 'take:took,taken,taking;make:made,making;come:came,coming;bring:brought;catch:caught;fall:fell,fallen;break:broke,broken;put:putting;set:setting;run:ran,running;' +
 'keep:kept;hold:held;see:saw,seen;say:said;tell:told;think:thought;buy:bought;lose:lost;win:won;pay:paid;sell:sold;send:sent;stand:stood;sit:sat;lay:laid;' +
 'lie:lay,lain,lying;draw:drew,drawn;drive:drove,driven;eat:ate,eaten;feel:felt;find:found;fly:flew,flown;forget:forgot,forgotten;grow:grew,grown;hang:hung;' +
 'hear:heard;hit:hitting;know:knew,known;lead:led;leave:left;let:letting;mean:meant;meet:met;read:reading;ride:rode,ridden;ring:rang,rung;rise:rose,risen;' +
 'shake:shook,shaken;show:shown;shut:shutting;sleep:slept;speak:spoke,spoken;spend:spent;swim:swam,swum;teach:taught;tear:tore,torn;throw:threw,thrown;' +
 'wear:wore,worn;wake:woke,woken;write:wrote,written;begin:began,begun;bear:bore,borne;beat:beaten;bite:bit,bitten;blow:blew,blown;burn:burnt;cut:cutting;' +
 'deal:dealt;dig:dug;fight:fought;hide:hid,hidden;lend:lent;light:lit;shoot:shot;slip:slipped;spread:spreading;steal:stole,stolen;strike:struck;sweep:swept;' +
 'swing:swung;undertake:undertook,undertaken;wind:wound;sing:sang,sung;sink:sank,sunk;spin:spun;split:splitting;stick:stuck;sting:stung;swear:swore,sworn;' +
 'upset:upsetting;withdraw:withdrew,withdrawn;kneel:knelt,kneeled;dream:dreamt,dreamed;spoil:spoilt,spoiled;remake:remade;creep:crept;oversleep:overslept;undergo:underwent,undergone;forgive:forgave,forgiven;overhear:overheard;mistake:mistook,mistaken;overcome:overcame;bend:bent;build:built;feed:fed;flee:fled;forbid:forbade,forbidden;freeze:froze,frozen;grind:ground;leap:leapt;sew:sewn;shine:shone;slide:slid;smell:smelt;stride:strode;tread:trod,trodden;weep:wept;overtake:overtook,overtaken;understand:understood;mislead:misled;foresee:foresaw,foreseen;seek:sought').split(';')
  .forEach(s => { const [b, f] = s.split(':'); IRR[b] = new Set(f.split(',')); });
const STOPT = new Set(['to', 'sb', 'sth', "one's", 'someone', 'something', 'etc', "sb's", "sth's", 'sb/sth', 'sth/sb']);
const ARTICLES = new Set(['a', 'an', 'the']);
const POSS = new Set(['your', 'my', 'his', 'her', 'their', 'our', 'its', "one's", "sb's", 'yourself', 'himself', 'herself', 'themselves', 'myself', 'oneself', 'ourselves', 'yourselves', 'itself']);
const LEADV = new Set(['be', 'get', 'have', 'become', 'feel', 'keep', 'go']);
const FILLER = new Set(['of', 'in', 'on', 'at', 'to', 'for', 'and', 'or', 'with', 'by', 'up', 'out', 'off', 'a', 'an', 'the']);
const norm = s => String(s).toLowerCase().replace(/[’‘`]/g, "'").replace(/[^a-z0-9'\/ -]+/g, ' ').replace(/-+/g, ' ').replace(/\s+/g, ' ').trim();
function expandAlt(tokens) {
  let res = [[]];
  for (const t of tokens) {
    const alts = t.includes('/') ? t.split('/').filter(Boolean) : [t];
    const next = [];
    for (const r of res) for (const a of alts) { if (next.length < 24) next.push(r.concat(a)); }
    res = next;
  }
  return res;
}
const variantsCache = {};
const SLASH_PHRASES = {
  'to arrive/turn up/leave in dribs and drabs': ['arrive in dribs and drabs', 'turn up in dribs and drabs', 'leave in dribs and drabs'],
  'to reach/come to/arrive at a decision': ['reach a decision', 'come to a decision', 'arrive at a decision'],
  'to keep/have an/your ear to the ground': ['keep an ear to the ground', 'keep your ear to the ground', 'have an ear to the ground', 'have your ear to the ground'],
  'to cost a (small) fortune/a bomb/ the earth': ['cost a small fortune', 'cost a fortune', 'cost a bomb', 'cost the earth'],
  'to be strapped for cash/hard up/ short of money': ['be strapped for cash', 'be hard up', 'be short of money'],
};
function headVariants(head) {
  if (variantsCache[head]) return variantsCache[head];
  let t = String(head).toLowerCase().replace(/[’‘]/g, "'").replace(/\[[^\]]*\]/g, ' ').replace(/\s*\/\s*/g, '/');
  /* heads where slashes separate whole phrases, not single words */
  const fix = SLASH_PHRASES[String(head).trim()];
  const bases = fix ? fix : /\(/.test(t) ? [t.replace(/[()]/g, ' '), t.replace(/\([^)]*\)/g, ' ')] : [t];
  const out = [], seen = new Set();
  for (const b of bases) {
    const raw = b.replace(/[^a-z0-9'\/ -]+/g, ' ').replace(/-/g, ' ').split(/\s+/).filter(Boolean);
    let toks = raw.filter(x => !STOPT.has(x) && !/^(sb|sth)(\/(sb|sth))?$/.test(x));
    if (toks.length > 1 && ARTICLES.has(toks[0])) toks = toks.slice(1);
    const add = list => { for (let v of expandAlt(list)) { v = v.flatMap(x => x.split(' ')).filter(Boolean); const k = v.join(' '); if (v.length && !seen.has(k)) { seen.add(k); out.push(v); } } };
    add(toks);
    /* "to be few and far between" also matches "are few and far between" */
    if (toks.length > 2 && LEADV.has(toks[0])) add(toks.slice(1));
    /* "arrive/turn up/leave in dribs and drabs": the fixed part after the last slash */
    let lastSlash = -1; toks.forEach((x, i) => { if (x.includes('/')) lastSlash = i; });
    if (lastSlash >= 0 && toks.length - lastSlash - 1 >= 2) add(toks.slice(lastSlash + 1));
  }
  out.sort((a, b) => b.length - a.length);
  return (variantsCache[head] = out);
}
/* strict: only the same word in another grammatical form (argue → argued, not argument) */
const spell = w => w.replace(/(i|y)z(e|es|ed|ing|ation)$/, '$1s$2').replace(/yze/, 'yse');
function inflOf(k, t) {
  k = k.replace(/-/g, ''); t = t.replace(/-/g, '');
  if (k === t) return true;
  if (spell(k) !== k || spell(t) !== t) { if (spell(k) !== k || spell(t) !== t) { const a = spell(k), b = spell(t); if (a !== k || b !== t) return inflOf1(a, b) || inflOf1(k, t); } }
  return inflOf1(k, t);
}
function inflOf1(k, t) {
  if (k === t) return true;
  /* the head itself is inflected ("sth sinks in", "(in) instalments", "judging by"): compare from its base form */
  if (/[^s]s$/.test(k) && k.length > 3) { const b = k.slice(0, -1); if (b === t || inflOf2(b, t)) return true; if (/es$/.test(k) && inflOf2(k.slice(0, -2), t)) return true; }
  if (/ed$/.test(k) && k.length > 5) { const b = k.slice(0, -2); for (const c of [b, b + 'e', b.slice(0, -1)]) if (c === t || inflOf2(c, t)) return true; }
  if (/ing$/.test(k) && k.length > 5) { const b = k.slice(0, -3); for (const c of [b, b + 'e', b.slice(0, -1)]) if (c === t || inflOf2(c, t)) return true; }
  return inflOf2(k, t);
}
function inflOf2(k, t) {
  if (k === t) return true;
  if (POSS.has(k) && (POSS.has(t) || /'s$/.test(t))) return true;
  if ((IRR[k] && IRR[k].has(t)) || (IRR[t] && IRR[t].has(k))) return true;
  if (t.startsWith(k) && /^(s|es|ed|d|n|ing|er|est|r|st|'s|s')$/.test(t.slice(k.length))) return true;
  const last = k.slice(-1);
  if (t === k + last + 'ed' || t === k + last + 'ing' || t === k + last + 'er' || t === k + last + 'est') return true;
  if (/e$/.test(k) && /^(ing|ed|er|est)$/.test(t.slice(k.length - 1)) && t.startsWith(k.slice(0, -1))) return true;
  if (/[^aeiou]y$/.test(k) && t.startsWith(k.slice(0, -1)) && /^(ied|ies|ier|iest)$/.test(t.slice(k.length - 1))) return true;
  if (/ie$/.test(k) && t === k.slice(0, -2) + 'ying') return true;
  return false;
}
function tokMatch(k, t, strict) {
  if (strict) return inflOf(k, t);
  if (k === t) return true;
  if (POSS.has(k) && (POSS.has(t) || /'s$/.test(t))) return true;
  if (k.length >= 3 && t.length > k.length && t.startsWith(k) && /^(s|es|ed|d|ing|[bdgklmnprt](ed|ing))$/.test(t.slice(k.length))) return true;
  if (k.length >= 3 && /y$/.test(k) && t.startsWith(k.slice(0, -1)) && /^(ied|ies)$/.test(t.slice(k.length - 1))) return true;
  if (k.length >= 5 && t.length > k.length && t.endsWith(k) && /^(un|in|im|il|ir|dis|non|ab|mis)$/.test(t.slice(0, t.length - k.length))) return true;
  if (IRR[k] && IRR[k].has(t)) return true;
  if (IRR[t] && IRR[t].has(k)) return true;
  if (k.length >= 3 && t.length >= 3) {
    if (k.length >= 4 && t.length >= 4) {
      let p = 0; while (p < k.length && p < t.length && k[p] === t[p]) p++;
      if (p >= Math.max(3, Math.min(k.length, t.length) - 2)) return true;
    }
  }
  return false;
}
function tokenize(text) {
  const re = /[A-Za-z0-9']+/g, toks = []; let m;
  const src = String(text).replace(/[’‘]/g, "'");
  while ((m = re.exec(src))) toks.push({ raw: m[0], n: m[0].toLowerCase().replace(/^'+|'+$/g, ''), start: m.index, end: m.index + m[0].length });
  return { src, toks };
}
function align(key, toks, strict) {
  let best = null;
  for (let i = 0; i < toks.length; i++) {
    if (!tokMatch(key[0], toks[i].n, strict)) continue;
    const pos = [i]; let prev = i, ok = true;
    for (let j = 1; j < key.length; j++) {
      let found = -1;
      for (let q = prev + 1; q <= Math.min(toks.length - 1, prev + 4); q++) if (tokMatch(key[j], toks[q].n, strict)) { found = q; break; }
      if (found < 0) { ok = false; break; }
      pos.push(found); prev = found;
    }
    if (ok) { const span = prev - i; if (!best || span < best.span) best = { pos, span }; }
  }
  return best ? best.pos : null;
}
/* best alignment of a head in a sentence; falls back to the head's fixed tail ("part and parcel" in "to be part and parcel of") */
function alignHead(vs, toks, single, strict) {
  for (const v of vs) { const pos = align(v, toks, strict); if (pos) return pos; }
  for (const v of vs) {
    if (v.length < 3) continue;
    for (let a = 0; a < v.length; a++) for (let b = v.length; b - a >= 2; b--) {
      if (a === 0 && b === v.length) continue;
      const sub = v.slice(a, b);
      if (sub.filter(x => !FILLER.has(x) && !POSS.has(x)).length < 2 && !(sub.length >= 3)) continue;
      if (FILLER.has(sub[0]) && FILLER.has(sub[sub.length - 1]) && sub.length < 3) continue;
      const pos = align(sub, toks, strict); if (pos) return pos;
    }
  }
  /* display only: highlight the key word itself (e.g. "gossip" for "to gossip about sb") */
  if (single) for (const v of vs) { const w = v.find(x => !FILLER.has(x) && !LEADV.has(x) && !POSS.has(x) && x.length >= 4); if (w) { const pos = align([w], toks); if (pos) return pos; } }
  return null;
}
const allExamples = id => { const e = E(id); return e.examples.concat((e.cam && e.cam.ex) || []); };
const clozeCache = {};
/* a gap must need the same part of speech as the card: no verb gap for a noun card and no noun gap for a verb card */
const DETS = new Set(['a', 'an', 'the', 'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'no', 'every', 'each', 'some', 'any']);
function clozePosOk(head, toks, pos) {
  const h = String(head).trim().toLowerCase();
  const first = toks[pos[0]].n, prev = pos[0] > 0 ? toks[pos[0] - 1].n : '';
  if (/^(a|an|the)\s/.test(h)) { if (pos.length === 1 && /(ed|ing)$/.test(first) && !/(ed|ing)$/.test(h.split(/\s+/).pop())) return false; }
  else if (/^to\s/.test(h)) { if (DETS.has(prev)) return false; }
  return true;
}
function makeCloze(id, pickRandom) {
  const e = E(id), exs = allExamples(id);
  const ck = id + '|' + e.head + '|' + exs.join('|');
  if (!pickRandom && clozeCache[ck] !== undefined) return clozeCache[ck];
  const found = [];
  const vs = headVariants(e.head);
  for (const ex of exs) {
    const { src, toks } = tokenize(ex);
    const pos = alignHead(vs, toks, false, true); if (pos && clozePosOk(e.head, toks, pos)) found.push({ src, toks, pos, answer: pos.map(i => toks[i].raw).join(' ') });
    if (!pickRandom && found.length) break;
  }
  if (pickRandom) return found.length ? found[Math.floor(Math.random() * found.length)] : null;
  return (clozeCache[ck] = found[0] || null);
}
function sentenceNodes(cz, mode) {
  const { src, toks, pos } = cz; const nodes = []; let last = 0;
  const groups = [];
  for (const p of pos) { const g = groups[groups.length - 1]; if (g && p === g[g.length - 1] + 1) g.push(p); else groups.push([p]); }
  for (const g of groups) {
    const a = toks[g[0]].start, b = toks[g[g.length - 1]].end;
    if (a > last) nodes.push(src.slice(last, a));
    const txt = src.slice(a, b);
    if (mode === 'mark') nodes.push(h('mark', {}, txt));
    else if (mode === 'filled') nodes.push(h('span', { class: 'gap filled' }, txt));
    else nodes.push(h('span', { class: 'gap', style: { minWidth: Math.max(3, Math.round(txt.length * 0.62)) + 'em' } }, ' '));
    last = b;
  }
  if (last < src.length) nodes.push(src.slice(last));
  return nodes;
}
function markHead(example, id) {
  const { src, toks } = tokenize(example);
  const pos = alignHead(headVariants(E(id).head), toks, true);
  return pos ? sentenceNodes({ src, toks, pos }, 'mark') : [example];
}
function lev(a, b) {
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
  return prev[n];
}
function cleanTyped(s) { const toks = norm(s).split(' ').filter(x => x && !STOPT.has(x)); if (toks.length > 1 && ARTICLES.has(toks[0])) toks.shift(); return toks.join(' '); }
function acceptedFor(id, cz) {
  const out = new Set();
  if (cz) out.add(cleanTyped(cz.answer));
  for (const v of headVariants(E(id).head)) out.add(v.join(' '));
  out.add(cleanTyped(E(id).head));
  return [...out].filter(Boolean);
}
function checkTyped(input, accepted) {
  const x = cleanTyped(input);
  if (!x) return 'no';
  if (accepted.includes(x)) return 'ok';
  for (const a of accepted) { const d = lev(x, a), L = a.length; if (d >= 1 && d < L / 2.5 && ((d <= 1 && L >= 4) || (d <= 2 && L >= 6) || (d <= 3 && L >= 11))) return 'close'; }
  return 'no';
}
const closestForm = (input, accepted) => { const x = cleanTyped(input); return accepted.slice().sort((a, b) => lev(x, a) - lev(x, b))[0] || ''; };
function distractors(id, kind, n = 3, pool) {
  const e = E(id), u = UBY[e.unit];
  const key = x => (kind === 'head' ? E(x).head : quizDef(x)).toLowerCase();
  let cand = (pool || u.entries.map(x => x.id)).filter(x => x !== id && E(x).meaning && key(x) !== key(id));
  if (cand.length < n) cand = cand.concat(shuffle(ALL.map(x => x.id).filter(x => x !== id && E(x).meaning && !cand.includes(x))).slice(0, n * 3));
  const seen = new Set([key(id)]), out = [];
  for (const x of shuffle(cand)) { const k = key(x); if (!seen.has(k)) { seen.add(k); out.push(x); } if (out.length >= n) break; }
  return out;
}

/* ================================================================ UI bits */
const root = () => $('#app');
const KEYS = { handler: null };
document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape' && $('.modal-bg')) { $('.modal-bg').remove(); return; }
  if (KEYS.handler) KEYS.handler(ev);
});
const setKeys = fn => { KEYS.handler = fn; };
function toast(msg) { const t = h('div', { class: 'toast', role: 'status' }, msg); document.body.append(t); setTimeout(() => t.remove(), 2400); }
function ring(frac) {
  const r = 14, c = 2 * Math.PI * r;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 34 34'); svg.setAttribute('class', 'ring');
  svg.innerHTML = `<circle class="bgc" cx="17" cy="17" r="${r}"/><circle class="fgc" cx="17" cy="17" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - Math.min(1, frac))}"/>`;
  return svg;
}
function stackBar(counts, total) {
  const t = total || 1;
  const seg = (k, c) => h('i', { style: { width: (counts[k] / t * 100) + '%', background: c } });
  return h('div', { class: 'bar' }, seg('mature', 'var(--mature)'), seg('young', 'var(--young)'), seg('learn', 'var(--learn)'));
}
const legend = c => h('div', { class: 'legend' },
  h('span', { style: { '--c': 'var(--mature)' } }, `mastered ${c.mature}`), h('span', { style: { '--c': 'var(--young)' } }, `young ${c.young}`),
  h('span', { style: { '--c': 'var(--learn)' } }, `learning ${c.learn}`), h('span', { style: { '--c': 'var(--new)' } }, `new ${c.new}`));
function heroTitle(text, cls) {
  const words = text.split(' ');
  return h('h1', { class: 'hero-title ' + (cls || '') }, words.map((w, i) => [h('span', { class: 'w', style: { animationDelay: (0.08 * i) + 's' } }, w), i < words.length - 1 ? ' ' : '']));
}
function modal(build, cls) {
  const bg = h('div', { class: 'modal-bg', onclick: ev => { if (ev.target === bg) bg.remove(); } });
  const box = h('div', { class: 'modal ' + (cls || ''), role: 'dialog', 'aria-modal': 'true' });
  bg.append(box); build(box, () => bg.remove()); document.body.append(bg);
  const f = box.querySelector('[data-autofocus]') || box.querySelector('button, input'); if (f) f.focus();
  return bg;
}
function entryCard(id, opts = {}) {
  const e = E(id), cam = (e.cam && e.cam.ex) || [];
  return h('div', { class: 'wc' },
    h('div', { class: 'wc-head' }, e.head),
    h('div', { class: 'wc-meta' }, pronRow(id), toneBadge(id), e.section ? h('span', { class: 'pill' }, e.section) : null),
    h('div', { class: 'wc-meaning' }, e.meaning || '—'),
    (e.examples.length || cam.length) ? h('ul', { class: 'wc-ex' },
      e.examples.map(x => h('li', {}, markHead(x, id))),
      cam.map(x => h('li', { class: 'cam' }, markHead(x, id), h('span', { class: 'src' }, 'Cambridge Dictionary')))) : null,
    h('div', { class: 'row', style: { marginTop: '14px' } },
      h('a', { class: 'camlink', href: cambridgeUrl(id), target: '_blank', rel: 'noopener' }, 'Open in Cambridge Dictionary ↗'), opts.footer || null));
}

/* ================================================================ question engine */
function ask(host, item, ctx, done) {
  clear(host);
  const id = item.id, e = E(id), t0 = Date.now();
  let fmt = item.fmt, cz = null;
  if (e.kind === 'pattern' && (fmt === 'cloze' || fmt === 'recall')) fmt = Math.random() < 0.5 ? 'mcq-head' : 'mcq-meaning';
  if (fmt === 'cloze') { cz = makeCloze(id); if (!cz) fmt = 'recall'; }
  let hint = false, answered = false, typed = '', correctForm = '';
  window.__cur = { id, fmt };
  const finish = (result, extra = {}) => { const grade = result === 'ok' ? (hint ? 2 : 3) : result === 'close' ? 2 : 1; done(Object.assign({ result, grade, ms: Date.now() - t0, hint, typed, correctForm }, extra)); };
  const card = h('div', { class: 'q-card' });
  host.append(card);
  const labels = { 'mcq-head': 'Which word or phrase fits this definition?', 'mcq-meaning': 'What does it mean?', cloze: 'Fill the gap', recall: 'Type the word or phrase' };
  card.append(h('div', { class: 'fmt' }, labels[fmt] || ''));
  const afterFeedback = result => {
    answered = true;
    const nxt = () => finish(result === 'ok' ? 'ok' : result);
    const box = h('div', { class: 'reveal-box' },
      h('div', { class: 'verdict ' + (result === 'ok' ? 'ok' : result === 'close' ? 'close' : 'no') }, result === 'ok' ? 'Correct' : result === 'close' ? 'Half right — spelling slip' : 'Not quite'),
      result === 'close' ? h('div', { class: 'spell' }, 'You know the word, only the spelling is off. You typed ', h('b', { class: 'bad' }, typed), ' — correct: ', h('b', { class: 'good' }, correctForm), '. Counted as half correct.') : null,
      entryCard(id));
    const btns = h('div', { class: 'row', style: { marginTop: '20px' } }, h('button', { class: 'btn', id: 'next', onclick: nxt }, 'Continue'));
    if (result === 'ok' && ctx.allowEasy) btns.append(h('button', { class: 'btn plain', onclick: () => finish('ok', { easy: true, grade: hint ? 2 : 4 }) }, 'Too easy'));
    if (result !== 'ok' && (fmt === 'cloze' || fmt === 'recall')) btns.append(h('button', { class: 'btn plain', title: 'My answer was also correct', onclick: () => finish('ok', { grade: 3 }) }, 'I was right'));
    box.append(btns); card.append(box);
    setKeys(ev => {
      if (ev.key === 'Enter') { ev.preventDefault(); nxt(); }
      else if ((ev.key === 'e' || ev.key === 'E') && result === 'ok' && ctx.allowEasy && !(ev.target && ev.target.tagName === 'INPUT')) finish('ok', { easy: true, grade: hint ? 2 : 4 });
      else if (ev.key === 'Escape' && ctx.onExit) ctx.onExit();
    });
    const nb = $('#next', card); if (nb) nb.focus({ preventScroll: true });
    /* scroll down to the word card, but stop with the Correct / Not quite line at the top of the screen */
    requestAnimationFrame(() => {
      const verdict = $('.verdict', box);
      const top = $('.session-top') ? $('.session-top').getBoundingClientRect().bottom : 0;
      const y = scrollY + verdict.getBoundingClientRect().top - top - 20;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    });
    if (S.settings.speak && result === 'ok') playWord(id, S.settings.accent);
  };
  if (fmt === 'mcq-head' || fmt === 'mcq-meaning') {
    const kind = fmt === 'mcq-head' ? 'head' : 'meaning';
    card.append(kind === 'head' ? h('div', { class: 'prompt' }, quizDef(id)) : h('div', { class: 'row', style: { marginBottom: '22px', alignItems: 'flex-start' } }, h('div', { class: 'prompt head grow', style: { margin: 0 } }, e.head), pronRow(id, true)));
    const ids = shuffle([id].concat(distractors(id, kind, ctx.nOpts ? ctx.nOpts - 1 : 3)));
    const opts = h('div', { class: 'opts' });
    ids.forEach((oid, i) => {
      const txt = kind === 'head' ? E(oid).head : clip(quizDef(oid), 160);
      const b = h('button', { class: 'opt', onclick: () => pick(oid, b) }, h('kbd', {}, i + 1), h('span', {}, txt));
      b.dataset.id = oid; opts.append(b);
    });
    card.append(opts);
    const pick = (oid, btn) => {
      if (answered) return;
      const ok = oid === id;
      [...opts.children].forEach(b => { b.disabled = true; if (b.dataset.id === id) b.classList.add('right'); });
      if (!ok) btn.classList.add('wrong');
      afterFeedback(ok ? 'ok' : 'no');
    };
    setKeys(ev => { const n = parseInt(ev.key, 10); if (n >= 1 && n <= ids.length && !answered) { const b = opts.children[n - 1]; pick(b.dataset.id, b); } else if (ev.key === 'Escape' && ctx.onExit) ctx.onExit(); });
  } else {
    const accepted = acceptedFor(id, cz);
    if (fmt === 'cloze') { card.append(h('div', { class: 'prompt' }, sentenceNodes(cz, 'blank'))); card.append(h('div', { class: 'muted small', style: { marginBottom: '14px' } }, 'Definition: ', quizDef(id))); }
    else card.append(h('div', { class: 'prompt' }, quizDef(id)));
    const hintBox = h('div', { class: 'muted small', style: { marginBottom: '10px', minHeight: '20px' } });
    const nWords = cleanTyped(cz ? cz.answer : (headVariants(e.head)[0] || [e.head]).join(' ')).split(' ').length;
    const input = h('input', { type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: nWords > 1 ? `Type ${nWords} words` : 'Type the word', 'aria-label': 'Your answer' });
    const check = () => { if (answered) return; typed = input.value.trim(); const r = checkTyped(input.value, accepted); correctForm = closestForm(input.value, accepted); { const fx = SLASH_PHRASES[String(e.head).trim()]; const full = fx && fx.find(f => cleanTyped(f) === correctForm); if (full) correctForm = full; } input.classList.add(r === 'no' ? 'no' : 'ok'); input.disabled = true; afterFeedback(r); };
    const hintBtn = h('button', { class: 'btn plain', onclick: () => { hint = true; const a = accepted[0] || ''; hintBox.textContent = `Starts with “${a[0] || '?'}” · ${nWords} word${nWords > 1 ? 's' : ''} · ${a.length} letters`; input.focus(); } }, 'Hint');
    card.append(hintBox, h('div', { class: 'typebox' }, input, h('button', { class: 'btn', onclick: check }, 'Check'), hintBtn));
    card.append(h('div', { class: 'keys' }, 'Enter checks your answer. The base form is accepted (e.g. “take” for “took”).'));
    setKeys(ev => { if (ev.key === 'Enter' && !answered) { ev.preventDefault(); check(); } else if (ev.key === 'Escape' && ctx.onExit) ctx.onExit(); });
    setTimeout(() => input.focus(), 40);
  }
}

/* ================================================================ learn / review sessions */
function formatFor(id) {
  const c = S.cards[id]; const s = c ? c.s : 0; const hasCloze = !!makeCloze(id);
  if (E(id).kind === 'pattern') return Math.random() < 0.5 ? 'mcq-head' : 'mcq-meaning';
  if (s < 4) return Math.random() < 0.5 ? 'mcq-head' : 'mcq-meaning';
  if (s < 25) return hasCloze ? 'cloze' : 'recall';
  return hasCloze && Math.random() < 0.5 ? 'cloze' : 'recall';
}
function sessionFrame(onExit) {
  const bar = h('i', { style: { width: '0%' } }), count = h('span', { class: 'muted small' }, '');
  const stage = h('div', { class: 'stage' });
  const page = h('div', {}, h('div', { class: 'session-top' }, h('div', { class: 'session-top-in' }, h('button', { class: 'xbtn', title: 'Exit (Esc)', 'aria-label': 'Exit', onclick: onExit }, '✕'), h('div', { class: 'bar' }, bar), count)), stage);
  const r = root(); clear(r); r.append(page); window.scrollTo(0, 0);
  return { stage, progress: (a, b) => { bar.style.width = (a / Math.max(1, b) * 100) + '%'; count.textContent = `${Math.min(a, b)} / ${b}`; } };
}
function runSession(opts) {
  stopLive();
  const back = opts.back || '#/';
  const ses = { queue: opts.items.slice(), total: opts.items.length, doneCount: 0, stat: {}, kind: opts.kind, graded: 0, t0: Date.now() };
  const F = sessionFrame(() => summary(true));
  const stage = F.stage;
  const st = id => (ses.stat[id] = ses.stat[id] || { miss: 0, known: false, steps: new Set() });
  function next() {
    F.progress(ses.doneCount, ses.total);
    if (!ses.queue.length) return summary(false);
    const item = ses.queue.shift();
    if (item.fmt === 'meet') return meet(item);
    ask(stage, item, { allowEasy: true, onExit: () => summary(true) }, res => answer(item, res));
  }
  function meet(item) {
    clear(stage);
    const e = E(item.id);
    const go2 = () => { ses.doneCount++; next(); };
    const card = h('div', { class: 'q-card' }, h('div', { class: 'fmt' }, 'New word · ' + UBY[e.unit].label),
      entryCard(item.id),
      h('div', { class: 'row', style: { marginTop: '22px' } }, h('button', { class: 'btn', id: 'go', onclick: go2 }, 'Next'), h('button', { class: 'btn plain', onclick: () => { st(item.id).known = true; go2(); } }, 'I already know it')));
    stage.append(card);
    setKeys(ev => { if (ev.key === 'Enter') { ev.preventDefault(); go2(); } else if (ev.key === 'k' || ev.key === 'K') { st(item.id).known = true; go2(); } else if (ev.key === 'Escape') summary(true); });
    if (S.settings.speak) playWord(item.id, S.settings.accent);
    const g = $('#go', card); if (g) g.focus();
  }
  function answer(item, res) {
    const s = st(item.id); const d = daily();
    if (res.result === 'close') { ses.slips = ses.slips || []; ses.slips.push({ id: item.id, typed: res.typed, right: res.correctForm }); }
    d.sec += Math.min(60, res.ms / 1000);
    if (ses.kind === 'review') {
      if (item.relearn) { if (res.result === 'no') ses.queue.splice(Math.min(3, ses.queue.length), 0, item); }
      else {
        gradeCard(item.id, res.easy ? 4 : res.grade); d.rev++; ses.graded++; ses.doneCount++;
        if (res.result === 'no') { ses.queue.splice(Math.min(4, ses.queue.length), 0, { id: item.id, fmt: 'mcq-head', relearn: true }); }
      }
    } else {
      if (res.result === 'no') { s.miss++; ses.queue.splice(Math.min(2, ses.queue.length), 0, item); }
      else {
        ses.doneCount++;
        if (res.result === 'close') s.miss += 0.5;
        s.steps.add(item.fmt === 'mcq-head' || item.fmt === 'mcq-meaning' ? 'mcq' : 'typed');
        if (res.easy) s.easy = true;
        if (s.steps.has('mcq') && s.steps.has('typed')) {
          const g = s.known && s.miss === 0 ? (s.easy ? 4 : 3) : s.miss === 0 ? 3 : s.miss < 2 ? 2 : 1;
          gradeCard(item.id, s.known && s.miss === 0 ? 4 : g); d.nw++; ses.learned = (ses.learned || 0) + 1;
        }
      }
    }
    next();
  }
  function summary(early) {
    setKeys(null); clear(stage); F.progress(ses.doneCount, ses.total);
    const mins = Math.max(1, Math.round((Date.now() - ses.t0) / 60000));
    stage.append(h('div', { class: 'q-card center' },
      h('div', { class: 'big-emoji' }, early ? '⏸' : '✓'),
      h('h2', { class: 'h3' }, early ? 'Session paused' : opts.kind === 'learn' ? 'Words learned' : 'Reviews done'),
      h('p', { class: 'muted' }, `${ses.kind === 'learn' ? (ses.learned || 0) + ' new words added to your schedule' : ses.graded + ' cards reviewed'} · about ${mins} min`),
      h('div', { class: 'row', style: { justifyContent: 'center', marginTop: '18px' } },
        opts.again ? h('button', { class: 'btn', onclick: opts.again }, opts.againLabel || 'Continue') : null,
        h('button', { class: 'btn plain', onclick: () => go(back) }, back.startsWith('#/unit/') ? 'Back to the unit' : 'Back to Today'))));
    if (ses.slips && ses.slips.length) stage.append(mistakesCard(ses.slips.map(x => ({ id: x.id, q: E(x.id).head, yours: x.typed, right: x.right, tag: 'Spelling only — counted as half correct', noMeaning: true })), 'Spelling slips'));
    save();
  }
  next();
}
function startReview(unitIds, limit = 40, back) {
  const ids = dueIds(unitIds);
  if (!ids.length) { toast('Nothing is due right now'); return; }
  const batch = ids.slice(0, limit);
  runSession({ kind: 'review', items: batch.map(id => ({ id, fmt: formatFor(id) })), back,
    again: ids.length > batch.length ? () => startReview(unitIds, limit, back) : null, againLabel: `Continue (${ids.length - batch.length} more due)` });
}
const chunkSize = (unitIds) => {
  if (S.settings.chunk === 'all') { const u = unitIds ? unitIds : [queue().find(x => newIds([x]).length)].filter(Boolean); return Math.max(1, newIds(u).length); }
  return S.settings.chunk;
};
function nextNew(unitIds, n) {
  if (unitIds) return newIds(unitIds).slice(0, n);
  for (const uid of queue()) { const ids = newIds([uid]); if (ids.length) return ids.slice(0, n); }
  return [];
}
function startLearn(unitIds, back) {
  const n = chunkSize(unitIds);
  const ids = nextNew(unitIds, n);
  if (!ids.length) { toast('No new words left here'); return; }
  const items = [];
  ids.forEach(id => items.push({ id, fmt: 'meet' }));
  shuffle(ids).forEach(id => items.push({ id, fmt: makeCloze(id) ? 'mcq-head' : 'mcq-meaning' }));
  shuffle(ids).forEach(id => items.push({ id, fmt: makeCloze(id) ? 'cloze' : 'recall' }));
  const left = (unitIds ? newIds(unitIds) : newIds()).length - ids.length;
  runSession({ kind: 'learn', items, back, again: left > 0 ? () => startLearn(unitIds, back) : null, againLabel: S.settings.chunk === 'all' ? 'Learn the next unit' : `Learn the next ${Math.min(n, left)}` });
}
function baseOrder() {
  const all = UNITS.map(u => u.id);
  if (S.settings.order !== 'cpe') return all;
  const pri = ['3', '4', '30'];
  const rank = id => pri.includes(id) ? 0 : ({ D: 1, E: 2, C: 3, B: 4 })[UBY[id].part] || 5;
  return all.slice().sort((a, b) => rank(a) - rank(b) || all.indexOf(a) - all.indexOf(b));
}
function queue() { const base = baseOrder(); if (!S.queue) return base; return S.queue.filter(x => UBY[x]).concat(base.filter(x => !S.queue.includes(x))); }

/* ================================================================ shell */
const views = {};
const go = hash => { if (location.hash === hash) render(); else location.hash = hash; };
const greetWord = () => { const hr = new Date().getHours(); return hr < 5 ? 'Good night' : hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening'; };
const firstName = () => ((S.profile && S.profile.name) || '').trim().split(/\s+/)[0] || 'there';
function shell(active, ...body) {
  const role = S.account && S.account.role;
  const extra = [];
  if (role === 'teacher' || role === 'admin') extra.push(['#/students', 'Students']);
  if (role === 'admin') extra.push(['#/admin', 'Admin']);
  const tabs = BOOK ? [['#/', 'Today'], ['#/units', 'Units'], ['#/games', 'Games'], ['#/cpe', 'CPE'], ['#/plan', 'Plan'], ...extra, ['#/account', 'Account']]
    : [['#/', 'Home'], ...extra, ['#/account', 'Account']];
  const initials = ((S.profile && S.profile.name) || '?').trim().split(/\s+/).map(x => x[0]).join('').slice(0, 2).toUpperCase();
  return h('div', {},
    h('nav', { class: 'nav', 'aria-label': 'Main' }, h('div', { class: 'nav-in' },
      h('div', { class: 'brand', onclick: () => go('#/') }, h('span', { class: 'brand-mark' }, 'L'), h('span', {}, 'Lexicon'), h('span', { class: 'full muted', style: { fontWeight: 400, fontSize: '13px' } }, 'C2 Companion')),
      h('div', { class: 'nav-links' }, tabs.map(([hr, t]) => h('a', { class: active === hr ? 'on' : '', href: hr }, t))),
      BOOK ? streakChip() : null,
      h('button', { class: 'avatar', title: 'Account', onclick: () => go('#/account') }, initials))),
    body,
    h('footer', { class: 'foot' }, BOOK ? 'Built for private study from Mark Skipper, Advanced Grammar & Vocabulary (Express Publishing). Extra examples link to the Cambridge Dictionary.' : 'Lexicon · C2 Companion'));
}
function revealOnScroll() {
  const els = document.querySelectorAll('.reveal:not(.in)');
  if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); return; }
  const io = new IntersectionObserver(entries => { entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }); }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
  els.forEach((e, i) => { e.style.transitionDelay = Math.min(i % 8, 6) * 0.05 + 's'; io.observe(e); });
}

/* ================================================================ streak flame */
const FLAME_TIERS = [
  { min: 0, name: 'Spark', top: '#ffc24a', bot: '#ff6a00', inner: '#fff1b8', glow: 'rgba(255,140,0,.55)', size: 1 },
  { min: 10, name: 'Flame', top: '#ff9a1f', bot: '#ff3d00', inner: '#ffe08a', glow: 'rgba(255,90,0,.65)', size: 1.2 },
  { min: 50, name: 'Blaze', top: '#ff6b2c', bot: '#e0002a', inner: '#ffd45c', glow: 'rgba(255,40,30,.7)', size: 1.4, sparks: 1 },
  { min: 100, name: 'Inferno', top: '#ff2d55', bot: '#9e0030', inner: '#ffcf4a', glow: 'rgba(255,20,70,.8)', size: 1.6, sparks: 1 },
  { min: 150, name: 'Phoenix', top: '#d36bff', bot: '#5b12ff', inner: '#ffb3f2', glow: 'rgba(170,60,255,.8)', size: 1.75, sparks: 1, halo: 1 },
  { min: 200, name: 'Supernova', top: '#9fe8ff', bot: '#3d5bff', inner: '#ffffff', glow: 'rgba(120,180,255,.9)', size: 1.9, sparks: 1, halo: 1, ring: 1 },
];
const flameTier = n => FLAME_TIERS.filter(t => n >= t.min).pop();
let flameUid = 0;
function flameSvg(n, cls) {
  const t = flameTier(n), u = 'fl' + (++flameUid);
  const wrap = h('span', { class: 'flame ' + (cls || '') + (t.sparks ? ' sparks' : '') + (t.halo ? ' halo' : '') + (t.ring ? ' ring2' : ''), style: { '--glow': t.glow } });
  wrap.innerHTML = `<svg viewBox="0 0 64 80" aria-hidden="true"><defs>
    <linearGradient id="${u}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.top}"/><stop offset="1" stop-color="${t.bot}"/></linearGradient>
    <radialGradient id="${u}b" cx=".5" cy=".75" r=".6"><stop offset="0" stop-color="#fff"/><stop offset=".45" stop-color="${t.inner}"/><stop offset="1" stop-color="${t.inner}" stop-opacity="0"/></radialGradient></defs>
    <path class="fo" fill="url(#${u}a)" d="M32 2C36 18 55 27 55 50C55 67 45 78 32 78C19 78 9 67 9 50C9 38 17 31 21 21C23 29 27 34 30 34C28 22 30 12 32 2Z"/>
    <path class="fi" fill="url(#${u}b)" d="M32 30C35 42 46 47 46 60C46 71 39 77 32 77C25 77 18 71 18 60C18 51 25 47 27 40C29 46 31 47 32 47C31 41 31 36 32 30Z"/></svg>`;
  return wrap;
}
const studiedToday = () => { const v = S.daily[dkey()]; return !!(v && (v.rev + v.nw) > 0); };
function streakChip() {
  const n = streak(), t = flameTier(n);
  return h('button', { class: 'streak-chip' + (studiedToday() ? '' : ' cold'), title: `${n}-day streak · ${t.name}${studiedToday() ? '' : ' · study today to keep it'}`, onclick: () => flameIntro(true) }, flameSvg(n, 'sm'), h('b', {}, n));
}
function flameIntro(force) {
  if (!force && S.flameSeen === dkey()) return;
  if ($('.flame-stage')) return;
  S.flameSeen = dkey(); save();
  const n = streak(), t = flameTier(n), today = studiedToday();
  const next = FLAME_TIERS.find(x => x.min > n);
  const cap = n === 0 ? 'Start a streak today' : `${n}-day streak`;
  const sub = n === 0 ? 'Study a few cards and the spark lights up.' : today ? `${t.name}. You’ve already studied today.` : `${t.name}. Study today to make it ${n + 1}.`;
  const big = flameSvg(n, 'big');
  const stage = h('div', { class: 'flame-stage', role: 'dialog', 'aria-label': cap },
    h('div', { class: 'flame-center' }, big, h('div', { class: 'flame-num' }, n), h('div', { class: 'flame-cap' }, cap), h('div', { class: 'flame-sub' }, sub),
      next ? h('div', { class: 'flame-next' }, `${next.name} at ${next.min} days`) : h('div', { class: 'flame-next' }, 'The highest flame there is.')));
  big.style.setProperty('--sz', (150 * t.size) + 'px');
  if (t.sparks) for (let i = 0; i < 14; i++) big.append(h('i', { class: 'ember', style: { left: (25 + Math.random() * 50) + '%', animationDelay: (Math.random() * 2.4) + 's', animationDuration: (1.6 + Math.random() * 1.4) + 's', '--dx': (Math.random() * 60 - 30) + 'px', background: i % 3 ? t.inner : t.top } }));
  document.body.append(stage);
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let gone = false;
  const fly = () => {
    if (gone) return; gone = true;
    const chip = $('.streak-chip .flame');
    const done = () => { stage.remove(); const c = $('.streak-chip'); if (c) { c.classList.add('land'); setTimeout(() => c.classList.remove('land'), 700); } afterFlame(); };
    if (!chip || reduce) { stage.classList.add('fade'); setTimeout(done, 350); return; }
    const a = big.getBoundingClientRect(), b = chip.getBoundingClientRect();
    const dx = (b.left + b.width / 2) - (a.left + a.width / 2), dy = (b.top + b.height / 2) - (a.top + a.height / 2), sc = b.height / a.height;
    stage.classList.add('flying');
    big.style.transition = 'transform 1s cubic-bezier(.6,-0.05,.3,1)';
    big.style.transform = `translate(${dx}px, ${dy}px) scale(${sc})`;
    setTimeout(done, 1000);
  };
  stage.addEventListener('click', fly);
  setTimeout(fly, reduce ? 1600 : 2600);
}
function afterFlame() { if (!S.tourSeen && S.planSet) explainProgress(); }
function explainProgress() {
  S.tourSeen = true; save();
  const sw = (c, t, d) => h('div', { class: 'ex-row' }, h('i', { class: 'ex-dot', style: { background: c } }), h('div', {}, h('b', {}, t), h('span', { class: 'muted small' }, d)));
  modal((box, close) => {
    const ringDemo = h('div', { class: 'ex-ring' }, ring(0.55), h('span', {}, '18 of 18 started'));
    box.append(h('h3', {}, 'How to read your progress'),
      h('div', { class: 'ex-sec' }, h('div', { class: 'ex-t' }, 'Every word has a memory state'),
        sw('var(--new)', 'New', 'You haven’t studied it yet.'),
        sw('var(--learn)', 'Learning', 'Studied, but your memory of it lasts less than a week.'),
        sw('var(--young)', 'Young', 'You remember it for 1–4 weeks.'),
        sw('var(--mature)', 'Mastered', 'You remember it for a month or more.'),
        h('p', { class: 'muted small' }, 'Words move up when you get them right in reviews. The gaps between reviews grow each time, so mastering a word takes a few weeks.')),
      h('div', { class: 'ex-sec' }, h('div', { class: 'ex-t' }, 'The ring on each unit'), ringDemo,
        h('p', { class: 'muted small' }, 'The caption shows how many words you have started. The ring shows how firmly you know them: a learning word fills 30%, a young word 60%, a mastered word 100%. Right after you learn a unit the ring is about a third full. It fills up over the next weeks of reviews.')),
      h('div', { class: 'ex-sec' }, h('div', { class: 'ex-t' }, 'The whole book'),
        h('p', { class: 'muted small' }, 'The long bar counts every word in the book, so it grows slowly. The squares below it are days: the darker the square, the more cards you did that day (1–15, 16–30, 31+).')),
      h('div', { class: 'ex-sec' }, h('div', { class: 'ex-t' }, 'Your streak'),
        h('div', { class: 'ex-flames' }, FLAME_TIERS.map(t => h('div', {}, flameSvg(t.min || 1, 'mid'), h('b', {}, t.name), h('span', { class: 'muted small' }, (t.min || 1) + '+ days')))),
        h('p', { class: 'muted small' }, 'Study at least one card a day to keep the flame alive. It grows at 10, 50, 100, 150 and 200 days.')),
      h('div', { class: 'actions' }, h('button', { class: 'btn', 'data-autofocus': true, onclick: close }, 'Got it')));
    setTimeout(() => { box.scrollTop = 0; }, 30);
  }, 'wide');
}

/* ================================================================ welcome: access code → profile → plan */
views.lock = (onDone) => {
  const input = h('input', { type: 'password', placeholder: 'Access code', autocomplete: 'off', 'aria-label': 'Access code' });
  const err = h('div', { class: 'err', role: 'alert' });
  const btn = h('button', { class: 'btn lg', type: 'submit' }, 'Continue');
  const form = h('form', { onsubmit: async ev => {
    ev.preventDefault(); err.textContent = ''; btn.disabled = true; btn.textContent = 'Opening…';
    try { const book = await decryptBook(input.value); try { localStorage.setItem(CODE_KEY, input.value.trim()); } catch (e) { /* */ } onDone(book); }
    catch (e) { err.textContent = /missing|fetch/i.test(String(e)) ? 'The book file could not be loaded. Check your connection and reload the page.' : 'That code doesn’t open the book. Check it and try again.'; btn.disabled = false; btn.textContent = 'Continue'; input.select(); }
  } }, h('label', { class: 'fl' }, 'Access code'), input, err, btn);
  const page = h('div', { class: 'welcome' }, h('div', { class: 'welcome-box' },
    h('div', { class: 'logo' }, 'L'), heroTitle('Lexicon', 'grad-text'),
    h('p', { class: 'hero-sub' }, 'The whole of Advanced Grammar & Vocabulary, built for C2.'),
    form, h('p', { class: 'muted small', style: { marginTop: '22px' } }, 'The word lists are private. Ask the person who shared this site for the access code.')));
  setTimeout(() => input.focus(), 50);
  return page;
};
/* sign in to a Lexicon account: password, or a 6-digit code by email (first time / forgotten password) */
views.signin = (onDone) => {
  const C = window.LEXICON_CONFIG || {};
  const link = CLOUD.fromLink; CLOUD.clearLink();
  let mode = link && !link.error && CLOUD.user ? 'newpass' : 'password', email = CLOUD.user ? CLOUD.user.email : '';
  const box = h('div', { class: 'welcome-box' });
  const page = h('div', { class: 'welcome' }, box);
  const field = (type, ph, ac, extra) => h('input', Object.assign({ type, placeholder: ph, autocomplete: ac, required: true }, extra || {}));
  const busy = (btn, on, text) => { btn.disabled = on; btn.textContent = text; };
  const draw = () => {
    clear(box);
    const err = h('div', { class: 'err', role: 'alert' });
    const head = (t, sub) => [h('div', { class: 'logo' }, 'L'), heroTitle(t, 'grad-text'), h('p', { class: 'hero-sub' }, sub)];
    if (mode === 'password') {
      const em = field('email', 'name@example.com', 'email', { value: email, 'aria-label': 'Email' }), pw = field('password', 'Password', 'current-password', { 'aria-label': 'Password' });
      const btn = h('button', { class: 'btn lg', type: 'submit' }, 'Sign in');
      if (link && link.error) { err.textContent = /expired|invalid/i.test(link.error) ? 'That sign-in link has expired. Ask for a new one.' : link.error; }
      box.append(...head('Lexicon', 'Sign in to continue where you left off, on any device.'),
        h('form', { onsubmit: async ev => { ev.preventDefault(); err.textContent = ''; busy(btn, true, 'Signing in…'); email = em.value.trim();
          try { await CLOUD.signIn(email, pw.value); onDone(); } catch (e) { err.textContent = e.message; busy(btn, false, 'Sign in'); } } },
          h('label', { class: 'fl' }, 'Email'), em, h('label', { class: 'fl' }, 'Password'), pw, err, btn),
        h('div', { class: 'or-line' }, h('span', {}, 'New here?')),
        h('button', { class: 'btn lg ghost', type: 'button', style: { width: '100%' }, onclick: () => { email = em.value.trim(); mode = 'email'; draw(); } }, 'Create an account'),
        h('p', { class: 'muted small', style: { marginTop: '18px' } }, h('a', { href: '#', onclick: ev => { ev.preventDefault(); email = em.value.trim(); mode = 'email'; draw(); } }, 'Forgot your password?')));
      setTimeout(() => (email ? pw : em).focus(), 60);
    } else if (mode === 'email') {
      const em = field('email', 'name@example.com', 'email', { value: email, 'aria-label': 'Email' });
      const btn = h('button', { class: 'btn lg', type: 'submit' }, 'Send me a code');
      box.append(...head('Your email', 'We’ll send you a 6-digit code. Then you’ll choose a password — that’s your account.'),
        h('form', { onsubmit: async ev => { ev.preventDefault(); err.textContent = ''; busy(btn, true, 'Sending…'); email = em.value.trim();
          try { await CLOUD.sendCode(email, !!C.allowSignup); mode = 'code'; draw(); } catch (e) { err.textContent = e.message; busy(btn, false, 'Send me a code'); } } },
          h('label', { class: 'fl' }, 'Email'), em, err, btn),
        h('p', { class: 'muted small', style: { marginTop: '22px' } }, h('a', { href: '#', onclick: ev => { ev.preventDefault(); mode = 'password'; draw(); } }, 'Back to sign in')));
      setTimeout(() => em.focus(), 60);
    } else if (mode === 'code') {
      const code = field('text', '123456', 'one-time-code', { inputmode: 'numeric', maxlength: '8', class: 'code-input', 'aria-label': 'Code from the email' });
      const btn = h('button', { class: 'btn lg', type: 'submit' }, 'Continue');
      box.append(...head('Check your email', `We sent a 6-digit code to ${email}. Type it here. It can take a minute — look in Spam too.`),
        h('form', { onsubmit: async ev => { ev.preventDefault(); err.textContent = ''; busy(btn, true, 'Checking…');
          try { await CLOUD.verifyCode(email, code.value); mode = 'newpass'; draw(); } catch (e) { err.textContent = e.message; busy(btn, false, 'Continue'); code.select(); } } },
          h('label', { class: 'fl' }, 'Code'), code, err, btn),
        h('p', { class: 'muted small', style: { marginTop: '22px' } }, h('a', { href: '#', onclick: ev => { ev.preventDefault(); mode = 'email'; draw(); } }, 'Send a new email')));
      setTimeout(() => code.focus(), 60);
    } else {
      const p1 = field('password', 'At least 8 characters', 'new-password', { minlength: '8', 'aria-label': 'New password' }), p2 = field('password', 'Repeat the password', 'new-password', { 'aria-label': 'Repeat the password' });
      const btn = h('button', { class: 'btn lg', type: 'submit' }, 'Save password');
      box.append(...head('Choose a password', 'Next time, sign in with your email and this password on any device.'),
        h('form', { onsubmit: async ev => { ev.preventDefault(); err.textContent = '';
          if (p1.value.length < 8) { err.textContent = 'Use at least 8 characters.'; return; }
          if (p1.value !== p2.value) { err.textContent = 'The two passwords don’t match.'; return; }
          busy(btn, true, 'Saving…');
          try { await CLOUD.setPassword(p1.value); onDone(); } catch (e) { if (/already your password/.test(e.message)) return onDone(); err.textContent = e.message; busy(btn, false, 'Save password'); } } },
          h('label', { class: 'fl' }, 'New password'), p1, h('label', { class: 'fl' }, 'Repeat it'), p2, err, btn));
      setTimeout(() => p1.focus(), 60);
    }
  };
  draw();
  return page;
};
views.welcome = () => {
  let step = S.profile ? 2 : 1;
  const box = h('div', { class: 'welcome-box' });
  const page = h('div', { class: 'welcome' }, box);
  const draft = { name: '', email: CLOUD && CLOUD.user ? CLOUD.user.email : '', chunk: S.settings.chunk, newPerDay: S.settings.newPerDay, order: S.settings.order };
  const steps = () => h('div', { class: 'steps' }, [1, 2].map(i => h('i', { class: i <= step ? 'on' : '' })));
  const segOf = (opts, key) => { const s = h('div', { class: 'seg' }); const draw = () => { clear(s); opts.forEach(([v, t]) => s.append(h('button', { type: 'button', class: draft[key] === v ? 'on' : '', onclick: () => { draft[key] = v; draw(); } }, t))); }; draw(); return s; };
  const draw = () => {
    clear(box);
    if (step === 1) {
      const name = h('input', { type: 'text', placeholder: 'Your name', autocomplete: 'given-name', required: true, value: draft.name });
      const email = h('input', { type: 'email', placeholder: 'name@example.com', autocomplete: 'email', value: draft.email, readonly: !!(CLOUD && CLOUD.user) });
      const err = h('div', { class: 'err' });
      box.append(steps(), h('div', { class: 'logo' }, 'L'), heroTitle('Create your profile'),
        h('p', { class: 'hero-sub' }, 'Tell us your name. Any email works — Gmail, Mail.ru, Yandex, iCloud.'),
        h('form', { onsubmit: ev => { ev.preventDefault(); if (!name.value.trim()) { err.textContent = 'Enter your name to continue.'; return; } draft.name = name.value.trim(); draft.email = email.value.trim(); S.profile = { name: draft.name, email: draft.email, createdAt: Date.now() }; save(); if (CLOUD && CLOUD.user) CLOUD.rename(draft.name).catch(() => {}); step = 2; draw(); } },
          h('label', { class: 'fl' }, 'Name'), name, h('label', { class: 'fl' }, CLOUD && CLOUD.user ? 'Email' : 'Email (optional)'), email, err,
          h('button', { class: 'btn lg', type: 'submit' }, 'Create profile')),
        h('p', { class: 'muted small', style: { marginTop: '18px' } }, CLOUD && CLOUD.user ? 'Your progress is saved to your account. Sign in on any device to continue.' : 'Your profile and progress are saved in this browser. To continue on another device, use Account → Move to another device.'));
      setTimeout(() => name.focus(), 60);
    } else {
      box.append(steps(), heroTitle(`Hello, ${firstName()}.`, 'grad-text'),
        h('p', { class: 'hero-sub' }, 'Your profile is ready. Now choose your personal plan.'),
        h('div', { class: 'form' },
          h('div', { class: 'choice' }, h('div', { class: 'q' }, 'How many words do you want to learn at once?'), segOf([[5, '5'], [10, '10'], [15, '15'], ['all', 'Whole unit']], 'chunk'),
            h('div', { class: 'muted small', style: { marginTop: '6px' } }, '“Whole unit” means every new word in the unit first, then all the tasks on them.')),
          h('div', { class: 'choice' }, h('div', { class: 'q' }, 'New words per day'), segOf([[10, '10'], [15, '15'], [20, '20'], [30, '30']], 'newPerDay')),
          h('div', { class: 'choice' }, h('div', { class: 'q' }, 'Study order'), segOf([['cpe', 'CPE-first'], ['book', 'Book order']], 'order')),
          h('button', { class: 'btn lg', onclick: () => { Object.assign(S.settings, { chunk: draft.chunk, newPerDay: draft.newPerDay, order: draft.order }); S.planSet = true; save(); go('#/'); } }, 'Start learning')));
    }
  };
  draw();
  return page;
};

/* ================================================================ Today */
views.today = () => {
  const dueN = dueIds().length;
  const d = S.daily[dkey()] || { rev: 0, nw: 0, sec: 0 };
  const left = Math.max(0, S.settings.newPerDay - d.nw);
  const counts = countStates(ALL.map(e => e.id));
  const upNext = queue().filter(uid => newIds([uid]).length || dueIds([uid]).length).slice(0, 8);
  const sub = dueN ? `${dueN} review${dueN === 1 ? '' : 's'} and ${left} new words are waiting.` : left ? `No reviews due. ${left} new words are waiting.` : 'You’re done for today. A game keeps it warm.';
  const n = chunkSize(null);
  return shell('#/',
    h('section', { class: 'hero' },
      heroTitle(`${greetWord()}, ${firstName()}.`),
      h('p', { class: 'hero-sub' }, sub),
      h('div', { class: 'hero-cta' },
        dueN ? h('button', { class: 'btn lg', onclick: () => startReview(null) }, `Start reviews`) : null,
        h('button', { class: 'btn lg ' + (dueN ? 'ghost' : ''), onclick: () => startLearn(null) }, S.settings.chunk === 'all' ? 'Learn the next unit' : `Learn ${n} new words`),
        h('button', { class: 'btn lg plain', onclick: () => go('#/games') }, 'Play a game'))),
    h('section', { class: 'section gray' }, h('div', { class: 'container' },
      h('div', { class: 'figures' },
        h('div', { class: 'fig reveal' }, h('b', {}, streak()), h('span', {}, 'day streak')),
        h('div', { class: 'fig reveal' }, h('b', {}, counts.mature), h('span', {}, `of ${ALL.length} words mastered`)),
        h('div', { class: 'fig reveal' }, h('b', {}, Math.round(d.sec / 60)), h('span', {}, 'minutes studied today')),
        h('div', { class: 'fig reveal' }, h('b', {}, ALL.length - counts.new), h('span', {}, 'words started'))))),
    upNext.length ? h('section', { class: 'section' },
      h('div', { class: 'container section-head' }, h('h2', { class: 'h2' }, 'Up next.'), h('p', { class: 'lead' }, S.settings.order === 'cpe' ? 'Your queue follows the CPE-first order: word formation, phrasal verbs and key verbs come first.' : 'Your queue follows the order of the book.')),
      h('div', { class: 'carousel' }, upNext.map(uid => unitTile(UBY[uid], true)))) : null,
    h('section', { class: 'section gray' }, h('div', { class: 'container' },
      h('div', { class: 'row reveal' }, h('h2', { class: 'h2 grow' }, 'The whole book.'), h('button', { class: 'btn sm plain', onclick: explainProgress }, 'What do the colours mean?')),
      h('div', { class: 'card reveal', style: { marginTop: '28px' } }, stackBar(counts, ALL.length), legend(counts), heatmap()))));
};
function heatmap() {
  const weeks = 20, cells = []; const today = new Date(); today.setHours(12, 0, 0, 0);
  const end = new Date(today); const dow = (end.getDay() + 6) % 7; end.setDate(end.getDate() + (6 - dow));
  for (let i = weeks * 7 - 1; i >= 0; i--) {
    const d = new Date(end); d.setDate(end.getDate() - i);
    const v = S.daily[dkey(d.getTime())]; const n = v ? v.rev + v.nw : 0; const future = d > today;
    cells.push(h('i', { class: future ? '' : n > 30 ? 'l3' : n > 15 ? 'l2' : n > 0 ? 'l1' : '', style: future ? { opacity: .25 } : {}, title: dkey(d.getTime()) + ': ' + n }));
  }
  return h('div', {}, h('div', { class: 'muted small', style: { marginTop: '22px' } }, 'Activity, last 20 weeks · one square = one day, darker = more cards: 1–15, 16–30, 31+'), h('div', { class: 'heat' }, cells));
}

/* ================================================================ Units */
function unitTile(u, inCarousel) {
  const ids = u.entries.map(e => e.id), c = countStates(ids), learned = ids.length - c.new;
  return h('button', { class: 'unit-tile' + (inCarousel ? '' : ' reveal'), onclick: () => go('#/unit/' + u.id) },
    h('div', { class: 'num' }, u.id), h('div', { class: 'ttl' }, u.title),
    h('div', { class: 'foot' }, ring(ids.length ? (c.mature + c.young * 0.6 + c.learn * 0.3) / ids.length : 0), h('span', {}, `${learned} of ${ids.length} started`)));
}
views.units = () => {
  const search = h('input', { type: 'search', class: 'search-big', placeholder: 'Search any word, definition or example', 'aria-label': 'Search' });
  const results = h('div', { class: 'container' });
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase(); clear(results);
    if (q.length < 2) return;
    const hits = ALL.filter(e => { const x = E(e.id); return x.head.toLowerCase().includes(q) || x.meaning.toLowerCase().includes(q) || x.examples.some(s => s.toLowerCase().includes(q)); }).slice(0, 40);
    results.append(h('div', { class: 'card', style: { margin: '28px 0' } }, h('div', { class: 'muted small' }, hits.length ? hits.length + (hits.length === 40 ? '+' : '') + ' matches' : 'No matches'),
      hits.length ? h('div', { class: 'tablewrap' }, wordTable(hits.map(e => e.id), { showUnit: true })) : null));
  });
  return shell('#/units',
    h('section', { class: 'hero' }, heroTitle(`${UNITS.length} units. One book.`), h('p', { class: 'hero-sub' }, `${ALL.length.toLocaleString('en-GB')} words and phrases, from adjectives of character to phrasal verbs with “take”.`),
      h('div', { style: { marginTop: '34px' } }, search)),
    results,
    h('section', { class: 'section gray', style: { paddingTop: '8px' } }, h('div', { class: 'container' },
      PARTS.map(p => h('div', {}, h('div', { class: 'partlabel' }, p.name.split(' (')[0], h('small', {}, `Units ${p.units[0]}–${p.units[p.units.length - 1]}`)), h('div', { class: 'tilegrid' }, p.units.map(id => unitTile(UBY[id]))))))));
};
function wordTable(ids, o = {}) {
  const t = h('table', { class: 'words' }, h('thead', {}, h('tr', {}, h('th', {}, 'Word or phrase'), h('th', {}, 'Meaning'), h('th', {}, 'Examples'), h('th', {}, ''))));
  const tb = h('tbody'); t.append(tb);
  for (const id of ids) {
    const e = E(id), cam = (e.cam && e.cam.ex) || [];
    const reveal = td => { if (o.cover) { td.classList.add('blurred'); td.title = 'Click to reveal'; td.onclick = () => td.classList.remove('blurred'); } return td; };
    tb.append(h('tr', { class: 'state-' + state(id) },
      h('td', { class: 'w' }, h('span', { class: 'hw' }, e.head), pronRow(id), h('div', { class: 'row', style: { gap: '8px' } }, toneBadge(id), o.showUnit ? h('a', { class: 'small', href: '#/unit/' + e.unit }, UBY[e.unit].label) : null)),
      reveal(h('td', {}, e.meaning)),
      reveal(h('td', { class: 'ex' }, e.examples.map(x => h('div', {}, markHead(x, id))), cam.map(x => h('div', { class: 'cam' }, markHead(x, id))),
        h('a', { class: 'camlink', href: cambridgeUrl(id), target: '_blank', rel: 'noopener' }, 'Cambridge ↗'))),
      h('td', {}, h('button', { class: 'icon', title: 'Fix a typo in this card', 'aria-label': 'Edit card', onclick: () => editModal(id) }, '✎'))));
  }
  return t;
}
function chunkPicker(uid, onChange) {
  const total = newIds([uid]).length;
  const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Words at once' });
  const draw = () => { clear(seg); [[5, '5'], [10, '10'], [15, '15'], ['all', `All ${total || ''}`.trim()]].forEach(([v, t]) => seg.append(h('button', { type: 'button', class: S.settings.chunk === v ? 'on' : '', onclick: () => { S.settings.chunk = v; save(); draw(); onChange(); } }, t))); };
  draw(); return seg;
}
views.unit = uid => {
  const u = UBY[uid]; if (!u) return shell('#/units', h('section', { class: 'hero' }, h('h1', { class: 'h2' }, 'This unit doesn’t exist.'), h('p', {}, h('a', { href: '#/units' }, 'See all units'))));
  const ids = u.entries.map(e => e.id), c = countStates(ids), part = partOf(u);
  const back = '#/unit/' + uid;
  let cover = false;
  const tableHost = h('div', { class: 'tablewrap' });
  const drawTable = () => { clear(tableHost); tableHost.append(wordTable(ids, { cover })); };
  const newLeft = newIds([uid]).length, dueU = dueIds([uid]).length;
  const learnBtn = h('button', { class: 'btn lg', disabled: !newLeft });
  const learnLabel = () => { const n = S.settings.chunk === 'all' ? newLeft : Math.min(S.settings.chunk, newLeft); learnBtn.textContent = newLeft ? (S.settings.chunk === 'all' || n === newLeft ? `Learn all ${newLeft} words` : `Learn ${n} words`) : 'All words learned'; };
  learnBtn.onclick = () => startLearn([uid], back);
  learnLabel();
  const subLearn = h('button', { class: 'btn sm', disabled: !newLeft, onclick: () => startLearn([uid], back) }, 'Learn');
  drawTable();
  return shell('#/units',
    h('div', { class: 'subnav' }, h('div', { class: 'subnav-in' }, h('div', { class: 'subnav-title' }, u.label), h('a', { href: '#/units' }, 'All units'), h('a', { onclick: () => document.getElementById('games')?.scrollIntoView({ behavior: 'smooth' }) }, 'Games'), h('a', { onclick: () => document.getElementById('export')?.scrollIntoView({ behavior: 'smooth' }) }, 'Export'), subLearn)),
    h('section', { class: 'hero' },
      h('div', { class: 'muted', style: { fontSize: '19px', fontWeight: 600 } }, (part ? part.name.split(' (')[0] : '') + ` · book page ${u.page}`),
      heroTitle(u.title, ''),
      h('p', { class: 'hero-sub' }, `${ids.length} words and phrases. ${c.new === ids.length ? 'All new.' : `${ids.length - c.new} started, ${c.mature} mastered.`}`),
      h('div', { style: { maxWidth: '520px', margin: '28px auto 0' } }, stackBar(c, ids.length)),
      h('div', { class: 'hero-cta', style: { flexDirection: 'column', alignItems: 'center' } },
        h('div', { class: 'muted small' }, 'How many words at once?'), chunkPicker(uid, learnLabel),
        h('div', { class: 'row', style: { justifyContent: 'center', marginTop: '6px' } }, learnBtn,
          h('button', { class: 'btn lg ghost', disabled: !dueU, onclick: () => startReview([uid], 40, back) }, `Review${dueU ? ' (' + dueU + ')' : ''}`),
          h('button', { class: 'btn lg plain', onclick: () => go('#/test/' + uid) }, 'Unit test')))),
    h('section', { class: 'section gray', id: 'games' }, h('div', { class: 'container' },
      h('div', { class: 'section-head' }, h('h2', { class: 'h2' }, 'Play this unit.'), h('p', { class: 'lead' }, `Nine games, only with the words of ${u.label}.`)),
      gameTiles([uid], back))),
    h('section', { class: 'section' }, h('div', { class: 'container' },
      h('div', { class: 'row', style: { marginBottom: '18px' } }, h('h2', { class: 'h3 grow' }, 'Words in this unit'),
        h('label', { class: 'small muted row', style: { gap: '8px' } }, h('input', { type: 'checkbox', onchange: ev => { cover = ev.target.checked; drawTable(); } }), 'Hide meanings to test yourself')),
      tableHost,
      (u.refs && u.refs.length) ? h('div', { class: 'card', style: { marginTop: '28px' } }, h('h3', { class: 'h3', style: { fontSize: '21px' } }, 'Reference'), ...u.refs.map(r => h('div', { style: { margin: '12px 0' } }, h('b', {}, r.head), h('div', { class: 'muted' }, r.text)))) : null)),
    h('section', { class: 'section gray', id: 'export' }, h('div', { class: 'container' },
      h('div', { class: 'section-head' }, h('h2', { class: 'h2' }, 'Take it with you.'), h('p', { class: 'lead' }, `Turn all ${ids.length} words of this unit into a flashcard set for Anki or Quizlet.`)),
      exportCards(u))));
};
function editModal(id) {
  const e = E(id);
  modal((box, close) => {
    const head = h('input', { type: 'text', value: e.head, style: { width: '100%' } });
    const meaning = h('textarea', {}, e.meaning);
    const ex = h('textarea', { style: { minHeight: '120px' } }, e.examples.join('\n'));
    box.append(h('h3', {}, 'Fix this card'), h('p', { class: 'muted small' }, `The text was read from a scan, so a typo can remain. Compare with page ${UBY[e.unit].page} of the book.`),
      h('label', { class: 'fl' }, 'Word or phrase'), head, h('label', { class: 'fl' }, 'Meaning'), meaning, h('label', { class: 'fl' }, 'Examples, one per line'), ex,
      h('div', { class: 'actions' },
        S.edits[id] ? h('button', { class: 'btn plain', onclick: () => { delete S.edits[id]; save(); close(); render(); } }, 'Restore original') : null,
        h('button', { class: 'btn plain', onclick: close }, 'Cancel'),
        h('button', { class: 'btn', onclick: () => { S.edits[id] = { head: head.value.trim(), meaning: meaning.value.trim(), examples: ex.value.split('\n').map(x => x.trim()).filter(Boolean) }; delete variantsCache[e.head]; save(); close(); render(); toast('Card saved'); } }, 'Save')));
  });
}

/* ---- Anki / Quizlet export ---- */
function download(name, text, type = 'application/json') {
  const a = h('a', { href: URL.createObjectURL(new Blob([text], { type })), download: name }); document.body.append(a); a.click(); a.remove();
}
const oneLine = s => String(s).replace(/[\t\r\n]+/g, ' ').trim();
const escHtml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function quizletText(ids) {
  return ids.map(id => { const e = E(id); const ex = e.examples[0] ? ` — e.g. ${e.examples[0]}` : ''; return oneLine(e.head) + '\t' + oneLine(e.meaning + ex); }).join('\n');
}
function ankiText(ids, deck) {
  const head = `#separator:tab\n#html:true\n#guid column:1\n#notetype:Basic\n#deck:${deck}\n#tags column:4\n`;
  return head + ids.map(id => {
    const e = E(id), u = UBY[e.unit];
    const back = escHtml(oneLine(e.meaning)) + (allExamples(id).length ? '<br><br>' + allExamples(id).map(x => '<i>' + escHtml(oneLine(x)) + '</i>').join('<br>') : '');
    return ['skipper-' + id, escHtml(oneLine(e.head)), back, `Skipper Unit_${u.id} Part_${u.part}`].join('\t');
  }).join('\n') + '\n';
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch (e) { const ta = h('textarea', { style: { position: 'fixed', opacity: 0 } }, text); document.body.append(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (_) { /* */ } ta.remove(); return ok; }
}
function exportCards(u) {
  const ids = u.entries.map(e => e.id);
  return h('div', { class: 'export-grid' },
    h('div', { class: 'export-card reveal' }, h('div', { class: 'app' }, 'Quizlet'),
      h('ol', {}, h('li', {}, 'Press “Copy set”.'), h('li', {}, 'In Quizlet: Create → Flashcard set → Import.'), h('li', {}, 'Paste. Keep “Tab” between term and definition and “New line” between cards. Create.')),
      h('button', { class: 'btn', onclick: async () => toast((await copyText(quizletText(ids))) ? `Copied ${ids.length} cards for Quizlet` : 'Copy failed — select and copy manually') }, 'Copy set')),
    h('div', { class: 'export-card reveal' }, h('div', { class: 'app' }, 'Anki'),
      h('ol', {}, h('li', {}, 'Press “Download for Anki”.'), h('li', {}, 'In Anki: File → Import, and choose the file.'), h('li', {}, `It lands in the deck “Skipper::${u.label}”, with all examples on the back.`)),
      h('button', { class: 'btn', onclick: () => { download(`skipper-${u.label.replace(/\s+/g, '-').toLowerCase()}-anki.txt`, ankiText(ids, `Skipper::${u.label}`), 'text/plain'); toast('Anki file downloaded'); } }, 'Download for Anki')),
    h('p', { class: 'muted small', style: { gridColumn: '1 / -1', margin: 0 } }, 'Neither Anki nor Quizlet can build a set from a web link, so the set travels as text: copy for Quizlet, a file for Anki.'));
}

/* ================================================================ unit test (mixed, typed) */
views.test = uid => {
  const u = UBY[uid]; if (!u) return shell('#/units', h('p', {}, 'Unknown unit'));
  const ids = u.entries.map(e => e.id);
  const sel = h('select', {}, [10, 20, ids.length].filter((v, i, a) => v <= ids.length && a.indexOf(v) === i).map(v => h('option', { value: v }, v === ids.length ? `All ${v} words` : v + ' questions')));
  const prev = S.tests[uid];
  return shell('#/units', h('section', { class: 'hero' },
    heroTitle('Unit test.'), h('p', { class: 'hero-sub' }, `${u.label}: ${u.title}. Definition → word, word → definition and typed gaps. No hints. Pass mark 85%.`),
    prev ? h('p', { class: 'muted', style: { marginTop: '14px' } }, `Best ${prev.best}% · last ${prev.last}% · ${prev.n} attempt${prev.n > 1 ? 's' : ''}`) : null,
    h('div', { class: 'hero-cta' }, sel, h('button', { class: 'btn lg', onclick: () => startTest(uid, +sel.value) }, 'Start the test'), h('button', { class: 'btn lg plain', onclick: () => go('#/unit/' + uid) }, 'Back to the unit'))));
};
function startTest(uid, n) {
  stopLive();
  const ids = sample(UBY[uid].entries.map(e => e.id), n);
  const qs = ids.map(id => ({ id, fmt: ['mcq-head', 'mcq-meaning', 'cloze', 'cloze', 'recall'][Math.floor(Math.random() * 5)] }));
  const F = sessionFrame(() => go('#/unit/' + uid));
  let i = 0, right = 0; const wrong = [];
  const step = () => {
    F.progress(i, qs.length);
    if (i >= qs.length) return finish();
    ask(F.stage, qs[i], { allowEasy: false, onExit: () => go('#/unit/' + uid) }, res => { if (res.result === 'ok') right++; else wrong.push(qs[i].id); i++; step(); });
  };
  const finish = () => {
    setKeys(null); clear(F.stage);
    const pct = Math.round(right / qs.length * 100), prev = S.tests[uid] || { best: 0, n: 0 };
    S.tests[uid] = { best: Math.max(prev.best, pct), last: pct, n: prev.n + 1, at: Date.now() };
    for (const { id } of wrong) { if (S.cards[id]) S.cards[id].due = Math.min(S.cards[id].due, nowD()); else gradeCard(id, 1); }
    save();
    F.stage.append(h('div', { class: 'q-card center' }, h('div', { class: 'big-emoji' }, pct >= 85 ? '🏆' : '📚'),
      h('h2', { class: 'h2' }, pct + '%'), h('p', { class: 'muted' }, `${right} of ${qs.length} right. ` + (pct >= 85 ? 'Passed — this unit is solid.' : 'Below 85%. The missed words go back into your reviews.')),
      h('div', { class: 'row', style: { justifyContent: 'center', marginTop: '16px' } }, h('button', { class: 'btn', onclick: () => startTest(uid, n) }, 'Retake'), h('button', { class: 'btn plain', onclick: () => go('#/unit/' + uid) }, 'Back to the unit'))),
      wrong.length ? h('div', { class: 'card', style: { marginTop: '22px' } }, h('h3', { class: 'h3', style: { fontSize: '21px', marginBottom: '10px' } }, 'Missed'), h('div', { class: 'tablewrap' }, wordTable(wrong))) : null);
  };
  step();
}

/* ================================================================ games */
const GAMES = [
  { id: 'match', name: 'Match Rush', icon: '🧩', tint: 'linear-gradient(135deg,#5e5ce6,#bf5af2)', desc: 'Pair each word with its definition. Three rounds against the clock.', min: 3, rec: 'time' },
  { id: 'meteor', name: 'Meteor Shower', icon: '☄️', tint: 'linear-gradient(135deg,#ff375f,#ff9f0a)', desc: 'Words fall from the sky. Catch the one that fits the definition before it lands.', min: 4, rec: 'score' },
  { id: 'speed', name: 'True or False', icon: '⚡', tint: 'linear-gradient(135deg,#ff9f0a,#ffd60a)', desc: 'Sixty seconds. Does this definition belong to this word? Arrow keys work too.', min: 4, rec: 'score' },
  { id: 'quiz', name: 'Quiz Show', icon: '🎤', tint: 'linear-gradient(135deg,#0a84ff,#64d2ff)', desc: 'Ten questions, fifteen seconds each, one 50:50 lifeline. Faster answers score more.', min: 4, rec: 'score' },
  { id: 'test', name: 'Classic Test', icon: '📝', tint: 'linear-gradient(135deg,#30d158,#66d4cf)', desc: 'Calm multiple choice with five options, no timer and a full review at the end.', min: 4, rec: 'pct' },
  { id: 'memory', name: 'Memory Pairs', icon: '🃏', tint: 'linear-gradient(135deg,#bf5af2,#ff375f)', desc: 'Flip the cards and find each word with its definition.', min: 3, rec: 'time' },
  { id: 'scramble', name: 'Word Builder', icon: '🔤', tint: 'linear-gradient(135deg,#64d2ff,#5e5ce6)', desc: 'Read the definition and rebuild the missing word from scrambled letters.', min: 2, rec: 'score' },
  { id: 'context', name: 'Context Clue', icon: '🔎', tint: 'linear-gradient(135deg,#ffd60a,#30d158)', desc: 'Read a real sentence with a gap and choose the word that fits.', min: 4, rec: 'score' },
  { id: 'gap', name: 'Gap Hunter', icon: '✍️', tint: 'linear-gradient(135deg,#ff453a,#bf5af2)', desc: 'Type the missing word. Three lives. Build the longest streak.', min: 2, rec: 'score' },
];
const GBY = Object.fromEntries(GAMES.map(g => [g.id, g]));
const recKey = (gid, units) => gid + ':' + units.join(',');
function recordText(g, units) {
  const r = S.games[recKey(g.id, units)];
  if (r == null) return '';
  return 'Best ' + (g.rec === 'time' ? r.toFixed(1) + ' s' : g.rec === 'pct' ? r + '%' : r);
}
function saveRecord(g, units, val) {
  const k = recKey(g.id, units), prev = S.games[k];
  const better = prev == null || (g.rec === 'time' ? val < prev : val > prev);
  if (better) { S.games[k] = val; save(); }
  return { better, best: better ? val : prev };
}
function gameTiles(units, back) {
  return h('div', { class: 'game-tiles' }, GAMES.map(g => h('button', { class: 'game-tile reveal', style: { '--tint': g.tint }, onclick: () => go(`#/play/${g.id}/${units.join(',')}?back=${encodeURIComponent(back)}`) },
    h('span', { class: 'gi', 'aria-hidden': 'true' }, g.icon), h('span', { class: 'rec' }, recordText(g, units)), h('h3', {}, g.name), h('p', {}, g.desc))));
}
views.games = () => {
  if (!Array.isArray(S.gameUnits)) { const st = startedUnits(); S.gameUnits = st.length ? st.slice(0, 12) : [queue()[0]]; }
  const sel = new Set(S.gameUnits.filter(x => UBY[x]));
  const tilesHost = h('div');
  const summary = h('p', { class: 'lead muted' });
  const drawTiles = () => {
    S.gameUnits = UNITS.map(u => u.id).filter(id => sel.has(id)); save();
    clear(tilesHost);
    const n = S.gameUnits.reduce((a, id) => a + UBY[id].entries.length, 0);
    summary.textContent = sel.size ? `${sel.size} unit${sel.size > 1 ? 's' : ''} selected · ${n} words in play.` : 'Choose at least one unit.';
    if (sel.size) { tilesHost.append(gameTiles(S.gameUnits, '#/games')); revealOnScroll(); }
  };
  const pickers = PARTS.map(p => {
    const chips = h('div', { class: 'chips' });
    const drawChips = () => { clear(chips); p.units.forEach(id => chips.append(h('button', { class: 'chip' + (sel.has(id) ? ' on' : ''), title: UBY[id].title, onclick: () => { sel.has(id) ? sel.delete(id) : sel.add(id); drawChips(); drawTiles(); } }, id))); };
    drawChips();
    return h('details', { class: 'partpick', open: p.units.some(id => sel.has(id)) || null }, h('summary', {}, h('span', {}, p.name.split(' (')[0]), h('span', { class: 'muted small' }, `units ${p.units[0]}–${p.units[p.units.length - 1]}`)), chips);
  });
  const quick = (label, fn) => h('button', { class: 'btn sm plain', onclick: () => { S.gameUnits = fn(); save(); render(); } }, label);
  const page = shell('#/games',
    h('section', { class: 'section', style: { paddingTop: '88px' } }, h('div', { class: 'container' },
      h('div', { class: 'center' }, heroTitle('Play.'), h('p', { class: 'hero-sub' }, 'Nine games. Pick the units, and every game uses only their words.')),
      h('div', { class: 'card', style: { margin: '44px 0 34px', background: 'var(--bg2)' } },
        h('div', { class: 'row', style: { marginBottom: '8px' } }, h('h3', { class: 'grow', style: { fontSize: '21px' } }, 'Units in play'),
          quick('Units I’ve started', () => startedUnits().length ? startedUnits() : [queue()[0]]), quick('Clear', () => [])),
        summary, pickers),
      tilesHost)));
  drawTiles();
  return page;
};
function poolFor(units) { return units.flatMap(id => (UBY[id] ? UBY[id].entries : [])).map(e => e.id).filter(id => E(id).meaning && E(id).kind !== 'pattern'); }
function unitsLabel(units) { return units.length === 1 ? `${UBY[units[0]].label}: ${UBY[units[0]].title}` : units.length <= 4 ? 'Units ' + units.join(', ') : `${units.length} units`; }
function gameFrame(g, units, back, hud) {
  const body = h('div', { class: 'game-body' });
  const exit = () => { stopLive(); setKeys(null); go(back); };
  const page = h('div', { class: 'game-page' },
    h('div', { class: 'game-top' }, h('div', { class: 'game-top-in' },
      h('button', { class: 'xbtn', title: 'Exit game (Esc)', 'aria-label': 'Exit game', onclick: exit }, '✕'),
      h('div', { class: 'game-title' }, g.icon + ' ' + g.name, h('small', {}, unitsLabel(units))), hud || null)),
    body);
  return { page, body, exit };
}
function gameEnd(F, g, units, big, sub, recVal, again) {
  stopLive();
  const r = recVal == null ? null : saveRecord(g, units, recVal);
  setKeys(ev => { if (ev.key === 'Escape') F.exit(); else if (ev.key === 'Enter') again(); });
  clear(F.body).append(h('div', { class: 'q-card center' },
    h('div', { class: 'big-emoji' }, r && r.better ? '🏆' : g.icon),
    h('h2', { class: 'h2' }, big), h('p', { class: 'muted' }, sub + (r ? (r.better ? ' New record.' : ` Record: ${g.rec === 'time' ? r.best.toFixed(1) + ' s' : g.rec === 'pct' ? r.best + '%' : r.best}.`) : '')),
    h('div', { class: 'row', style: { justifyContent: 'center', marginTop: '18px' } }, h('button', { class: 'btn', onclick: again }, 'Play again'), h('button', { class: 'btn plain', onclick: F.exit }, 'Back to games'))));
}
views.play = (gid, unitStr, back) => {
  const g = GBY[gid]; const units = (unitStr || '').split(',').filter(x => UBY[x]);
  back = back || '#/games';
  if (!g || !units.length) return shell('#/games', h('section', { class: 'hero' }, h('h1', { class: 'h2' }, 'Choose a game and a unit first.'), h('p', {}, h('a', { href: '#/games' }, 'Go to games'))));
  const pool = poolFor(units);
  if (pool.length < g.min) return shell('#/games', h('section', { class: 'hero' }, h('h1', { class: 'h2' }, 'Not enough words here.'), h('p', { class: 'hero-sub' }, `${g.name} needs at least ${g.min} words. Add more units.`), h('div', { class: 'hero-cta' }, h('a', { class: 'btn', href: '#/games' }, 'Choose units'))));
  return GAME_IMPL[gid](g, units, pool, back);
};
const again = () => render();
const GAME_IMPL = {};

GAME_IMPL.match = (g, units, pool, back) => {
  const timerEl = h('b', {}, '0.0'), roundEl = h('span', {}, '');
  const F = gameFrame(g, units, back, h('div', { class: 'hud' }, roundEl, timerEl));
  const per = Math.min(6, pool.length), rounds = Math.max(1, Math.min(3, Math.floor(pool.length / per)));
  const ids = sample(pool, per * rounds);
  let round = 0, penalty = 0; const t0 = Date.now(); const wrongPairs = [], seenPairs = new Set();
  const note = h('div', { class: 'match-note' });
  every(() => { timerEl.textContent = ((Date.now() - t0) / 1000 + penalty).toFixed(1); }, 100);
  const draw = () => {
    clear(F.body); roundEl.textContent = `Round ${round + 1} of ${rounds}`;
    const set = ids.slice(round * per, round * per + per);
    let selW = null, selM = null, left = set.length;
    const wc = h('div', { class: 'col' }), mc = h('div', { class: 'col' });
    const wTiles = shuffle(set).map(id => { const b = h('button', { class: 'tile', onclick: () => pick('w', id, b) }, E(id).head); b.dataset.id = id; return b; });
    const mTiles = shuffle(set).map(id => { const b = h('button', { class: 'tile', onclick: () => pick('m', id, b) }, clip(quizDef(id), 110)); b.dataset.id = id; return b; });
    wc.append(...wTiles); mc.append(...mTiles);
    const pick = (side, id, b) => {
      if (side === 'w') { wTiles.forEach(x => x.classList.remove('sel')); selW = { id, b }; b.classList.add('sel'); } else { mTiles.forEach(x => x.classList.remove('sel')); selM = { id, b }; b.classList.add('sel'); }
      if (selW && selM) {
        if (selW.id === selM.id) { selW.b.classList.add('done'); selM.b.classList.add('done'); left--; selW = selM = null; if (!left) { round++; if (round >= rounds) end(); else later(draw, 350); } }
        else { const a = selW.b, c = selM.b; a.classList.add('bad'); c.classList.add('bad'); penalty += 3;
          note.replaceChildren(h('b', {}, '✗ Not a match. '), '“' + E(selW.id).head + '” means: ' + quizDef(selW.id));
          const key = selW.id + '|' + selM.id; if (!seenPairs.has(key)) { seenPairs.add(key); wrongPairs.push({ id: selW.id, q: E(selW.id).head, yours: clip(quizDef(selM.id), 200), right: quizDef(selW.id), noMeaning: true }); } later(() => { a.classList.remove('bad', 'sel'); c.classList.remove('bad', 'sel'); }, 320); selW = selM = null; }
      }
    };
    F.body.append(h('p', { class: 'muted center', style: { marginTop: 0 } }, 'Tap a word, then its definition. A wrong pair adds 3 seconds.'), h('div', { class: 'match' }, wc, mc), note);
  };
  const end = () => { const t = Math.round(((Date.now() - t0) / 1000 + penalty) * 10) / 10; gameEnd(F, g, units, t.toFixed(1) + ' s', `${ids.length} pairs matched.`, t, again); F.body.append(mistakesCard(wrongPairs)); };
  setKeys(ev => { if (ev.key === 'Escape') F.exit(); });
  draw();
  return F.page;
};

GAME_IMPL.meteor = (g, units, pool, back) => {
  const scoreEl = h('b', {}, '0'), livesEl = h('span', {}, '♥♥♥');
  const F = gameFrame(g, units, back, h('div', { class: 'hud' }, livesEl, scoreEl));
  const sky = h('div', { class: 'sky' }), clue = h('div', { class: 'clue' }), ground = h('div', { class: 'ground' });
  sky.append(clue, ground);
  F.body.append(h('p', { class: 'muted center', style: { marginTop: 0 } }, 'Catch the word that matches the definition before it hits the ground.'), sky);
  let score = 0, lives = 3, speed = 34, streakN = 0, rounds = 0, bubbles = [], target = null, last = 0, busy = false; const wrongM = [];
  const myToken = LIVE.token;
  const setLives = () => { livesEl.textContent = '♥'.repeat(Math.max(0, lives)) + '♡'.repeat(Math.max(0, 3 - lives)); };
  const spawn = () => {
    bubbles.forEach(b => b.el.remove()); bubbles = []; busy = false;
    target = pool[Math.floor(Math.random() * pool.length)];
    const opts = shuffle([target].concat(distractors(target, 'head', Math.min(3, pool.length - 1), pool)));
    clue.textContent = clip(quizDef(target), 140);
    const narrow = sky.clientWidth < 600;
    const lanes = narrow ? [27, 73, 27, 73] : shuffle([14, 38, 62, 86]);
    const top0 = clue.offsetHeight + 8;
    const order = shuffle(opts);
    order.forEach((id, i) => {
      const el = h('button', { class: 'meteor', style: { left: lanes[i] + '%', top: '0px', maxWidth: narrow ? '44%' : '23%' } }, E(id).head);
      const b = { id, el, y: narrow ? top0 - Math.floor(i / 2) * 70 - (i % 2) * 30 : top0 - Math.random() * 60, v: speed * (narrow ? 1 : 0.85 + Math.random() * 0.4) };
      el.onclick = () => hit(b);
      sky.append(el); bubbles.push(b);
    });
  };
  const hit = b => {
    if (busy) return;
    if (b.id === target) { busy = true; streakN++; score += 10 + Math.min(20, streakN * 2); scoreEl.textContent = score; b.el.classList.add('hit'); speed += 3; rounds++; later(spawn, 380); }
    else { b.el.classList.add('miss'); streakN = 0; lives--; setLives(); b.el.disabled = true; wrongM.push({ id: target, q: quizDef(target), yours: E(b.id).head, right: E(target).head, noMeaning: true }); if (lives <= 0) end(); }
  };
  const step = t => {
    if (LIVE.token !== myToken) return;
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 0; last = t;
    const H = sky.clientHeight - 46;
    for (const b of bubbles) { b.y += b.v * dt; b.el.style.top = b.y + 'px'; }
    const tb = bubbles.find(b => b.id === target);
    if (!busy && tb && tb.y > H) { busy = true; tb.el.classList.add('miss'); streakN = 0; lives--; setLives(); wrongM.push({ id: target, q: quizDef(target), yours: null, right: E(target).head, noans: 'it hit the ground', noMeaning: true }); if (lives <= 0) return end(); later(spawn, 500); }
    LIVE.rafs.add(requestAnimationFrame(step));
  };
  const end = () => { gameEnd(F, g, units, score + ' points', `${rounds} words caught.`, score, again); F.body.append(mistakesCard(wrongM)); };
  setKeys(ev => { if (ev.key === 'Escape') F.exit(); });
  later(() => { spawn(); LIVE.rafs.add(requestAnimationFrame(step)); }, 300);
  return F.page;
};

GAME_IMPL.speed = (g, units, pool, back) => {
  const scoreEl = h('b', {}, '0'), timerEl = h('span', {}, '60 s');
  const F = gameFrame(g, units, back, h('div', { class: 'hud' }, timerEl, scoreEl));
  let score = 0, st = 0, time = 60, q = null, n = 0; const wrongS = [];
  const host = h('div', { class: 'q-card center' }); F.body.append(host);
  const nextQ = () => {
    const id = pool[Math.floor(Math.random() * pool.length)];
    const truth = Math.random() < 0.5; const other = truth ? id : distractors(id, 'meaning', 1, pool)[0] || id;
    q = { id, other, truth: truth || other === id };
    clear(host).append(h('div', { class: 'prompt head', style: { marginBottom: '10px' } }, E(id).head), h('div', { class: 'wc-meaning', style: { minHeight: '64px' } }, clip(quizDef(other), 170)),
      h('div', { class: 'tf' }, h('button', { class: 'f', onclick: () => ans(false) }, '← False'), h('button', { class: 't', onclick: () => ans(true) }, 'True →')));
  };
  const ans = v => { n++; if (v === q.truth) { st++; score += 1 + Math.floor(st / 5); } else { st = 0; score = Math.max(0, score - 1); if (wrongS.length < 40) wrongS.push({ id: q.id, q: h('span', {}, h('b', {}, E(q.id).head), ' = ' + clip(quizDef(q.other), 170)), yours: v ? 'True' : 'False', right: q.truth ? 'True — this is the right definition' : 'False — it means: ' + quizDef(q.id), noMeaning: true }); } scoreEl.textContent = score; nextQ(); };
  const end = () => { gameEnd(F, g, units, score + ' points', `${n} answers in 60 seconds.`, score, again); F.body.append(mistakesCard(wrongS)); };
  every(() => { time--; timerEl.textContent = time + ' s'; if (time <= 0) end(); }, 1000);
  setKeys(ev => { if (ev.key === 'Escape') return F.exit(); if (!q || time <= 0) return; if (ev.key === 'ArrowRight') ans(true); else if (ev.key === 'ArrowLeft') ans(false); });
  nextQ();
  return F.page;
};

function mistakeItem(id, dir, oid, cz) {
  const label = x => dir === 'head' ? E(x).head : quizDef(x);
  const ex = (allExamples(id) || [])[0];
  return { id, q: cz ? h('span', {}, sentenceNodes(cz, 'filled')) : (dir === 'head' ? quizDef(id) : E(id).head), yours: oid ? (cz ? E(oid).head : label(oid)) : null, right: cz ? E(id).head : label(id), meaning: cz ? true : null, noMeaning: !cz, ex: cz ? null : ex };
}
function mistakesCard(list, title) {
  if (!list.length) return h('div', { class: 'q-card center review', style: { marginTop: '22px' } }, h('b', {}, 'No mistakes this round 🎉'));
  return h('div', { class: 'q-card review', style: { marginTop: '22px' } }, h('h3', { style: { marginBottom: '6px' } }, `${title || 'Review your mistakes'} (${list.length})`),
    list.map(m => h('div', { class: 'rv' },
      h('div', { class: 'rv-q' }, m.q), m.tag ? h('div', { class: 'rv-tag' }, m.tag) : null,
      h('div', { class: 'rv-a no' }, h('span', {}, 'You chose'), m.yours || (m.noans || 'no answer (time ran out)')),
      h('div', { class: 'rv-a ok' }, h('span', {}, 'Correct'), m.right),
      m.meaning !== null && m.meaning !== undefined ? h('div', { class: 'rv-n' }, E(m.id).head + ' — ' + (m.meaning === true ? E(m.id).meaning : m.meaning)) : (m.noMeaning ? null : (m.meaningAuto === false ? null : h('div', { class: 'rv-n' }, E(m.id).head + ' — ' + E(m.id).meaning))),
      m.ex ? h('div', { class: 'rv-n' }, '“' + m.ex + '”') : null)));
}

GAME_IMPL.quiz = (g, units, pool, back) => {
  const scoreEl = h('b', {}, '0'), qEl = h('span', {}, '');
  const F = gameFrame(g, units, back, h('div', { class: 'hud' }, qEl, scoreEl));
  const N = Math.min(10, pool.length), ids = sample(pool, N), LIMIT = 15;
  let i = 0, score = 0, right = 0, fifty = true; const wrong = [];
  const nextQ = () => {
    if (i >= N) { gameEnd(F, g, units, score.toLocaleString('en-GB') + ' points', `${right} of ${N} right.`, score, again); F.body.append(mistakesCard(wrong)); return; }
    qEl.textContent = `Question ${i + 1} of ${N}`;
    const id = ids[i]; const dir = Math.random() < 0.7 ? 'head' : 'meaning';
    const opts = shuffle([id].concat(distractors(id, dir, 3, pool)));
    const bar = h('i', { style: { width: '100%' } });
    let answered = false; const t0 = Date.now();
    const box = h('div', { class: 'opts' });
    const lifeline = h('button', { class: 'btn sm plain', disabled: !fifty, onclick: () => { if (!fifty || answered) return; fifty = false; lifeline.disabled = true; shuffle([...box.children].filter(b => b.dataset.id !== id)).slice(0, 2).forEach(b => b.classList.add('gone')); } }, '50:50');
    const pick = (oid, btn) => {
      if (answered) return; answered = true; stopLive();
      if (btn) btn.classList.add('sel');
      [...box.children].forEach(b => { b.disabled = true; if (b.dataset.id === id) b.classList.add('right'); });
      if (oid !== id) wrong.push(mistakeItem(id, dir, oid));
      if (oid === id) { right++; const rem = Math.max(0, LIMIT - (Date.now() - t0) / 1000); score += 500 + Math.round(500 * rem / LIMIT); scoreEl.textContent = score.toLocaleString('en-GB'); }
      else if (btn) btn.classList.add('wrong');
      later(() => { i++; nextQ(); }, oid === id ? 800 : 1700);
    };
    opts.forEach((oid, k) => { const b = h('button', { class: 'opt', onclick: () => pick(oid, b) }, h('kbd', {}, k + 1), h('span', {}, dir === 'head' ? E(oid).head : clip(quizDef(oid), 150))); b.dataset.id = oid; box.append(b); });
    clear(F.body).append(h('div', { class: 'q-card' }, h('div', { class: 'timer-bar' }, bar),
      h('div', { class: 'fmt' }, dir === 'head' ? 'Which word fits this definition?' : 'What does it mean?'),
      h('div', { class: dir === 'head' ? 'prompt' : 'prompt head' }, dir === 'head' ? quizDef(id) : E(id).head), box,
      h('div', { class: 'row', style: { marginTop: '16px' } }, lifeline, h('span', { class: 'muted small' }, 'Faster answers score more. One 50:50 per game.'))));
    every(() => { const el = (Date.now() - t0) / 1000; bar.style.width = Math.max(0, 100 - el / LIMIT * 100) + '%'; if (el >= LIMIT && !answered) pick(null, null); }, 100);
    setKeys(ev => { if (ev.key === 'Escape') return F.exit(); const n = parseInt(ev.key, 10); if (n >= 1 && n <= opts.length) { const b = box.children[n - 1]; if (!b.classList.contains('gone')) pick(b.dataset.id, b); } });
  };
  nextQ();
  return F.page;
};

GAME_IMPL.test = (g, units, pool, back) => {
  const qEl = h('span', {}, '');
  const F = gameFrame(g, units, back, h('div', { class: 'hud' }, qEl));
  const start = N => {
    const ids = sample(pool, N); let i = 0, right = 0; const wrong = [];
    const nextQ = () => {
      if (i >= N) {
        const pct = Math.round(right / N * 100);
        for (const id of wrong) { if (S.cards[id]) S.cards[id].due = Math.min(S.cards[id].due, nowD()); }
        save();
        gameEnd(F, g, units, pct + '%', `${right} of ${N} right.`, pct, () => render());
        F.body.append(mistakesCard(wrong.map(w => mistakeItem(w.id, w.dir, w.oid))));
        return;
      }
      qEl.textContent = `Question ${i + 1} of ${N}`;
      const id = ids[i]; const dir = Math.random() < 0.6 ? 'head' : 'meaning';
      const opts = shuffle([id].concat(distractors(id, dir, Math.min(4, pool.length - 1), pool)));
      let answered = false;
      const box = h('div', { class: 'opts' });
      const nextBtn = h('button', { class: 'btn', style: { marginTop: '18px', visibility: 'hidden' }, onclick: () => { i++; nextQ(); } }, 'Next question');
      const pick = (oid, btn) => {
        if (answered) return; answered = true;
        [...box.children].forEach(b => { b.disabled = true; if (b.dataset.id === id) b.classList.add('right'); });
        btn.classList.add('sel');
        if (oid === id) right++; else { btn.classList.add('wrong'); wrong.push({ id, dir, oid }); }
        nextBtn.style.visibility = 'visible'; nextBtn.focus();
      };
      opts.forEach((oid, k) => { const b = h('button', { class: 'opt', onclick: () => pick(oid, b) }, h('kbd', {}, String.fromCharCode(65 + k)), h('span', {}, dir === 'head' ? E(oid).head : clip(quizDef(oid), 150))); b.dataset.id = oid; box.append(b); });
      clear(F.body).append(h('div', { class: 'q-card' }, h('div', { class: 'fmt' }, dir === 'head' ? 'Choose the word that fits the definition.' : 'Choose the correct definition.'),
        h('div', { class: dir === 'head' ? 'prompt' : 'prompt head' }, dir === 'head' ? quizDef(id) : E(id).head), box, nextBtn));
      setKeys(ev => {
        if (ev.key === 'Escape') return F.exit();
        if (answered && ev.key === 'Enter') { ev.preventDefault(); i++; return nextQ(); }
        const k = ev.key.toUpperCase().charCodeAt(0) - 65; if (ev.key.length === 1 && k >= 0 && k < opts.length) { const b = box.children[k]; pick(b.dataset.id, b); }
      });
    };
    nextQ();
  };
  const sizes = [10, 20, pool.length].filter((v, i, a) => v <= pool.length && a.indexOf(v) === i);
  F.body.append(h('div', { class: 'q-card center' }, h('div', { class: 'big-emoji' }, g.icon), h('h2', { class: 'h2' }, 'Classic Test'), h('p', { class: 'muted' }, 'Five options per question, no timer. How many questions?'),
    h('div', { class: 'row', style: { justifyContent: 'center', marginTop: '18px' } }, sizes.map(s => h('button', { class: 'btn', onclick: () => start(s) }, s === pool.length ? `All ${s}` : `${s} questions`)))));
  setKeys(ev => { if (ev.key === 'Escape') F.exit(); });
  return F.page;
};

GAME_IMPL.memory = (g, units, pool, back) => {
  const movesEl = h('span', {}, '0 moves'), timerEl = h('b', {}, '0.0');
  const F = gameFrame(g, units, back, h('div', { class: 'hud' }, movesEl, timerEl));
  const pairs = sample(pool, Math.min(6, pool.length)); const t0 = Date.now();
  every(() => { timerEl.textContent = ((Date.now() - t0) / 1000).toFixed(1); }, 100);
  const cards = shuffle(pairs.flatMap(id => [{ id, side: 'w' }, { id, side: 'm' }]));
  let open = [], moves = 0, found = 0, lock = false;
  const grid = h('div', { class: 'mem' });
  cards.forEach(c => {
    const el = h('button', { class: 'mcard', 'aria-label': 'Card' }, h('div', { class: 'face front' }, '?'), h('div', { class: 'face back' + (c.side === 'w' ? ' hw' : '') }, c.side === 'w' ? E(c.id).head : clip(quizDef(c.id), 90)));
    c.el = el;
    el.onclick = () => {
      if (lock || el.classList.contains('flip')) return;
      el.classList.add('flip'); open.push(c);
      if (open.length === 2) {
        moves++; movesEl.textContent = moves + ' moves';
        const [a, b] = open; open = [];
        if (a.id === b.id && a.side !== b.side) { a.el.classList.add('matched'); b.el.classList.add('matched'); found++; if (found === pairs.length) later(() => { const t = Math.round((Date.now() - t0) / 100) / 10; gameEnd(F, g, units, t.toFixed(1) + ' s', `${pairs.length} pairs in ${moves} moves.`, t, again); }, 500); }
        else { lock = true; later(() => { a.el.classList.remove('flip'); b.el.classList.remove('flip'); lock = false; }, 950); }
      }
    };
    grid.append(el);
  });
  F.body.append(h('p', { class: 'muted center', style: { marginTop: 0 } }, 'Find each word and its definition.'), grid);
  setKeys(ev => { if (ev.key === 'Escape') F.exit(); });
  return F.page;
};

GAME_IMPL.scramble = (g, units, pool, back) => {
  const scoreEl = h('b', {}, '0'), qEl = h('span', {}, '');
  const F = gameFrame(g, units, back, h('div', { class: 'hud' }, qEl, scoreEl));
  const keyWord = id => {
    const v = headVariants(E(id).head)[0] || [];
    const cands = v.filter(w => /^[a-z]+$/.test(w) && w.length >= 3 && w.length <= 13);
    return cands.sort((a, b) => b.length - a.length)[0] || null;
  };
  const items = shuffle(pool.filter(id => keyWord(id))).slice(0, 8);
  let i = 0, score = 0, solved = 0; const wrongW = [];
  const nextQ = () => {
    if (i >= items.length) { gameEnd(F, g, units, score + ' points', `${solved} of ${items.length} words built.`, score, again); F.body.append(mistakesCard(wrongW)); return; }
    qEl.textContent = `Word ${i + 1} of ${items.length}`;
    const id = items[i], word = keyWord(id), letters = shuffle(word.split(''));
    let built = [], hints = 0, done = false; const tries = []; const logW = gaveUp => { if (gaveUp || hints || tries.length) wrongW.push({ id, q: quizDef(id), yours: tries.length ? tries.join(', ') : gaveUp ? 'showed the answer' : 'used hints', right: E(id).head, noMeaning: true }); };
    const phrase = E(id).head.replace(new RegExp('\\b' + word + '\\b', 'i'), '_'.repeat(word.length).split('').join(' '));
    const slots = h('div', { class: 'slots' }), tray = h('div', { class: 'letters' });
    const msg = h('div', { class: 'center muted', style: { minHeight: '24px' } });
    const draw = () => {
      clear(slots); for (let k = 0; k < word.length; k++) slots.append(h('div', { class: 'slot' + (built[k] ? ' f' : '') }, built[k] ? built[k].ch : ''));
      clear(tray); letters.forEach((ch, k) => { const used = built.some(b => b.k === k); tray.append(h('button', { class: 'letter' + (used ? ' used' : ''), onclick: () => add(k) }, ch)); });
    };
    const add = k => { if (done || built.length >= word.length) return; built.push({ ch: letters[k], k }); draw(); if (built.length === word.length) check(); };
    const undo = () => { if (done) return; built.pop(); draw(); msg.textContent = ''; };
    const check = () => {
      const w = built.map(b => b.ch).join('');
      if (w === word) { done = true; solved++; logW(false); score += Math.max(2, 10 - hints * 3); scoreEl.textContent = score; msg.textContent = 'Correct!'; msg.style.color = '#30d158'; later(() => { i++; nextQ(); }, 900); }
      else { tries.push(w); msg.textContent = 'Not this order — tap ⌫ and try again.'; msg.style.color = '#ff453a'; }
    };
    const hint = () => { if (done) return; hints++; built = []; const used = new Set(); for (let p = 0; p <= Math.min(hints, word.length - 1) - 1 + 1 && p < word.length; p++) { const k = letters.findIndex((c, idx) => c === word[p] && !used.has(idx)); used.add(k); built.push({ ch: word[p], k }); } draw(); if (built.length === word.length) check(); };
    const reveal = () => { if (done) return; done = true; logW(true); built = word.split('').map((ch, p) => ({ ch, k: -1 - p })); draw(); msg.textContent = 'The word was “' + word + '”.'; msg.style.color = ''; later(() => { i++; nextQ(); }, 1500); };
    clear(F.body).append(h('div', { class: 'q-card' }, h('div', { class: 'fmt' }, 'Definition'), h('div', { class: 'prompt' }, quizDef(id)),
      h('div', { class: 'phrase' }, phrase), slots, tray, msg,
      h('div', { class: 'row', style: { justifyContent: 'center', marginTop: '18px' } }, h('button', { class: 'btn plain', onclick: undo }, '⌫ Undo'), h('button', { class: 'btn plain', onclick: hint }, 'Hint'), h('button', { class: 'btn plain', onclick: reveal }, 'Show answer'))));
    draw();
    setKeys(ev => {
      if (ev.key === 'Escape') return F.exit();
      if (ev.key === 'Backspace') { ev.preventDefault(); return undo(); }
      if (/^[a-z]$/i.test(ev.key)) { const k = letters.findIndex((c, idx) => c === ev.key.toLowerCase() && !built.some(b => b.k === idx)); if (k >= 0) add(k); }
    });
  };
  if (!items.length) { F.body.append(h('div', { class: 'q-card center' }, h('p', {}, 'These units have no single words to build. Try another game.'))); return F.page; }
  nextQ();
  return F.page;
};

GAME_IMPL.context = (g, units, pool, back) => {
  const scoreEl = h('b', {}, '0'), qEl = h('span', {}, '');
  const F = gameFrame(g, units, back, h('div', { class: 'hud' }, qEl, scoreEl));
  const items = shuffle(pool.filter(id => makeCloze(id))).slice(0, 10);
  if (items.length < 2) { F.body.append(h('div', { class: 'q-card center' }, h('p', {}, 'Not enough example sentences in these units. Add more units.'))); return F.page; }
  let i = 0, score = 0, right = 0, st = 0; const wrong = [];
  const nextQ = () => {
    if (i >= items.length) { gameEnd(F, g, units, score + ' points', `${right} of ${items.length} right.`, score, again); F.body.append(mistakesCard(wrong)); return; }
    qEl.textContent = `Sentence ${i + 1} of ${items.length}`;
    const id = items[i], cz = makeCloze(id, true);
    const opts = shuffle([id].concat(distractors(id, 'head', 3, pool)));
    const box = h('div', { class: 'opts' }); let answered = false;
    const pick = (oid, btn) => {
      if (answered) return; answered = true;
      btn.classList.add('sel');
      [...box.children].forEach(b => { b.disabled = true; if (b.dataset.id === id) b.classList.add('right'); });
      if (oid !== id) wrong.push(mistakeItem(id, 'head', oid, cz));
      if (oid === id) { right++; st++; score += 10 + Math.min(10, st * 2); scoreEl.textContent = score; } else { st = 0; btn.classList.add('wrong'); }
      sentence.replaceChildren(...sentenceNodes(cz, 'filled'));
      later(() => { i++; nextQ(); }, oid === id ? 1000 : 1900);
    };
    opts.forEach((oid, k) => { const b = h('button', { class: 'opt', onclick: () => pick(oid, b) }, h('kbd', {}, k + 1), h('span', {}, E(oid).head)); b.dataset.id = oid; box.append(b); });
    const sentence = h('div', { class: 'prompt' }, sentenceNodes(cz, 'blank'));
    clear(F.body).append(h('div', { class: 'q-card' }, h('div', { class: 'fmt' }, 'Which word or phrase completes the sentence?'), sentence, box));
    setKeys(ev => { if (ev.key === 'Escape') return F.exit(); const n = parseInt(ev.key, 10); if (n >= 1 && n <= opts.length) { const b = box.children[n - 1]; pick(b.dataset.id, b); } });
  };
  nextQ();
  return F.page;
};

GAME_IMPL.gap = (g, units, pool, back) => {
  const livesEl = h('span', {}, '♥♥♥'), stEl = h('b', {}, '0');
  const F = gameFrame(g, units, back, h('div', { class: 'hud' }, livesEl, stEl));
  const order = shuffle(pool.filter(id => makeCloze(id)));
  if (order.length < 2) { F.body.append(h('div', { class: 'q-card center' }, h('p', {}, 'Not enough example sentences in these units. Add more units.'))); return F.page; }
  let lives = 3, st = 0, best = 0, i = 0; const wrongG = [];
  const nextQ = () => {
    if (lives <= 0 || i >= order.length) { gameEnd(F, g, units, 'Streak ' + best, `${i} sentences played.`, best, again); F.body.append(mistakesCard(wrongG)); return; }
    ask(F.body, { id: order[i++], fmt: 'cloze' }, { allowEasy: false, onExit: F.exit }, res => {
      const gid = order[i - 1]; if (res.result === 'ok' || res.result === 'close') { st++; best = Math.max(best, st); if (res.result === 'close') { const cz = makeCloze(gid); wrongG.push({ id: gid, q: cz ? h('span', {}, sentenceNodes(cz, 'filled')) : quizDef(gid), yours: res.typed, tag: 'Spelling only — counted as half correct', right: cz ? cz.answer : E(gid).head }); } } else { st = 0; lives--; const cz = makeCloze(gid); wrongG.push({ id: gid, q: cz ? h('span', {}, sentenceNodes(cz, 'blank')) : quizDef(gid), yours: res.typed || null, right: cz ? cz.answer : E(gid).head, meaning: true }); }
      livesEl.textContent = '♥'.repeat(Math.max(0, lives)) + '♡'.repeat(3 - Math.max(0, lives)); stEl.textContent = st; nextQ();
    });
  };
  later(nextQ, 0);
  return F.page;
};

/* ================================================================ Plan */
const SIM = n => 80 + 7 * n;
/* ================================================================ CPE: Reading and Use of English, Parts 1-4 */
const CPE_PARTS = [
  { n: 1, name: 'Multiple-choice cloze', items: 8, marks: 1, hint: 'Choose the word or phrase that best fits each gap.' },
  { n: 2, name: 'Open cloze', items: 8, marks: 1, hint: 'Write one word in each gap.' },
  { n: 3, name: 'Word formation', items: 8, marks: 1, hint: 'Use the word in capitals to form a word that fits the gap.' },
  { n: 4, name: 'Key word transformations', items: 6, marks: 2, hint: 'Complete the second sentence so that it means the same as the first. Use the word given and do not change it. Write between three and eight words, including the word given.' },
];
const CPE_MAX = CPE_PARTS.reduce((a, p) => a + p.items * p.marks, 0);
const FUNC_WORDS = new Set('up down out off on in into onto over through by for with at about from of under behind away back round around across apart along against upon as than such so no nothing whose which though however unless whether neither nor either without within beyond towards'.split(' '));
let CPEX = null; /* the exam in progress */
function parseUnits(str) {
  const out = []; const ids = UNITS.map(u => u.id);
  for (const raw of String(str || '').split(/[,;\s]+/)) {
    const t = raw.trim().toLowerCase(); if (!t) continue;
    const m = t.match(/^(\d+[ab]?)\s*[-–]\s*(\d+[ab]?)$/);
    if (m) { let a = ids.indexOf(m[1]), b = ids.indexOf(m[2]); if (a < 0) a = ids.findIndex(x => parseInt(x) >= parseInt(m[1])); if (b < 0) { const k = ids.map(x => parseInt(x)).lastIndexOf(parseInt(m[2])); b = k >= 0 ? k : ids.length - 1; } if (a >= 0 && b >= a) ids.slice(a, b + 1).forEach(x => out.push(x)); }
    else if (ids.includes(t)) out.push(t);
    else if (/^\d+$/.test(t)) ids.filter(x => parseInt(x) === +t).forEach(x => out.push(x));
  }
  return [...new Set(out)];
}
function unitsToText(list) {
  const ids = UNITS.map(u => u.id), idx = list.map(x => ids.indexOf(x)).filter(i => i >= 0).sort((a, b) => a - b);
  const runs = []; for (const i of idx) { const r = runs[runs.length - 1]; if (r && i === r[1] + 1) r[1] = i; else runs.push([i, i]); }
  return runs.map(([a, b]) => a === b ? ids[a] : ids[a] + '–' + ids[b]).join(', ');
}
const cpeNorm = s => ' ' + String(s).toLowerCase().replace(/[’‘`]/g, "'").replace(/£/g, ' ').replace(/can't|cannot/g, 'can not').replace(/won't/g, 'will not').replace(/n't\b/g, ' not').replace(/'re\b/g, ' are').replace(/'m\b/g, ' am').replace(/'ve\b/g, ' have').replace(/'ll\b/g, ' will').replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
function nearUnits(selected, has, need) {
  const ids = UNITS.map(u => u.id); const sel = new Set(selected); const extra = [];
  const idx = selected.map(x => ids.indexOf(x)); const lo = Math.min(...idx), hi = Math.max(...idx);
  for (let d = 1; d < ids.length && extra.length < 60; d++) for (const i of [hi + d, lo - d]) if (i >= 0 && i < ids.length && !sel.has(ids[i]) && has(ids[i])) extra.push(ids[i]);
  return extra;
}
function pickWithFill(units, poolFn, n) {
  let pool = shuffle(poolFn(units)); let outside = 0;
  if (pool.length < n) {
    for (const u of nearUnits(units, x => poolFn([x]).length > 0)) { if (pool.length >= n) break; const add = shuffle(poolFn([u])).slice(0, n - pool.length); outside += add.length; pool = pool.concat(add); }
  }
  return { items: pool.slice(0, n), outside };
}
const cpeClozeCache = {};
function cpeCloze(id) {
  if (cpeClozeCache[id] !== undefined) return cpeClozeCache[id];
  const vs = headVariants(E(id).head); let best = null;
  for (const ex of allExamples(id)) {
    const t = String(ex).trim();
    if (!/[.!?]["”’']?$/.test(t) || /\.\.\.|…/.test(t) || /\w\/\s?\w/.test(t) || t.split(/\s+/).length < 6 || t.length > 190) continue;
    const { src, toks } = tokenize(t);
    for (const v of vs) { const pos = align(v, toks, true); if (pos && clozePosOk(E(id).head, toks, pos)) { best = { src, toks, pos, answer: pos.map(i => toks[i].raw).join(' ') }; break; } }
    if (best) break;
  }
  return (cpeClozeCache[id] = best);
}
function cpeP1Pool(units) {
  const out = [];
  for (const id of units.flatMap(u => UBY[u].entries.map(e => e.id))) {
    const e = E(id); if (e.kind === 'pattern' || !e.meaning) continue;
    const cz = cpeCloze(id); if (!cz) continue;
    const ans = cz.answer.toLowerCase(); const vs = headVariants(e.head).map(v => v.join(' '));
    if (!vs.includes(ans.replace(/[’']/g, "'"))) continue;
    if (cz.pos.length !== 1) continue;
    out.push(id);
  }
  return out;
}
function cpeP1Item(id) {
  const cz = cpeCloze(id), ans = cz.answer, n = ans.split(' ').length, e = E(id), u = UBY[e.unit];
  const cand = shuffle(u.entries.map(x => x.id).filter(x => x !== id)).map(x => { const v = headVariants(E(x).head).find(y => y.length === 1); return v ? { id: x, t: v.join(' ') } : null; }).filter(x => x && x.t.split(' ').length === n && x.t.toLowerCase() !== ans.toLowerCase());
  const same = cand.filter(x => E(x.id).section && E(x.id).section === e.section), opts = []; const seen = new Set([ans.toLowerCase()]);
  for (const c of same.concat(cand)) { if (!seen.has(c.t.toLowerCase())) { seen.add(c.t.toLowerCase()); opts.push(c); } if (opts.length >= 3) break; }
  if (opts.length < 3) for (const x of shuffle(ALL.filter(y => y.unit === e.unit || UBY[y.unit].part === u.part).map(y => y.id))) { const v = headVariants(E(x).head).find(y => y.length === 1); if (!v) continue; const t = v.join(' '); if (t.split(' ').length === n && !seen.has(t.toLowerCase())) { seen.add(t.toLowerCase()); opts.push({ id: x, t }); } if (opts.length >= 3) break; }
  const options = shuffle([{ id, t: ans.toLowerCase(), right: true }].concat(opts.slice(0, 3).map(o => ({ id: o.id, t: o.t.toLowerCase() }))));
  return { part: 1, id, cz, options, answer: ans.toLowerCase() };
}
function cpeP2Pool(units) {
  const out = [];
  for (const id of units.flatMap(u => UBY[u].entries.map(e => e.id))) {
    const e = E(id); if (e.kind === 'pattern') continue;
    const cz = cpeCloze(id); if (!cz) continue;
    const cands = cz.pos.filter((p, k) => FUNC_WORDS.has(cz.toks[p].n) && !(k === 0 && cz.pos.length === 1) && cz.src[cz.toks[p].start - 1] !== '-' && cz.src[cz.toks[p].end] !== '-');
    if (cands.length) out.push(id);
  }
  return out;
}
function cpeP2Item(id) {
  const cz = cpeCloze(id);
  const cands = cz.pos.filter((p, k) => FUNC_WORDS.has(cz.toks[p].n) && !(k === 0 && cz.pos.length === 1) && cz.src[cz.toks[p].start - 1] !== '-' && cz.src[cz.toks[p].end] !== '-');
  const p = cands[Math.floor(Math.random() * cands.length)];
  return { part: 2, id, cz: Object.assign({}, cz, { pos: [p] }), answer: cz.toks[p].n, full: cz };
}
const cpeWF = units => ((BOOK.cpe && BOOK.cpe.wf) || []).filter(x => units.includes(x.u));
const cpeKW = units => ((BOOK.cpe && BOOK.cpe.kwt) || []).filter(x => units.includes(x.u));
function buildCpe(units) {
  const p1 = pickWithFill(units, us => cpeP1Pool(us), 8), p2 = pickWithFill(units, us => cpeP2Pool(us).filter(x => !p1.items.includes(x)), 8);
  const p3 = pickWithFill(units, cpeWF, 8), p4 = pickWithFill(units, cpeKW, 6);
  return {
    units, started: Date.now(), part: 0, done: false,
    parts: [
      { items: p1.items.map(cpeP1Item), outside: p1.outside },
      { items: p2.items.map(cpeP2Item), outside: p2.outside },
      { items: p3.items.map(x => ({ part: 3, id: x.id, s: x.s, stem: x.stem, answers: x.a })), outside: p3.outside },
      { items: p4.items.map(x => ({ part: 4, id: x.id, s1: x.s1, key: x.key, s2: x.s2, a: x.a })), outside: p4.outside },
    ],
  };
}
function markItem(it) {
  const v = (it.resp || '').trim();
  if (it.part === 1) return { m: it.resp === it.answer ? 1 : 0 };
  if (!v) return { m: 0 };
  if (it.part === 2) { const x = cpeNorm(v).trim(); if (x === it.answer) return { m: 1 }; return { m: 0, slip: x.length > 3 && lev(x, it.answer) === 1 }; }
  if (it.part === 3) { const x = cpeNorm(v).trim(), as = it.answers.map(a => cpeNorm(a).trim()); if (as.includes(x)) return { m: 1 }; return { m: 0, slip: as.some(a => lev(x, a) <= (a.length >= 9 ? 2 : 1)) }; }
  const x = cpeNorm(v), key = it.key.toLowerCase();
  const words = x.trim().replace(/can not/g, 'cannot').split(' ').filter(Boolean).length;
  const has = alts => alts.some(a => x.includes(cpeNorm(a)));
  if (!x.includes(' ' + key + ' ')) return { m: 0, note: `The key word ${it.key} is missing or changed.` };
  if (words > 8) return { m: 0, note: 'More than eight words: in the exam this scores 0.' };
  let m = it.a.length === 1 ? (has(it.a[0]) ? 2 : 0) : (has(it.a[0]) ? 1 : 0) + (has(it.a[1]) ? 1 : 0);
  const fulls = it.a.length === 1 ? it.a[0] : it.a[0].flatMap(p => it.a[1].map(q => p + ' ' + q));
  const slip = m < 2 && fulls.some(f => lev(x.trim(), cpeNorm(f).trim()) <= 2);
  return { m, slip, note: words < 3 ? 'Fewer than three words.' : null };
}
const cpeAnswerText = it => it.part === 4 ? (it.a.length === 1 ? it.a[0][0] : it.a[0][0] + ' ' + it.a[1][0]) : it.part === 3 ? it.answers[0] : it.answer;
function cpeScale(raw) {
  const p = raw / CPE_MAX * 100;
  const A = [[0, 120], [32, 162], [46.4, 180], [60.7, 200], [78.6, 220], [100, 230]];
  for (let i = 1; i < A.length; i++) if (p <= A[i][0]) { const [x0, y0] = A[i - 1], [x1, y1] = A[i]; return Math.round(y0 + (y1 - y0) * (p - x0) / (x1 - x0)); }
  return 230;
}
const cpeGrade = sc => sc >= 220 ? { g: 'Grade A', lvl: 'C2', c: 'ga' } : sc >= 213 ? { g: 'Grade B', lvl: 'C2', c: 'gb' } : sc >= 200 ? { g: 'Grade C', lvl: 'C2', c: 'gc' } : sc >= 180 ? { g: 'Level C1', lvl: 'C1', c: 'g1' } : { g: 'Below C1', lvl: '—', c: 'g0' };

views.cpe = () => {
  if (!S.cpeUnits || !S.cpeUnits.length) { const st = startedUnits(); S.cpeUnits = st.length ? st : UNITS.slice(0, 10).map(u => u.id); }
  let sel = S.cpeUnits.filter(x => UBY[x]);
  const input = h('input', { type: 'text', class: 'cpe-units-in', value: unitsToText(sel), placeholder: 'e.g. 1-10, 24, 93-101', 'aria-label': 'Units' });
  const sum = h('div', { class: 'cpe-sum' });
  const chipsHost = h('div', { class: 'chips cpe-chips' });
  const ids = UNITS.map(u => u.id);
  const draw = (fromInput) => {
    S.cpeUnits = sel; save();
    if (!fromInput) input.value = unitsToText(sel);
    const words = sel.reduce((a, id) => a + UBY[id].entries.length, 0);
    const kw = cpeKW(sel).length, wf = cpeWF(sel).length;
    clear(sum).append(sel.length ? h('span', {}, h('b', {}, sel.length), ` unit${sel.length > 1 ? 's' : ''} · ${words} words · ${wf} word-formation and ${kw} transformation items`) : h('span', { class: 'err' }, 'Type the units you want, e.g. 1-10.'));
    clear(chipsHost); sel.slice(0, 40).forEach(id => chipsHost.append(h('span', { class: 'chip on', title: UBY[id].title }, id))); if (sel.length > 40) chipsHost.append(h('span', { class: 'chip' }, `+${sel.length - 40}`));
    startBtn.disabled = !sel.length;
  };
  input.addEventListener('input', () => { sel = parseUnits(input.value); draw(true); });
  const extend = d => { if (!sel.length) { sel = ids.slice(0, Math.max(1, d)); return draw(); } const first = ids.indexOf(sel[0]); let last = ids.indexOf(sel[sel.length - 1]); last = Math.max(first, Math.min(ids.length - 1, last + d)); sel = ids.slice(first, last + 1); draw(); };
  const startBtn = h('button', { class: 'btn lg', onclick: () => { CPEX = buildCpe(sel); go('#/cpe/run'); } }, 'Start the exam');
  const preset = (label, list) => h('button', { class: 'btn sm plain', onclick: () => { sel = list(); draw(); } }, label);
  const hist = (S.cpe || []).slice(-6).reverse();
  const page = shell('#/cpe',
    h('section', { class: 'hero' }, heroTitle('CPE.'), h('p', { class: 'hero-sub' }, 'Reading and Use of English, Parts 1–4, built from the units you choose. You get a mark out of 36, an estimated Cambridge score and a full review of your mistakes.')),
    h('section', { class: 'section gray' }, h('div', { class: 'container' },
      h('div', { class: 'card cpe-setup' },
        h('h3', {}, 'Choose the units'),
        h('div', { class: 'cpe-row' }, h('label', { class: 'fl' }, 'Units'), input),
        h('div', { class: 'cpe-steps' },
          h('div', { class: 'stepper' }, h('button', { class: 'btn sm plain', onclick: () => extend(-10) }, '−10'), h('button', { class: 'btn sm plain', onclick: () => extend(-1) }, '−1'), h('span', { class: 'muted small' }, 'last unit'), h('button', { class: 'btn sm plain', onclick: () => extend(1) }, '+1'), h('button', { class: 'btn sm', onclick: () => extend(10) }, '+10')),
          h('div', { class: 'row' }, preset('Units I’ve started', () => startedUnits().length ? startedUnits() : ids.slice(0, 10)), PARTS.map(p => preset(p.name.split(' (')[0], () => p.units.slice())), preset('Whole book', () => ids.slice()))),
        sum, chipsHost,
        h('div', { class: 'cpe-parts' }, CPE_PARTS.map(p => h('div', {}, h('b', {}, `Part ${p.n}`), h('span', {}, p.name), h('span', { class: 'muted small' }, `${p.items} questions · ${p.items * p.marks} marks`)))),
        h('div', { class: 'row', style: { marginTop: '18px' } }, startBtn, h('span', { class: 'muted small' }, 'About 30–40 minutes. Reading (Parts 5–7) is not included.'))),
      hist.length ? h('div', { class: 'card', style: { marginTop: '22px' } }, h('h3', {}, 'Your past attempts'),
        h('table', { class: 'cpe-hist' }, h('tbody', {}, hist.map(r => h('tr', {}, h('td', {}, new Date(r.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })), h('td', { class: 'muted' }, 'Units ' + r.unitsText), h('td', {}, `${r.raw}/${CPE_MAX}`), h('td', {}, String(r.scale)), h('td', {}, h('span', { class: 'grade ' + cpeGrade(r.scale).c }, cpeGrade(r.scale).g))))))) : null)));
  draw();
  return page;
};

function cpeGapInput(it, onChange) {
  const inp = h('input', { type: 'text', class: 'cpe-gap', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', value: it.resp || '', 'aria-label': 'Answer' });
  inp.addEventListener('input', () => { it.resp = inp.value; onChange && onChange(); });
  return inp;
}
function cpeSentence(cz, gapNode) {
  const { src, toks, pos } = cz; const a = toks[pos[0]].start, b = toks[pos[pos.length - 1]].end;
  return [src.slice(0, a), gapNode, src.slice(b)];
}
function cpeTabs(X) {
  return h('div', { class: 'cpe-tabs' }, CPE_PARTS.map((p, i) => {
    const answered = X.parts[i].items.filter(it => (it.resp || '').trim()).length;
    return h('button', { class: (i === X.part ? 'on' : '') + (answered === X.parts[i].items.length ? ' full' : ''), onclick: () => { X.part = i; render(); } }, h('b', {}, `Part ${p.n}`), h('span', {}, `${answered}/${X.parts[i].items.length}`));
  }));
}
views.cpeRun = () => {
  const X = CPEX;
  if (!X) { go('#/cpe'); return h('div'); }
  if (X.done) return cpeResults(X);
  const P = CPE_PARTS[X.part], part = X.parts[X.part];
  const tabs = cpeTabs(X);
  const clock = h('span', { class: 'cpe-clock' });
  const tick = () => { const s = Math.floor((Date.now() - X.started) / 1000); clock.textContent = `${Math.floor(s / 60)}:${pad2(s % 60)}`; };
  tick(); every(tick, 1000);
  const refreshTabs = () => { const t = $('.cpe-tabs'); if (t) t.replaceWith(cpeTabs(X)); };
  let qn = X.parts.slice(0, X.part).reduce((a, p) => a + p.items.length, 0);
  const list = h('ol', { class: 'cpe-list', start: qn + 1 }, part.items.map((it, k) => {
    const num = qn + k + 1;
    if (it.part === 1) {
      const opts = h('div', { class: 'cpe-opts' });
      const drawOpts = () => { clear(opts); it.options.forEach((o, j) => opts.append(h('button', { class: 'cpe-opt' + (it.resp === o.t ? ' sel' : ''), onclick: () => { it.resp = o.t; drawOpts(); refreshTabs(); } }, h('kbd', {}, 'ABCD'[j]), o.t))); };
      drawOpts();
      return h('li', {}, h('div', { class: 'cpe-s' }, cpeSentence(it.cz, h('span', { class: 'gap cpe-num' }, `(${num})`))), opts);
    }
    if (it.part === 2) return h('li', {}, h('div', { class: 'cpe-s' }, cpeSentence(it.cz, cpeGapInput(it, refreshTabs))));
    if (it.part === 3) { const [a, b] = it.s.split('___'); return h('li', { class: 'cpe-wf' }, h('div', { class: 'cpe-s' }, a, cpeGapInput(it, refreshTabs), b), h('div', { class: 'cpe-stem' }, it.stem)); }
    const [a, b] = it.s2.split('___');
    const inp = cpeGapInput(it, () => { cnt(); refreshTabs(); }); inp.classList.add('wide');
    const wc = h('span', { class: 'cpe-wc muted small' });
    const cnt = () => { const n = cpeNorm(inp.value).trim().replace(/can not/g, 'cannot').split(' ').filter(Boolean).length; wc.textContent = n ? `${n} word${n > 1 ? 's' : ''}` : ''; wc.classList.toggle('over', n > 8); };
    cnt();
    return h('li', { class: 'cpe-kw' }, h('div', { class: 'cpe-s1' }, it.s1), h('div', { class: 'cpe-key' }, it.key), h('div', { class: 'cpe-s' }, a, inp, b), wc);
  }));
  const last = X.part === CPE_PARTS.length - 1;
  const finish = () => {
    const missing = X.parts.reduce((a, p) => a + p.items.filter(it => !(it.resp || '').trim()).length, 0);
    const doIt = () => { X.done = true; X.secs = Math.round((Date.now() - X.started) / 1000); cpeSave(X); render(); };
    if (!missing) return doIt();
    modal((box, close) => box.append(h('h3', {}, `${missing} question${missing > 1 ? 's are' : ' is'} still empty`), h('p', { class: 'muted' }, 'Empty answers score 0. Finish anyway?'),
      h('div', { class: 'actions' }, h('button', { class: 'btn plain', 'data-autofocus': true, onclick: close }, 'Keep working'), h('button', { class: 'btn', onclick: () => { close(); doIt(); } }, 'Finish and mark'))));
  };
  const page = h('div', { class: 'cpe-page' },
    h('div', { class: 'cpe-top' }, h('div', { class: 'cpe-top-in' },
      h('button', { class: 'xbtn', title: 'Leave the exam', 'aria-label': 'Leave the exam', onclick: () => modal((box, close) => box.append(h('h3', {}, 'Leave the exam?'), h('p', { class: 'muted' }, 'Your answers will be lost.'), h('div', { class: 'actions' }, h('button', { class: 'btn plain', 'data-autofocus': true, onclick: close }, 'Stay'), h('button', { class: 'btn danger', onclick: () => { close(); CPEX = null; go('#/cpe'); } }, 'Leave')))) }, '✕'),
      h('div', { class: 'cpe-title' }, 'CPE · Use of English', h('small', {}, 'Units ' + unitsToText(X.units))), clock)),
    h('div', { class: 'narrow cpe-body' }, tabs,
      h('div', { class: 'cpe-head' }, h('h2', { class: 'h2' }, `Part ${P.n}`), h('div', { class: 'muted' }, P.name), h('p', { class: 'cpe-hint' }, P.hint),
        part.outside ? h('p', { class: 'muted small' }, `Your units had too few items for this part, so ${part.outside} come${part.outside === 1 ? 's' : ''} from neighbouring units.`) : null),
      h('div', { class: 'card cpe-card' }, list),
      h('div', { class: 'row cpe-nav' }, X.part > 0 ? h('button', { class: 'btn plain', onclick: () => { X.part--; render(); } }, '← Part ' + X.part) : null, h('span', { class: 'grow' }),
        last ? h('button', { class: 'btn lg', onclick: finish }, 'Finish and mark') : h('button', { class: 'btn lg', onclick: () => { X.part++; render(); } }, `Part ${X.part + 2} →`))));
  return page;
};
function cpeSave(X) {
  X.parts.forEach(p => p.items.forEach(it => { it.res = markItem(it); }));
  X.partScores = X.parts.map((p, i) => p.items.reduce((a, it) => a + it.res.m, 0));
  X.raw = X.partScores.reduce((a, b) => a + b, 0); X.scale = cpeScale(X.raw);
  S.cpe = (S.cpe || []).concat([{ at: Date.now(), unitsText: unitsToText(X.units), raw: X.raw, scale: X.scale, parts: X.partScores, secs: X.secs }]).slice(-30); save();
}
function cpeResults(X) {
  const gr = cpeGrade(X.scale), pct = Math.round(X.raw / CPE_MAX * 100);
  const reviewHost = h('div');
  const showReview = i => {
    clear(reviewHost);
    const tabs = h('div', { class: 'cpe-tabs' }, CPE_PARTS.map((p, j) => { const wrong = X.parts[j].items.filter(it => it.res.m < p.marks).length; return h('button', { class: j === i ? 'on' : '', onclick: () => showReview(j) }, h('b', {}, `Part ${p.n}`), h('span', {}, wrong ? `${wrong} to review` : 'all right')); }));
    const P = CPE_PARTS[i], items = X.parts[i].items;
    const qn0 = X.parts.slice(0, i).reduce((a, p) => a + p.items.length, 0);
    const rows = items.map((it, k) => ({ it, num: qn0 + k + 1 })).filter(({ it }) => it.res.m < P.marks);
    reviewHost.append(tabs, rows.length ? h('div', { class: 'card review cpe-review' }, h('h3', {}, `Part ${P.n} · ${P.name}: ${rows.length} to review`), rows.map(({ it, num }) => {
      const e = E(it.id);
      const q = it.part === 1 || it.part === 2 ? h('div', { class: 'rv-q' }, h('b', {}, `${num}. `), cpeSentence(it.cz, h('span', { class: 'gap filled' }, it.answer)))
        : it.part === 3 ? h('div', { class: 'rv-q' }, h('b', {}, `${num}. `), it.s.replace('___', '[ ' + it.answers[0] + ' ]'), h('span', { class: 'cpe-stem inline' }, it.stem))
        : h('div', { class: 'rv-q' }, h('b', {}, `${num}. `), it.s1, h('div', { class: 'cpe-key inline' }, it.key), h('div', {}, it.s2.replace('___', '[ ' + cpeAnswerText(it) + ' ]')));
      const tags = [];
      if (it.part === 4) tags.push(`${it.res.m} of 2 marks`);
      if (it.res.slip) tags.push('Spelling slip: in the exam, spelling must be correct');
      if (it.res.note) tags.push(it.res.note);
      return h('div', { class: 'rv' }, q, tags.length ? h('div', { class: 'rv-tag' }, tags.join(' · ')) : null,
        h('div', { class: 'rv-a no' }, h('span', {}, 'Your answer'), (it.resp || '').trim() || 'no answer'),
        h('div', { class: 'rv-a ok' }, h('span', {}, 'Correct'), it.part === 3 ? it.answers.join(' / ') : it.part === 4 ? cpeAnswerText(it) : it.answer),
        it.part === 4 && it.a.some(x => x.length > 1) ? h('div', { class: 'rv-n' }, 'Marking: ' + (it.a.length === 1 ? '2 marks for ' + it.a[0].map(x => '“' + x + '”').join(' or ') : it.a.map(x => '1 mark for ' + x.map(y => '“' + y + '”').join(' or ')).join('; '))) : it.part === 4 && it.a.length > 1 ? h('div', { class: 'rv-n' }, `Marking: 1 mark for “${it.a[0][0]}”, 1 mark for “${it.a[1][0]}”.`) : null,
        it.part === 1 ? h('div', { class: 'rv-n' }, 'Options: ' + it.options.map(o => o.t).join(' · ')) : null,
        h('div', { class: 'rv-n' }, e.head + ' — ' + e.meaning));
    })) : h('div', { class: 'card center' }, h('b', {}, 'No mistakes in this part 🎉')));
    reviewHost.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return shell('#/cpe',
    h('section', { class: 'hero cpe-res' },
      h('div', { class: 'grade big ' + gr.c }, gr.g),
      heroTitle(`${X.raw} / ${CPE_MAX}`),
      h('p', { class: 'hero-sub' }, `${pct}% · estimated Cambridge English Scale score ${X.scale} · ${gr.lvl === '—' ? 'below C1' : 'CEFR ' + gr.lvl}`),
      h('div', { class: 'cpe-bars' }, CPE_PARTS.map((p, i) => { const max = p.items * p.marks, v = X.partScores[i]; return h('div', { class: 'cpe-bar' }, h('span', {}, `Part ${p.n}`), h('div', { class: 'track' }, h('i', { style: { width: (v / max * 100) + '%' } })), h('b', {}, `${v}/${max}`)); })),
      h('p', { class: 'muted small cpe-note' }, `Time: ${Math.floor(X.secs / 60)} min ${X.secs % 60} s. Grade bands: A 220–230, B 213–219, C 200–212, C1 180–199. The scale score is an estimate based only on Parts 1–4, converted the way Cambridge converts practice-test marks; the real exam also counts Reading, Writing, Listening and Speaking.`),
      h('div', { class: 'hero-cta' }, h('button', { class: 'btn lg', onclick: () => showReview(X.parts.findIndex((p, i) => p.items.some(it => it.res.m < CPE_PARTS[i].marks)) >= 0 ? X.parts.findIndex((p, i) => p.items.some(it => it.res.m < CPE_PARTS[i].marks)) : 0) }, 'Review my mistakes'),
        h('button', { class: 'btn lg ghost', onclick: () => { CPEX = buildCpe(X.units); if (location.hash === '#/cpe/run') render(); else go('#/cpe/run'); } }, 'New exam, same units'),
        h('button', { class: 'btn lg plain', onclick: () => { CPEX = null; go('#/cpe'); } }, 'Change units'))),
    h('section', { class: 'section gray' }, h('div', { class: 'narrow' }, reviewHost)));
}

views.plan = () => {
  const total = ALL.length, remaining = newIds().length, learned = total - remaining;
  const npd = S.settings.newPerDay, sd = S.settings.studyDays;
  const calDays = Math.ceil(Math.ceil(remaining / npd) * 7 / sd);
  const finish = new Date(Date.now() + calDays * DAY);
  const reviews = SIM(npd), minutes = Math.round(reviews * 11 / 60);
  const slider = h('input', { type: 'range', min: 5, max: 40, step: 1, value: npd, style: { width: '100%' }, 'aria-label': 'New words per study day', oninput: ev => { S.settings.newPerDay = +ev.target.value; save(); render(); } });
  const sdSel = h('select', { onchange: ev => { S.settings.studyDays = +ev.target.value; save(); render(); } }, [3, 4, 5, 6, 7].map(v => h('option', { value: v, selected: v === sd }, v + ' days a week')));
  const runs = [];
  for (const uid of queue()) { const u = UBY[uid], pid = u.part || 'A', n = newIds([uid]).length; const last = runs[runs.length - 1]; if (last && last.pid === pid) { last.units.push(u.id); last.n += n; } else runs.push({ pid, units: [u.id], n }); }
  let cursor = 0;
  const fmtD = d => new Date(Date.now() + d * DAY).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
  const rows = runs.map(r => { const s0 = Math.ceil(cursor / npd * 7 / sd); cursor += r.n; const s1 = Math.ceil(cursor / npd * 7 / sd); const part = PARTS.find(p => p.id === r.pid);
    return { label: (part ? part.name.split(' (')[0] : r.pid) + (r.units.length <= 4 ? ' — units ' + r.units.join(', ') : ''), w: r.units.length, n: r.n, from: r.n ? fmtD(s0) : '—', to: r.n ? fmtD(s1) : '—' }; });
  const orderSel = h('select', { onchange: ev => { S.settings.order = ev.target.value; S.queue = null; save(); render(); } },
    h('option', { value: 'cpe', selected: S.settings.order === 'cpe' }, 'CPE-first: word formation, phrasal verbs, key verbs, prepositions, combinations, then topics'),
    h('option', { value: 'book', selected: S.settings.order !== 'cpe' }, 'Book order (1 → 116)'));
  return shell('#/plan',
    h('section', { class: 'hero' }, heroTitle('Your plan.'), h('p', { class: 'hero-sub' }, `At ${npd} new words a day, ${sd} days a week, you meet the last new word on ${finish.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.`)),
    h('section', { class: 'section gray' }, h('div', { class: 'container' },
      h('div', { class: 'figures' },
        h('div', { class: 'fig reveal' }, h('b', {}, learned), h('span', {}, `of ${total} words started`)),
        h('div', { class: 'fig reveal' }, h('b', {}, (calDays / 30.4).toFixed(1)), h('span', {}, 'months to meet every word')),
        h('div', { class: 'fig reveal' }, h('b', {}, '≈' + minutes), h('span', {}, 'minutes per day at the peak')),
        h('div', { class: 'fig reveal' }, h('b', {}, '≈' + reviews), h('span', {}, 'reviews per day at the peak'))),
      h('div', { class: 'card reveal', style: { marginTop: '40px' } }, h('h3', { class: 'h3', style: { fontSize: '24px', marginBottom: '14px' } }, 'Pace'),
        h('div', { class: 'row' }, h('span', {}, 'New words per study day'), h('b', {}, npd), h('span', { class: 'grow' }), sdSel), slider,
        h('p', { class: 'muted small' }, 'Estimates come from a simulation of the FSRS scheduler at 90% target retention (about 11 seconds per card). Real numbers depend on how many words you already know.')),
      h('div', { class: 'card reveal', style: { marginTop: '22px' } }, h('h3', { class: 'h3', style: { fontSize: '24px', marginBottom: '14px' } }, 'Roadmap'),
        h('div', { class: 'row', style: { marginBottom: '12px' } }, h('span', { class: 'muted small' }, 'Study order'), orderSel),
        h('div', { class: 'tablewrap' }, h('table', { class: 'words' }, h('thead', {}, h('tr', {}, h('th', {}, 'Block'), h('th', {}, 'Units'), h('th', {}, 'New words'), h('th', {}, 'Start'), h('th', {}, 'Done'))),
          h('tbody', {}, rows.map(r => h('tr', {}, h('td', { class: 'w' }, r.label), h('td', {}, r.w), h('td', {}, r.n), h('td', {}, r.from), h('td', {}, r.to))))))),
      h('div', { class: 'card reveal', style: { marginTop: '22px' } }, h('h3', { class: 'h3', style: { fontSize: '24px', marginBottom: '6px' } }, 'The weekly rhythm'),
        h('table', { class: 'words' }, h('tbody', {}, [['Study days', `Reviews first, always. Then ${npd} new words.`], ['Once a week', 'A unit test on the unit you finished most recently. Pass mark 85%.'], ['Once a week', 'One game round per unit. Games train speed; reviews build memory.'], ['Once a week', 'Write five sentences of your own with this week’s words. The exam rewards production.'], ['Missed a day?', 'Do reviews only. Never miss two days in a row, and don’t double the new words.']]
          .map(([a, b]) => h('tr', {}, h('td', { class: 'w' }, a), h('td', {}, b)))))))));
};

/* ================================================================ accounts without the book: home */
views.home = () => {
  const box = h('div', { class: 'narrow' });
  const teacherLine = h('p', { class: 'muted' });
  const role = S.account && S.account.role;
  if (!S.profile) {
    const name = h('input', { type: 'text', placeholder: 'Your name', autocomplete: 'given-name', style: { width: '100%' } });
    const err = h('div', { class: 'err' });
    setTimeout(() => name.focus(), 60);
    return h('div', { class: 'welcome' }, h('div', { class: 'welcome-box' }, h('div', { class: 'logo' }, 'L'), heroTitle('Welcome to Lexicon', 'grad-text'),
      h('p', { class: 'hero-sub' }, 'What should we call you?'),
      h('form', { onsubmit: ev => { ev.preventDefault(); const v = name.value.trim(); if (!v) { err.textContent = 'Enter your name to continue.'; return; }
        S.profile = { name: v, email: CLOUD.user.email, createdAt: Date.now() }; save(); CLOUD.rename(v).catch(() => {}); render(); } },
        h('label', { class: 'fl' }, 'Name'), name, err, h('button', { class: 'btn lg', type: 'submit' }, 'Continue'))));
  }
  CLOUD.rpc('my_teacher').then(t => { teacherLine.textContent = t ? `Your teacher: ${t.name || t.email}${t.name ? ' (' + t.email + ')' : ''}.` : 'You haven’t joined a teacher yet. When your teacher adds your email, their courses appear here.'; }).catch(() => {});
  const codeLink = h('a', { href: '#', onclick: ev => { ev.preventDefault(); clear(root()).append(views.lock(LITE.start)); } }, 'I have an access code for the book');
  box.append(h('div', { class: 'card reveal' }, h('h3', { class: 'h3', style: { fontSize: '24px' } }, 'Your courses'),
    h('p', {}, 'Courses from your teacher will appear here: topics with words, tests, typing practice and games.'), teacherLine),
    role === 'teacher' || role === 'admin' ? h('div', { class: 'card reveal', style: { marginTop: '22px' } }, h('h3', { class: 'h3', style: { fontSize: '24px' } }, 'You are a teacher'),
      h('p', {}, 'Add your students by email in the Students section. Each student gets a sign-in code by email.'),
      h('button', { class: 'btn', onclick: () => go('#/students') }, 'Open Students')) : null,
    h('p', { class: 'muted small', style: { marginTop: '28px', textAlign: 'center' } }, codeLink));
  return shell('#/', h('section', { class: 'hero' }, heroTitle(`${greetWord()}, ${firstName()}.`), h('p', { class: 'hero-sub' }, 'Welcome to Lexicon.')),
    h('section', { class: 'section gray' }, box));
};

/* ================================================================ teacher: students */
const fmtDate = t => t ? new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—';
const fmtAgo = t => { if (!t) return 'never'; const d = Math.floor((Date.now() - new Date(t).getTime()) / DAY); return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`; };
views.students = () => {
  const role = S.account && S.account.role;
  if (role !== 'teacher' && role !== 'admin') return shell('#/students', h('section', { class: 'hero' }, heroTitle('Students'), h('p', { class: 'hero-sub' }, 'This page is for teachers.')));
  const list = h('div', {}, h('p', { class: 'muted' }, 'Loading…'));
  const bal = h('b', {}, '…');
  const price = role === 'admin' ? 0 : 150;
  const email = h('input', { type: 'email', placeholder: 'student@example.com', autocomplete: 'off', style: { flex: '1', minWidth: '220px' }, 'aria-label': 'Student email' });
  const err = h('div', { class: 'err', role: 'alert' });
  const addBtn = h('button', { class: 'btn', type: 'submit' }, 'Add student');
  const loadBalance = () => CLOUD.profile().then(p => { bal.textContent = role === 'admin' ? 'free (admin)' : `${p.balance} ₽`; }).catch(() => {});
  const invite = async (e, again) => {
    try { await CLOUD.sendCode(e, true); toast(again ? `New code sent to ${e}` : `Added. A sign-in code was sent to ${e}`); }
    catch (x) { toast(`Added, but the email didn’t go out: ${x.message}`); }
  };
  const load = async () => {
    let rows;
    try { rows = await CLOUD.rpc('my_students'); } catch (x) { clear(list).append(h('p', { class: 'err' }, x.message)); return; }
    clear(list);
    if (!rows.length) { list.append(h('p', { class: 'muted' }, 'No students yet. Add the first one above.')); return; }
    list.append(h('table', { class: 'words people' }, h('thead', {}, h('tr', {}, ['Student', 'Status', 'Words', 'Last active', ''].map(t => h('th', {}, t)))),
      h('tbody', {}, rows.map(r => h('tr', {},
        h('td', {}, h('b', {}, r.name || r.email), r.name ? h('div', { class: 'muted small' }, r.email) : null),
        h('td', {}, r.has_account ? h('span', { class: 'pill ok' }, 'Joined') : h('span', { class: 'pill' }, 'Invited')),
        h('td', {}, r.words),
        h('td', { class: 'muted small' }, r.has_account ? fmtAgo(r.last_active) : `added ${fmtDate(r.added_at)}`),
        h('td', { class: 'row-actions' },
          r.has_account ? null : h('button', { class: 'btn plain sm', onclick: () => invite(r.email, true) }, 'Resend code'),
          h('button', { class: 'btn plain sm', onclick: () => confirmBox(`Remove ${r.email}?`, 'They keep their account and progress, but leave your list. The payment is not returned.', 'Remove', async () => { try { await CLOUD.rpc('remove_student', { p_email: r.email }); toast('Removed'); load(); } catch (x) { toast(x.message); } }) }, 'Remove')))))));
  };
  const form = h('form', { class: 'row', style: { flexWrap: 'wrap', gap: '10px', marginTop: '14px' }, onsubmit: ev => {
    ev.preventDefault(); err.textContent = '';
    const e = email.value.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { err.textContent = 'Enter the student’s email.'; return; }
    confirmBox(`Add ${e}?`, price ? `${price} ₽ will be taken from your balance. The student gets a 6-digit sign-in code by email.` : 'The student gets a 6-digit sign-in code by email.', 'Add student', async () => {
      addBtn.disabled = true;
      try { await CLOUD.rpc('add_student', { p_email: e }); email.value = ''; await invite(e); loadBalance(); load(); }
      catch (x) { err.textContent = x.message; }
      addBtn.disabled = false;
    });
  } }, email, addBtn);
  loadBalance(); load();
  return shell('#/students',
    h('section', { class: 'hero' }, heroTitle('Students'), h('p', { class: 'hero-sub' }, 'Add a student by email. They get a code, sign up, and see your courses.')),
    h('section', { class: 'section gray' }, h('div', { class: 'narrow' },
      h('div', { class: 'card reveal' }, h('div', { class: 'row', style: { justifyContent: 'space-between', alignItems: 'baseline' } }, h('h3', { class: 'h3', style: { fontSize: '24px' } }, 'Add a student'), h('span', { class: 'muted' }, 'Balance: ', bal)),
        h('p', { class: 'muted small' }, price ? `One student costs ${price} ₽. To top up your balance, contact the admin.` : 'As the admin you add students for free.'),
        form, err),
      h('div', { class: 'card reveal', style: { marginTop: '22px' } }, h('h3', { class: 'h3', style: { fontSize: '24px' } }, 'Your students'), list))));
};
function confirmBox(title, text, yes, onYes) {
  modal((box, close) => {
    box.append(h('h3', {}, title), h('p', {}, text),
      h('div', { class: 'actions' }, h('button', { class: 'btn plain', 'data-autofocus': true, onclick: close }, 'Cancel'),
        h('button', { class: 'btn', onclick: () => { close(); onYes(); } }, yes)));
  });
}

/* ================================================================ admin */
views.admin = () => {
  if (!(S.account && S.account.role === 'admin')) return shell('#/admin', h('section', { class: 'hero' }, heroTitle('Admin'), h('p', { class: 'hero-sub' }, 'Admins only.')));
  const list = h('div', {}, h('p', { class: 'muted' }, 'Loading…'));
  const q = h('input', { type: 'search', placeholder: 'Search by email or name', style: { width: '100%' }, oninput: () => draw() });
  let rows = [];
  const act = async (fn, args, ok) => { try { await CLOUD.rpc(fn, args); toast(ok); await load(); } catch (x) { toast(x.message); } };
  const topup = r => modal((box, close) => {
    const amt = h('input', { type: 'number', step: '50', placeholder: 'e.g. 1500', 'data-autofocus': true, style: { width: '100%' } });
    const note = h('input', { type: 'text', placeholder: 'Note (optional), e.g. paid by transfer 15 Oct', style: { width: '100%' } });
    const err = h('div', { class: 'err' });
    box.append(h('h3', {}, `Balance of ${r.name || r.email}`), h('p', { class: 'muted' }, `Now: ${r.balance} ₽ · one student costs 150 ₽. Use a minus to take money back.`),
      h('label', { class: 'fl' }, 'Amount, ₽'), amt, h('label', { class: 'fl' }, 'Note'), note, err,
      h('div', { class: 'actions' }, h('button', { class: 'btn plain', onclick: close }, 'Cancel'),
        h('button', { class: 'btn', onclick: async () => { const v = parseInt(amt.value, 10); if (!v) { err.textContent = 'Enter an amount.'; return; }
          try { const nb = await CLOUD.rpc('admin_topup', { p_email: r.email, p_amount: v, p_note: note.value.trim() || null }); close(); toast(`New balance: ${nb} ₽`); load(); } catch (x) { err.textContent = x.message; } } }, 'Save')));
  });
  const draw = () => {
    const f = q.value.trim().toLowerCase();
    const shown = rows.filter(r => !f || r.email.includes(f) || (r.name || '').toLowerCase().includes(f));
    clear(list).append(h('p', { class: 'muted small' }, `${rows.length} accounts · ${rows.filter(r => r.role === 'teacher').length} teachers`),
      h('div', { class: 'table-wrap' }, h('table', { class: 'words people' }, h('thead', {}, h('tr', {}, ['Account', 'Role', 'Skipper', 'Balance', 'Teacher', 'Words', ''].map(t => h('th', {}, t)))),
        h('tbody', {}, shown.map(r => {
          const sel = h('select', { 'aria-label': 'Role', onchange: ev => act('admin_set_role', { p_email: r.email, p_role: ev.target.value }, `${r.email} is now ${ev.target.value}`) },
            ['student', 'teacher', 'admin'].map(x => { const o = h('option', { value: x }, x); if (x === r.role) o.selected = true; return o; }));
          const sk = h('input', { type: 'checkbox', 'aria-label': 'Skipper access', onchange: ev => act('admin_set_skipper', { p_email: r.email, p_on: ev.target.checked }, ev.target.checked ? 'Skipper opened' : 'Skipper closed') }); sk.checked = !!r.skipper;
          return h('tr', {},
            h('td', {}, h('b', {}, r.name || '—'), h('div', { class: 'muted small' }, r.email), h('div', { class: 'muted small' }, `since ${fmtDate(r.created_at)} · active ${fmtAgo(r.last_active)}`)),
            h('td', {}, sel), h('td', {}, sk),
            h('td', {}, r.role === 'student' ? '—' : `${r.balance} ₽`, r.role === 'student' ? null : h('div', { class: 'muted small' }, `${r.students} students`)),
            h('td', { class: 'muted small' }, r.teacher_email || '—'), h('td', {}, r.words),
            h('td', {}, r.role === 'student' ? null : h('button', { class: 'btn plain sm', onclick: () => topup(r) }, 'Top up')));
        })))));
  };
  const load = async () => { try { rows = await CLOUD.rpc('admin_users'); draw(); } catch (x) { clear(list).append(h('p', { class: 'err' }, x.message)); } };
  load();
  return shell('#/admin',
    h('section', { class: 'hero' }, heroTitle('Admin'), h('p', { class: 'hero-sub' }, 'Accounts, roles, Skipper access and teacher balances.')),
    h('section', { class: 'section gray' }, h('div', { class: 'container' },
      h('div', { class: 'card reveal' }, h('p', { class: 'muted small' }, 'To make someone a teacher: they create an account, then you set their role to “teacher” and top up their balance.'), q, h('div', { style: { marginTop: '14px' } }, list)))));
};

/* ================================================================ Account */
views.account = () => {
  const P = S.profile || { name: '', email: '' };
  const name = h('input', { type: 'text', value: P.name, style: { width: '100%' } });
  const email = h('input', { type: 'email', value: P.email || '', style: { width: '100%' }, readonly: !!(CLOUD && CLOUD.user) });
  const imp = h('input', { type: 'file', accept: '.json', class: 'hidden', onchange: ev => { const f = ev.target.files[0]; if (!f) return; f.text().then(t => { try { const p = JSON.parse(t); if (!p || !p.cards) throw new Error('bad'); S = Object.assign(defaults(), p); S.settings = Object.assign(defaults().settings, p.settings || {}); save(); applyTheme(); toast('Progress imported'); render(); } catch (e) { toast('That file isn’t a Lexicon progress file'); } }); } });
  const seg = (key, opts) => { const s = h('div', { class: 'seg' }); const draw = () => { clear(s); opts.forEach(([v, t]) => s.append(h('button', { type: 'button', class: String(S.settings[key]) === String(v) ? 'on' : '', onclick: () => { S.settings[key] = v; save(); applyTheme(); draw(); } }, t))); }; draw(); return s; };
  const line = (label, ctl) => h('div', { class: 'row', style: { padding: '14px 0', borderTop: '1px solid var(--line)' } }, h('span', { class: 'grow' }, label), ctl);
  return shell('#/account',
    h('section', { class: 'hero' }, heroTitle(S.profile ? S.profile.name : 'Your account'), h('p', { class: 'hero-sub' }, S.profile && S.profile.email ? S.profile.email : CLOUD && CLOUD.user ? CLOUD.user.email : 'Profile and progress are stored in this browser.')),
    h('section', { class: 'section gray' }, h('div', { class: 'narrow' },
      h('div', { class: 'card reveal' }, h('h3', { class: 'h3', style: { fontSize: '24px' } }, 'Profile'),
        h('label', { class: 'fl' }, 'Name'), name, h('label', { class: 'fl' }, 'Email'), email,
        h('div', { class: 'row', style: { marginTop: '18px' } }, h('button', { class: 'btn', onclick: () => { if (!name.value.trim()) return toast('Enter a name'); S.profile = Object.assign({}, S.profile || { createdAt: Date.now() }, { name: name.value.trim(), email: email.value.trim() }); save(); if (CLOUD && CLOUD.user) CLOUD.rename(S.profile.name).catch(() => {}); toast('Profile saved'); render(); } }, 'Save profile'))),
      h('div', { class: 'card reveal', style: { marginTop: '22px' } }, h('h3', { class: 'h3', style: { fontSize: '24px', marginBottom: '6px' } }, 'Learning plan'),
        line('Words at once', seg('chunk', [[5, '5'], [10, '10'], [15, '15'], ['all', 'Whole unit']])),
        line('New words per day', seg('newPerDay', [[10, '10'], [15, '15'], [20, '20'], [30, '30']])),
        line('Study order', seg('order', [['cpe', 'CPE-first'], ['book', 'Book order']])),
        line('Target retention', seg('retention', [[0.85, '85%'], [0.9, '90%'], [0.95, '95%']])),
        line('Auto-play pronunciation', seg('accent', [['uk', 'British'], ['us', 'American']])),
        line('Appearance', seg('theme', [['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']]))),
      CLOUD && CLOUD.user ? accountCard() : null,
      h('div', { class: 'card reveal', style: { marginTop: '22px' } }, h('h3', { class: 'h3', style: { fontSize: '24px' } }, CLOUD && CLOUD.user ? 'Backup file' : 'Move to another device'),
        h('p', { class: 'muted' }, CLOUD && CLOUD.user ? 'Your progress already syncs to your account. A file is an extra copy you keep yourself.' : 'Download your progress file here, then open the site on the other device and import it.'),
        h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => download(`skipper-progress-${dkey()}.json`, JSON.stringify(S)) }, 'Download progress'), h('button', { class: 'btn plain', onclick: () => imp.click() }, 'Import progress'), imp)),
      !BOOK ? null : h('div', { class: 'card reveal', style: { marginTop: '22px' } }, h('h3', { class: 'h3', style: { fontSize: '24px' } }, 'All words'),
        h('p', { class: 'muted' }, `Every one of the ${ALL.length} cards, ready for Anki (File → Import).`),
        h('div', { class: 'row' }, h('button', { class: 'btn plain', onclick: () => download('skipper-all-anki.txt', ankiText(ALL.map(e => e.id), 'Skipper'), 'text/plain') }, 'Download all for Anki'),
          h('button', { class: 'btn plain', onclick: () => download('skipper-edits.json', JSON.stringify(S.edits)) }, `Download my card fixes (${Object.keys(S.edits).length})`))),
      h('div', { class: 'danger-zone reveal', style: { marginTop: '40px' } }, h('h3', {}, 'Danger Zone'),
        h('p', {}, 'Delete your profile and all your progress on this device: learning history, schedule, test results, game records and card fixes. This can’t be undone.'),
        h('button', { class: 'btn danger', onclick: deleteFlow }, 'Delete my profile and progress')))));
};
function accountCard() {
  const status = h('span', { class: 'muted small' });
  const show = () => { status.textContent = SYNC.state === 'error' ? 'Not synced yet — will retry automatically.' : SYNC.busy ? 'Syncing…' : 'All progress is saved to your account.'; };
  show();
  const role = S.account && S.account.role && S.account.role !== 'student' ? ` · ${S.account.role}` : '';
  return h('div', { class: 'card reveal', style: { marginTop: '22px' } }, h('h3', { class: 'h3', style: { fontSize: '24px' } }, 'Account'),
    h('p', { class: 'muted' }, `Signed in as ${CLOUD.user.email}${role}.`), status,
    h('div', { class: 'row', style: { marginTop: '16px', flexWrap: 'wrap' } },
      h('button', { class: 'btn', onclick: async () => { status.textContent = 'Syncing…'; try { await cloudSync(); toast('Synced'); render(); } catch (e) { status.textContent = e.message; } } }, 'Sync now'),
      h('button', { class: 'btn plain', onclick: passwordFlow }, 'Change password'),
      h('button', { class: 'btn plain', onclick: signOut }, 'Sign out')));
}
function passwordFlow() {
  modal((box, close) => {
    const p1 = h('input', { type: 'password', placeholder: 'At least 8 characters', autocomplete: 'new-password', 'data-autofocus': true }), p2 = h('input', { type: 'password', placeholder: 'Repeat the password', autocomplete: 'new-password' });
    const err = h('div', { class: 'err', role: 'alert' });
    box.append(h('h3', {}, 'Change password'), h('label', { class: 'fl' }, 'New password'), p1, h('label', { class: 'fl' }, 'Repeat it'), p2, err,
      h('div', { class: 'actions' }, h('button', { class: 'btn plain', onclick: close }, 'Cancel'),
        h('button', { class: 'btn', onclick: async () => {
          if (p1.value.length < 8) { err.textContent = 'Use at least 8 characters.'; return; }
          if (p1.value !== p2.value) { err.textContent = 'The two passwords don’t match.'; return; }
          try { await CLOUD.setPassword(p1.value); close(); toast('Password changed'); } catch (e) { err.textContent = e.message; } } }, 'Save')));
  });
}
function deleteFlow() {
  modal((box, close) => {
    box.classList.add('warn');
    box.append(h('h3', {}, 'Delete your profile?'), h('p', {}, 'Everything you have learned on this device will be deleted: your profile, schedule, statistics, records and card fixes.'),
      h('div', { class: 'actions' }, h('button', { class: 'btn plain', 'data-autofocus': true, onclick: close }, 'No, keep everything'), h('button', { class: 'btn danger', onclick: () => { close(); second(); } }, 'Yes, delete')));
  });
  const second = () => modal((box, close) => {
    box.classList.add('warn');
    box.append(h('h3', {}, 'Are you absolutely sure?'), h('p', {}, 'Your progress will be deleted entirely and cannot be recovered. If you might want it later, download your progress first.'),
      h('div', { class: 'actions' }, h('button', { class: 'btn plain', 'data-autofocus': true, onclick: close }, 'No, go back'),
        h('button', { class: 'btn danger', onclick: () => { close(); try { localStorage.removeItem(KEY); } catch (e) { /* */ } S = defaults(); if (CLOUD && CLOUD.user) { S.owner = CLOUD.user.id; S.updatedAt = Date.now(); pushNow(); } applyTheme(); toast('Your profile and progress were deleted'); go('#/welcome'); } }, 'Yes, delete everything')));
  });
}

/* ================================================================ router */
function render() {
  stopLive(); setKeys(null);
  const r = root();
  if (!BOOK && !LITE) return;
  const hash = location.hash || '#/';
  const [path, query] = hash.split('?');
  const [, route, a, b] = path.split('/');
  const params = new URLSearchParams(query || '');
  let view;
  if (!BOOK) {
    try {
      if (route === 'students') view = views.students();
      else if (route === 'admin') view = views.admin();
      else if (route === 'account' && S.profile) view = views.account();
      else view = views.home();
    } catch (err) { console.error(err); view = shell('#/', h('section', { class: 'hero' }, h('h1', { class: 'h2' }, 'This page failed to load.'), h('pre', { style: { textAlign: 'left', whiteSpace: 'pre-wrap' } }, String(err && err.stack || err)))); }
    clear(r); r.append(view); window.scrollTo(0, 0); revealOnScroll();
    return;
  }
  if ((!S.profile || !S.planSet) && route !== 'welcome') { location.replace('#/welcome'); return; }
  try {
    if (route === 'welcome') view = (S.profile && S.planSet) ? views.today() : views.welcome();
    else if (!route) view = views.today();
    else if (route === 'units') view = views.units();
    else if (route === 'unit') view = views.unit(a);
    else if (route === 'test') view = views.test(a);
    else if (route === 'games') view = views.games();
    else if (route === 'play') view = views.play(a, b, params.get('back'));
    else if (route === 'cpe') view = a === 'run' ? views.cpeRun() : views.cpe();
    else if (route === 'plan') view = views.plan();
    else if (route === 'account') view = views.account();
    else if (route === 'students') view = views.students();
    else if (route === 'admin') view = views.admin();
    else view = views.today();
  } catch (err) { console.error(err); view = shell('#/', h('section', { class: 'hero' }, h('h1', { class: 'h2' }, 'This page failed to load.'), h('pre', { style: { textAlign: 'left', whiteSpace: 'pre-wrap' } }, String(err && err.stack || err)))); }
  clear(r); r.append(view);
  window.scrollTo(0, 0);
  revealOnScroll();
  if (S.profile && S.planSet && route !== 'play' && route !== 'cpe' && $('.streak-chip')) setTimeout(() => { if (S.flameSeen !== dkey()) flameIntro(); else if (!S.tourSeen) explainProgress(); }, 350);
}
window.addEventListener('hashchange', render);

async function boot() {
  applyTheme();
  const r = root();
  const start = book => { indexBook(book); window.__skipper = { markHead, headVariants, tokenize, align, alignHead, allExamples, cpe: () => CPEX, buildCpe, markItem, parseUnits, flameIntro, explainProgress, S: () => S, ALL, UNITS, E, makeCloze, quizDef, acceptedFor, checkTyped, startLearn, startReview, gradeCard, GAMES }; render(); };
  const local = async () => { let code = null; try { code = localStorage.getItem(CODE_KEY); } catch (e) { /* */ } if (code) { try { return start(await decryptBook(code)); } catch (e) { try { localStorage.removeItem(CODE_KEY); } catch (_) { /* */ } } } clear(r).append(views.lock(start)); };
  if (!CLOUD) return local();
  const opened = async () => {
    clear(r).append(h('div', { class: 'welcome' }, h('div', { class: 'welcome-box' }, h('div', { class: 'logo' }, 'L'), h('p', { class: 'hero-sub' }, 'Opening your account…'))));
    try { await cloudSync(); } catch (e) { if (!CLOUD.user) return clear(r).append(views.signin(opened)); toast('Working offline — progress will sync later'); }
    let code = null; try { code = await CLOUD.bookCode(); } catch (e) { /* offline: try the saved code */ }
    if (code) { try { try { localStorage.setItem(CODE_KEY, code); } catch (_) { /* */ } return start(await decryptBook(code)); } catch (e) { /* fall through */ } }
    let saved = null; try { saved = localStorage.getItem(CODE_KEY); } catch (e) { /* */ }
    if (saved) return local();
    LITE = { start }; window.__skipper = { S: () => S }; render();
  };
  if (CLOUD.fromLink && !CLOUD.fromLink.error && CLOUD.user) return clear(r).append(views.signin(opened));
  if (await CLOUD.session()) return opened();
  clear(r).append(views.signin(opened));
}
/* after sign-in: load the account, merge its saved progress with this device, save both */
async function cloudSync() {
  const u = CLOUD.user;
  if (S.owner && S.owner !== u.id) { S = defaults(); }        // this device held someone else's progress
  const prof = await CLOUD.profile();
  const remote = await CLOUD.pull();
  S = mergeState(S, remote && remote.data);
  S.owner = u.id;
  S.account = prof ? { email: prof.email, role: prof.role, skipper: prof.skipper } : S.account;
  const name = (prof && prof.name) || (S.profile && S.profile.name) || '';
  if (name) S.profile = Object.assign({ createdAt: Date.now() }, S.profile || {}, { name, email: (prof && prof.email) || u.email });
  if (prof && !prof.name && name) CLOUD.rename(name).catch(() => {});
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* */ }
  applyTheme();
  await pushNow();
}
async function signOut() {
  await pushNow();
  await CLOUD.signOut();
  try { localStorage.removeItem(KEY); localStorage.removeItem(CODE_KEY); } catch (e) { /* */ }
  location.hash = ''; location.reload();
}
boot();
})();
