/* Skipper — C2 vocabulary trainer for Mark Skipper's "Advanced Grammar & Vocabulary".
   Static site (GitHub Pages). Book data is AES-GCM encrypted; the access code unlocks it in the browser.
   Progress and profile live in this browser (localStorage). */
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
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } };
const applyTheme = () => { if (S.settings.theme === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', S.settings.theme); };

/* ================================================================ data (filled after unlock) */
let BOOK = null, UNITS = [], UBY = {}, EBY = {}, ALL = [], PARTS = [];
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
 'upset:upsetting;withdraw:withdrew,withdrawn;overtake:overtook,overtaken;understand:understood;mislead:misled;foresee:foresaw,foreseen;seek:sought').split(';')
  .forEach(s => { const [b, f] = s.split(':'); IRR[b] = new Set(f.split(',')); });
const STOPT = new Set(['to', 'sb', 'sth', "one's", 'someone', 'something', 'etc', "sb's", "sth's", 'sb/sth', 'sth/sb']);
const ARTICLES = new Set(['a', 'an', 'the']);
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
function headVariants(head) {
  if (variantsCache[head]) return variantsCache[head];
  let t = String(head).toLowerCase().replace(/[’‘]/g, "'").replace(/\[[^\]]*\]/g, ' ');
  const bases = /\(/.test(t) ? [t.replace(/[()]/g, ' '), t.replace(/\([^)]*\)/g, ' ')] : [t];
  const out = [], seen = new Set();
  for (const b of bases) {
    const raw = b.replace(/[^a-z0-9'\/ -]+/g, ' ').replace(/-/g, ' ').split(/\s+/).filter(Boolean);
    let toks = raw.filter(x => !STOPT.has(x) && !/^(sb|sth)(\/(sb|sth))?$/.test(x));
    if (toks.length > 1 && ARTICLES.has(toks[0])) toks = toks.slice(1);
    for (const v of expandAlt(toks)) { const k = v.join(' '); if (v.length && !seen.has(k)) { seen.add(k); out.push(v); } }
  }
  out.sort((a, b) => b.length - a.length);
  return (variantsCache[head] = out);
}
function tokMatch(k, t) {
  if (k === t) return true;
  if (k.length >= 3 && t.length >= 3) {
    if (IRR[k] && IRR[k].has(t)) return true;
    if (IRR[t] && IRR[t].has(k)) return true;
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
function align(key, toks) {
  let best = null;
  for (let i = 0; i < toks.length; i++) {
    if (!tokMatch(key[0], toks[i].n)) continue;
    const pos = [i]; let prev = i, ok = true;
    for (let j = 1; j < key.length; j++) {
      let found = -1;
      for (let q = prev + 1; q <= Math.min(toks.length - 1, prev + 4); q++) if (tokMatch(key[j], toks[q].n)) { found = q; break; }
      if (found < 0) { ok = false; break; }
      pos.push(found); prev = found;
    }
    if (ok) { const span = prev - i; if (!best || span < best.span) best = { pos, span }; }
  }
  return best ? best.pos : null;
}
const allExamples = id => { const e = E(id); return e.examples.concat((e.cam && e.cam.ex) || []); };
const clozeCache = {};
function makeCloze(id, pickRandom) {
  const e = E(id), exs = allExamples(id);
  const ck = id + '|' + e.head + '|' + exs.join('|');
  if (!pickRandom && clozeCache[ck] !== undefined) return clozeCache[ck];
  const found = [];
  const vs = headVariants(e.head);
  for (const ex of exs) {
    const { src, toks } = tokenize(ex);
    for (const v of vs) { const pos = align(v, toks); if (pos) { found.push({ src, toks, pos, answer: pos.map(i => toks[i].raw).join(' ') }); break; } }
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
  for (const v of headVariants(E(id).head)) { const pos = align(v, toks); if (pos) return sentenceNodes({ src, toks, pos }, 'mark'); }
  return [example];
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
    const nb = $('#next', card); if (nb) nb.focus();
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
    const check = () => { if (answered) return; typed = input.value.trim(); const r = checkTyped(input.value, accepted); correctForm = closestForm(input.value, accepted); input.classList.add(r === 'no' ? 'no' : 'ok'); input.disabled = true; afterFeedback(r); };
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
  const tabs = [['#/', 'Today'], ['#/units', 'Units'], ['#/games', 'Games'], ['#/plan', 'Plan'], ['#/account', 'Account']];
  const initials = ((S.profile && S.profile.name) || '?').trim().split(/\s+/).map(x => x[0]).join('').slice(0, 2).toUpperCase();
  return h('div', {},
    h('nav', { class: 'nav', 'aria-label': 'Main' }, h('div', { class: 'nav-in' },
      h('div', { class: 'brand', onclick: () => go('#/') }, h('span', { class: 'brand-mark' }, 'S'), h('span', {}, 'Skipper'), h('span', { class: 'full muted', style: { fontWeight: 400, fontSize: '13px' } }, 'C2 Trainer')),
      h('div', { class: 'nav-links' }, tabs.map(([hr, t]) => h('a', { class: active === hr ? 'on' : '', href: hr }, t))),
      h('button', { class: 'avatar', title: 'Account', onclick: () => go('#/account') }, initials))),
    body,
    h('footer', { class: 'foot' }, 'Built for private study from Mark Skipper, Advanced Grammar & Vocabulary (Express Publishing). Extra examples link to the Cambridge Dictionary.'));
}
function revealOnScroll() {
  const els = document.querySelectorAll('.reveal:not(.in)');
  if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); return; }
  const io = new IntersectionObserver(entries => { entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }); }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
  els.forEach((e, i) => { e.style.transitionDelay = Math.min(i % 8, 6) * 0.05 + 's'; io.observe(e); });
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
    h('div', { class: 'logo' }, 'S'), heroTitle('Skipper', 'grad-text'),
    h('p', { class: 'hero-sub' }, 'The whole of Advanced Grammar & Vocabulary, built for C2.'),
    form, h('p', { class: 'muted small', style: { marginTop: '22px' } }, 'The word lists are private. Ask the person who shared this site for the access code.')));
  setTimeout(() => input.focus(), 50);
  return page;
};
views.welcome = () => {
  let step = S.profile ? 2 : 1;
  const box = h('div', { class: 'welcome-box' });
  const page = h('div', { class: 'welcome' }, box);
  const draft = { name: '', email: '', chunk: S.settings.chunk, newPerDay: S.settings.newPerDay, order: S.settings.order };
  const steps = () => h('div', { class: 'steps' }, [1, 2].map(i => h('i', { class: i <= step ? 'on' : '' })));
  const segOf = (opts, key) => { const s = h('div', { class: 'seg' }); const draw = () => { clear(s); opts.forEach(([v, t]) => s.append(h('button', { type: 'button', class: draft[key] === v ? 'on' : '', onclick: () => { draft[key] = v; draw(); } }, t))); }; draw(); return s; };
  const draw = () => {
    clear(box);
    if (step === 1) {
      const name = h('input', { type: 'text', placeholder: 'Your name', autocomplete: 'given-name', required: true, value: draft.name });
      const email = h('input', { type: 'email', placeholder: 'name@example.com', autocomplete: 'email', value: draft.email });
      const err = h('div', { class: 'err' });
      box.append(steps(), h('div', { class: 'logo' }, 'S'), heroTitle('Create your profile'),
        h('p', { class: 'hero-sub' }, 'Tell us your name. Any email works — Gmail, Mail.ru, Yandex, iCloud.'),
        h('form', { onsubmit: ev => { ev.preventDefault(); if (!name.value.trim()) { err.textContent = 'Enter your name to continue.'; return; } draft.name = name.value.trim(); draft.email = email.value.trim(); S.profile = { name: draft.name, email: draft.email, createdAt: Date.now() }; save(); step = 2; draw(); } },
          h('label', { class: 'fl' }, 'Name'), name, h('label', { class: 'fl' }, 'Email (optional)'), email, err,
          h('button', { class: 'btn lg', type: 'submit' }, 'Create profile')),
        h('p', { class: 'muted small', style: { marginTop: '18px' } }, 'Your profile and progress are saved in this browser. To continue on another device, use Account → Move to another device.'));
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
      h('h2', { class: 'h2 reveal' }, 'The whole book.'),
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
    h('section', { class: 'section dark', id: 'games' }, h('div', { class: 'container' },
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
  if (!S.gameUnits || !S.gameUnits.length) { const st = startedUnits(); S.gameUnits = st.length ? st.slice(0, 12) : [queue()[0]]; }
  const sel = new Set(S.gameUnits.filter(x => UBY[x]));
  const tilesHost = h('div');
  const summary = h('p', { class: 'lead', style: { color: '#a1a1a6' } });
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
  const quick = (label, fn) => h('button', { class: 'btn sm plain', onclick: () => { sel.clear(); fn().forEach(x => sel.add(x)); render(); } }, label);
  const page = shell('#/games',
    h('section', { class: 'section dark', style: { paddingTop: '88px' } }, h('div', { class: 'container' },
      h('div', { class: 'center' }, heroTitle('Play.'), h('p', { class: 'hero-sub', style: { color: '#a1a1a6' } }, 'Nine games. Pick the units, and every game uses only their words.')),
      h('div', { class: 'card', style: { margin: '44px 0 34px', background: '#1d1d1f' } },
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

/* ================================================================ Account */
views.account = () => {
  const P = S.profile || { name: '', email: '' };
  const name = h('input', { type: 'text', value: P.name, style: { width: '100%' } });
  const email = h('input', { type: 'email', value: P.email || '', style: { width: '100%' } });
  const imp = h('input', { type: 'file', accept: '.json', class: 'hidden', onchange: ev => { const f = ev.target.files[0]; if (!f) return; f.text().then(t => { try { const p = JSON.parse(t); if (!p || !p.cards) throw new Error('bad'); S = Object.assign(defaults(), p); S.settings = Object.assign(defaults().settings, p.settings || {}); save(); applyTheme(); toast('Progress imported'); render(); } catch (e) { toast('That file isn’t a Skipper progress file'); } }); } });
  const seg = (key, opts) => { const s = h('div', { class: 'seg' }); const draw = () => { clear(s); opts.forEach(([v, t]) => s.append(h('button', { type: 'button', class: String(S.settings[key]) === String(v) ? 'on' : '', onclick: () => { S.settings[key] = v; save(); applyTheme(); draw(); } }, t))); }; draw(); return s; };
  const line = (label, ctl) => h('div', { class: 'row', style: { padding: '14px 0', borderTop: '1px solid var(--line)' } }, h('span', { class: 'grow' }, label), ctl);
  return shell('#/account',
    h('section', { class: 'hero' }, heroTitle(S.profile ? S.profile.name : 'Your account'), h('p', { class: 'hero-sub' }, S.profile && S.profile.email ? S.profile.email : 'Profile and progress are stored in this browser.')),
    h('section', { class: 'section gray' }, h('div', { class: 'narrow' },
      h('div', { class: 'card reveal' }, h('h3', { class: 'h3', style: { fontSize: '24px' } }, 'Profile'),
        h('label', { class: 'fl' }, 'Name'), name, h('label', { class: 'fl' }, 'Email'), email,
        h('div', { class: 'row', style: { marginTop: '18px' } }, h('button', { class: 'btn', onclick: () => { if (!name.value.trim()) return toast('Enter a name'); S.profile = Object.assign({}, S.profile || { createdAt: Date.now() }, { name: name.value.trim(), email: email.value.trim() }); save(); toast('Profile saved'); render(); } }, 'Save profile'))),
      h('div', { class: 'card reveal', style: { marginTop: '22px' } }, h('h3', { class: 'h3', style: { fontSize: '24px', marginBottom: '6px' } }, 'Learning plan'),
        line('Words at once', seg('chunk', [[5, '5'], [10, '10'], [15, '15'], ['all', 'Whole unit']])),
        line('New words per day', seg('newPerDay', [[10, '10'], [15, '15'], [20, '20'], [30, '30']])),
        line('Study order', seg('order', [['cpe', 'CPE-first'], ['book', 'Book order']])),
        line('Target retention', seg('retention', [[0.85, '85%'], [0.9, '90%'], [0.95, '95%']])),
        line('Auto-play pronunciation', seg('accent', [['uk', 'British'], ['us', 'American']])),
        line('Appearance', seg('theme', [['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']]))),
      h('div', { class: 'card reveal', style: { marginTop: '22px' } }, h('h3', { class: 'h3', style: { fontSize: '24px' } }, 'Move to another device'),
        h('p', { class: 'muted' }, 'Download your progress file here, then open the site on the other device and import it.'),
        h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => download(`skipper-progress-${dkey()}.json`, JSON.stringify(S)) }, 'Download progress'), h('button', { class: 'btn plain', onclick: () => imp.click() }, 'Import progress'), imp)),
      h('div', { class: 'card reveal', style: { marginTop: '22px' } }, h('h3', { class: 'h3', style: { fontSize: '24px' } }, 'All words'),
        h('p', { class: 'muted' }, `Every one of the ${ALL.length} cards, ready for Anki (File → Import).`),
        h('div', { class: 'row' }, h('button', { class: 'btn plain', onclick: () => download('skipper-all-anki.txt', ankiText(ALL.map(e => e.id), 'Skipper'), 'text/plain') }, 'Download all for Anki'),
          h('button', { class: 'btn plain', onclick: () => download('skipper-edits.json', JSON.stringify(S.edits)) }, `Download my card fixes (${Object.keys(S.edits).length})`))),
      h('div', { class: 'danger-zone reveal', style: { marginTop: '40px' } }, h('h3', {}, 'Danger Zone'),
        h('p', {}, 'Delete your profile and all your progress on this device: learning history, schedule, test results, game records and card fixes. This can’t be undone.'),
        h('button', { class: 'btn danger', onclick: deleteFlow }, 'Delete my profile and progress')))));
};
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
        h('button', { class: 'btn danger', onclick: () => { close(); try { localStorage.removeItem(KEY); } catch (e) { /* */ } S = defaults(); applyTheme(); toast('Your profile and progress were deleted'); go('#/welcome'); } }, 'Yes, delete everything')));
  });
}

/* ================================================================ router */
function render() {
  stopLive(); setKeys(null);
  const r = root();
  if (!BOOK) return;
  const hash = location.hash || '#/';
  const [path, query] = hash.split('?');
  const [, route, a, b] = path.split('/');
  const params = new URLSearchParams(query || '');
  let view;
  if ((!S.profile || !S.planSet) && route !== 'welcome') { location.replace('#/welcome'); return; }
  try {
    if (route === 'welcome') view = (S.profile && S.planSet) ? views.today() : views.welcome();
    else if (!route) view = views.today();
    else if (route === 'units') view = views.units();
    else if (route === 'unit') view = views.unit(a);
    else if (route === 'test') view = views.test(a);
    else if (route === 'games') view = views.games();
    else if (route === 'play') view = views.play(a, b, params.get('back'));
    else if (route === 'plan') view = views.plan();
    else if (route === 'account') view = views.account();
    else view = views.today();
  } catch (err) { console.error(err); view = shell('#/', h('section', { class: 'hero' }, h('h1', { class: 'h2' }, 'This page failed to load.'), h('pre', { style: { textAlign: 'left', whiteSpace: 'pre-wrap' } }, String(err && err.stack || err)))); }
  clear(r); r.append(view);
  window.scrollTo(0, 0);
  revealOnScroll();
}
window.addEventListener('hashchange', render);

async function boot() {
  applyTheme();
  const r = root();
  const start = book => { indexBook(book); window.__skipper = { S: () => S, ALL, UNITS, E, makeCloze, quizDef, acceptedFor, startLearn, startReview, gradeCard, GAMES }; render(); };
  let code = null; try { code = localStorage.getItem(CODE_KEY); } catch (e) { /* */ }
  if (code) { try { return start(await decryptBook(code)); } catch (e) { try { localStorage.removeItem(CODE_KEY); } catch (_) { /* */ } } }
  clear(r).append(views.lock(start));
}
boot();
})();
