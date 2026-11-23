/* Brightword · Speaking roulette — for live lessons (and Zoom screen sharing).
   The teacher picks the exam, what to practise (debate, free discussion or one part of the Speaking paper),
   the level, the themes and the speaking time, spins the drum and gets a topic with a timer.
   Topics come from assets/speaking-bank.js. Settings and the topics already used this session are kept
   in the browser, so the same topic does not come up twice in one lesson. */
window.LexiconRoulette = function (X) {
  'use strict';
  const { h, clear, shell, go, toast, heroTitle, examTabs, examPick } = X;
  const B = window.LexiconSpeakingBank;
  if (!B) return null;

  const EXAM = { cpe: 'C2 Proficiency', cae: 'C1 Advanced' };
  const MODES = {
    cpe: [['debate', 'Debate'], ['discuss', 'Discussion'], ['p1', 'Part 1 · Interview'], ['p2', 'Part 2 · Pictures'], ['p3', 'Part 3 · Long turn'], ['exam', 'Any exam part']],
    cae: [['debate', 'Debate'], ['discuss', 'Discussion'], ['p1', 'Part 1 · Interview'], ['p2', 'Part 2 · Long turn'], ['p3', 'Part 3 · Collaborative'], ['p4', 'Part 4 · Discussion'], ['exam', 'Any exam part']],
  };
  const PART_NAME = {
    cpe: { p1: 'Part 1 · Interview', p2: 'Part 2 · Collaborative task', p3: 'Part 3 · Long turn and discussion' },
    cae: { p1: 'Part 1 · Interview', p2: 'Part 2 · Long turn', p3: 'Part 3 · Collaborative task', p4: 'Part 4 · Discussion' },
  };
  const LEVELS = [[0, 'Any'], [1, 'Easy'], [2, 'Medium'], [3, 'Hard']];
  const LVL = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };
  const TIMES = [[0, 'Exam timing'], [30, '0:30'], [60, '1 min'], [120, '2 min'], [180, '3 min'], [240, '4 min'], [300, '5 min'], [420, '7 min'], [600, '10 min']];
  const DEFAULT_SECS = { debate: 120, discuss: 180 };

  /* ---------------------------------------------------------------- settings, kept in this browser */
  const KEY = 'lexicon.roulette.v1', USED = 'lexicon.roulette.used';
  const load = (k, d) => { try { return Object.assign(d, JSON.parse(localStorage.getItem(k) || '{}')); } catch (e) { return d; } };
  const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } };
  const cfg = load(KEY, { mode: 'debate', lvl: 0, themes: [], secs: 120, side: 'random', sound: false });
  let used = []; try { used = JSON.parse(sessionStorage.getItem(USED) || '[]'); } catch (e) { used = []; }
  const saveUsed = () => { try { sessionStorage.setItem(USED, JSON.stringify(used)); } catch (e) { /* */ } };

  const label = c => c.mode === 'p3' && c.exam === 'cae' ? c.title.split('. ')[0].replace(/^Here are (some )?/, '').replace(/^./, m => m.toUpperCase()) : c.title;
  const isExamMode = m => /^p\d$|^exam$/.test(m);
  const pool = exam => B.cards.filter(c => c.exam === exam
    && (cfg.mode === 'exam' ? /^p\d$/.test(c.mode) : c.mode === cfg.mode)
    && (!cfg.lvl || c.lvl === cfg.lvl)
    && (!cfg.themes.length || cfg.themes.includes(c.theme)));

  /* ---------------------------------------------------------------- sound (off by default): a soft tick for the drum, a chime at the end */
  let actx = null;
  function beep(freq, dur, vol) {
    if (!cfg.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = 'sine'; o.frequency.value = freq; g.gain.value = vol || 0.05;
      g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur);
      o.connect(g).connect(actx.destination); o.start(); o.stop(actx.currentTime + dur);
    } catch (e) { /* no audio */ }
  }

  /* ---------------------------------------------------------------- the stages of one topic: what is on screen and for how long */
  function stagesOf(c) {
    const ex = c.exam;
    if (c.mode === 'debate') return [{ label: 'Make your case', secs: 120 }];
    if (c.mode === 'discuss') return [{ label: 'Discuss', secs: 180 }];
    if (c.mode === 'p1') return [{ label: 'Answer', secs: ex === 'cpe' ? 40 : 30 }];
    if (c.mode === 'p4') return [{ label: 'Answer and develop', secs: 60 }];
    if (ex === 'cae' && c.mode === 'p2') return [{ label: 'Candidate A · compare two pictures', secs: 60, text: c.q.replace(c.title, '').trim() }, { label: 'Candidate B · short answer', secs: 30, text: c.follow }];
    if (ex === 'cae' && c.mode === 'p3') return [{ label: 'Discuss the ideas', secs: 120 }, { label: 'Decide', secs: 60, text: c.decide }];
    if (ex === 'cpe' && c.mode === 'p2') return [{ label: 'Pictures A and B', secs: 60, text: c.q1, only: 2 }, { label: 'All the pictures · decide', secs: 180, text: c.q2 }];
    if (ex === 'cpe' && c.mode === 'p3') return [{ label: 'Long turn', secs: 120 }, { label: 'Discussion', secs: 240, list: c.discuss }];
    return [{ label: 'Speak', secs: 60 }];
  }

  /* ---------------------------------------------------------------- photos */
  function picture(q, cap, letter, dim) {
    const p = B.photo(q);
    const box = h('figure', { class: 'sp-pic rl-pic' + (dim ? ' dim' : '') }, h('div', { class: 'sp-ph' }, h('span', {}, cap)), h('b', { class: 'sp-letter' }, letter));
    if (p) {
      const img = h('img', { src: p.src, alt: cap, loading: 'eager', referrerpolicy: 'no-referrer' });
      img.onload = () => { const ph = box.querySelector('.sp-ph'); if (ph) ph.replaceWith(img); };
      box.append(h('figcaption', {}, h('a', { href: p.page, target: '_blank', rel: 'noopener' }, 'Photo'), p.author ? ` · ${p.author}` : '', ` · ${p.licence}`));
    }
    return box;
  }

  /* ---------------------------------------------------------------- page */
  const views = {};
  views.page = examArg => {
    const exam = examPick ? examPick(examArg) : (examArg === 'cae' ? 'cae' : 'cpe');
    if (!MODES[exam].some(([m]) => m === cfg.mode)) cfg.mode = 'debate';
    const save = () => store(KEY, cfg);
    let current = null, timer = null, left = 0, total = 0, stageIx = 0, spinning = false;

    /* ----- settings */
    const settings = h('div', { class: 'rl-settings card' });
    const countEl = h('span', { class: 'muted small' });
    function seg(items, val, on) { return h('div', { class: 'seg' }, items.map(([v, label]) => h('button', { class: v === val ? 'on' : '', onclick: () => on(v) }, label))); }
    function drawSettings() {
      const isDeb = cfg.mode === 'debate';
      const times = isExamMode(cfg.mode) ? TIMES : TIMES.filter(([s]) => s);
      if (!isExamMode(cfg.mode) && !cfg.secs) cfg.secs = DEFAULT_SECS[cfg.mode] || 120;
      clear(settings).append(...[
        h('div', { class: 'rl-row' }, h('div', { class: 'rl-lab' }, 'Practise'), h('div', { class: 'chips' }, MODES[exam].map(([m, label]) => h('button', { class: 'chip' + (m === cfg.mode ? ' on' : ''), onclick: () => { cfg.mode = m; cfg.secs = isExamMode(m) ? 0 : (DEFAULT_SECS[m] || 120); save(); drawSettings(); } }, label)))),
        h('div', { class: 'rl-row' }, h('div', { class: 'rl-lab' }, 'Level'), seg(LEVELS, cfg.lvl, v => { cfg.lvl = v; save(); drawSettings(); }),
          isDeb && (cfg.lvl === 3 || !cfg.lvl) ? h('span', { class: 'muted small rl-note' }, 'Hard debates are devil’s advocate: the speaker defends the motion even if they believe the opposite.') : null),
        h('div', { class: 'rl-row' }, h('div', { class: 'rl-lab' }, 'Themes'), h('div', { class: 'chips' },
          h('button', { class: 'chip' + (!cfg.themes.length ? ' on' : ''), onclick: () => { cfg.themes = []; save(); drawSettings(); } }, 'All'),
          Object.entries(B.THEMES).map(([k, label]) => h('button', { class: 'chip' + (cfg.themes.includes(k) ? ' on' : ''), onclick: () => { cfg.themes = cfg.themes.includes(k) ? cfg.themes.filter(x => x !== k) : [...cfg.themes, k]; save(); drawSettings(); } }, label)))),
        h('div', { class: 'rl-row' }, h('div', { class: 'rl-lab' }, 'Speaking time'), seg(times, cfg.secs, v => { cfg.secs = v; save(); drawSettings(); if (current) setStage(stageIx); })),
        isDeb ? h('div', { class: 'rl-row' }, h('div', { class: 'rl-lab' }, 'Side'), seg([['random', 'Random'], ['for', 'For'], ['against', 'Against']], cfg.side, v => { cfg.side = v; save(); drawSettings(); })) : null,
        h('div', { class: 'rl-row rl-foot' }, countEl,
          h('button', { class: 'btn sm plain', onclick: () => { used = []; saveUsed(); drawSettings(); toast('All topics are back in the drum'); } }, 'Reset used topics'),
          h('button', { class: 'btn sm plain', 'aria-pressed': String(cfg.sound), onclick: () => { cfg.sound = !cfg.sound; save(); drawSettings(); beep(880, .12, .06); } }, cfg.sound ? 'Sound: on' : 'Sound: off'))].filter(Boolean));
      const all = pool(exam), fresh = all.filter(c => !used.includes(c.id));
      countEl.textContent = all.length ? `${all.length} topics match · ${fresh.length} not used yet` : 'No topics match. Choose another level or more themes.';
      spinBtn.disabled = !all.length;
    }

    /* ----- the drum */
    const reel = h('div', { class: 'rl-reel' });
    const drum = h('div', { class: 'rl-drum', 'aria-hidden': 'true' }, reel, h('div', { class: 'rl-window' }));
    const spinBtn = h('button', { class: 'btn lg rl-spin', onclick: () => spin() }, 'Spin');
    const fsBtn = h('button', { class: 'btn plain rl-fs', title: 'Full screen, for sharing in Zoom', onclick: () => fullscreen() }, 'Full screen');
    const result = h('div', { class: 'rl-result', 'aria-live': 'polite' });
    const stage = h('div', { class: 'rl-stage' }, h('div', { class: 'rl-drumwrap' }, drum, h('div', { class: 'row rl-actions' }, spinBtn, fsBtn)), result);
    reel.append(h('div', { class: 'rl-item muted' }, ' '), h('div', { class: 'rl-item rl-hint' }, 'Choose the settings and press Spin'), h('div', { class: 'rl-item muted' }, ' '));

    const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    function spin() {
      if (spinning) return;
      const all = pool(exam); if (!all.length) return;
      let fresh = all.filter(c => !used.includes(c.id));
      if (!fresh.length) { used = used.filter(id => !all.some(c => c.id === id)); saveUsed(); fresh = all; toast('Every matching topic has been used. Starting again.'); }
      const pick = fresh[Math.floor(Math.random() * fresh.length)];
      used.push(pick.id); saveUsed();
      stopTimer(); spinning = true; spinBtn.disabled = true;
      result.classList.remove('in');

      const fillers = shuffle(all.filter(c => c !== pick).slice()).slice(0, 26);
      while (fillers.length < 26 && all.length > 1) fillers.push(all[Math.floor(Math.random() * all.length)]);
      const seq = [...fillers, pick, ...shuffle(all.slice()).slice(0, 2)];
      const finalIx = fillers.length;
      clear(reel).append(...seq.map((c, i) => h('div', { class: 'rl-item' + (i === finalIx ? ' win' : '') }, h('span', {}, label(c)))));
      const RH = drum.clientHeight / 3;                   // three rows are visible; the winner stops in the middle one
      const end = -(finalIx - 1) * RH;
      const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      const phone = window.matchMedia && matchMedia('(max-width: 640px)').matches;
      const dur = reduce ? 0 : phone ? 2100 : 3000;
      drum.classList.add('spinning');
      const done = () => { drum.classList.remove('spinning'); drum.classList.add('landed'); setTimeout(() => drum.classList.remove('landed'), 900); spinning = false; spinBtn.disabled = false; spinBtn.textContent = 'Spin again'; beep(660, .25, .07); show(pick); drawSettings(); };
      if (!dur || !reel.animate) { reel.style.transform = `translateY(${end}px)`; done(); return; }
      const anim = reel.animate([
        { transform: 'translateY(0)', filter: 'blur(0)' },
        { transform: `translateY(${end * 0.35}px)`, filter: 'blur(1.6px)', offset: 0.25 },
        { transform: `translateY(${end - RH * 0.12}px)`, filter: 'blur(0)', offset: 0.9 },
        { transform: `translateY(${end}px)`, filter: 'blur(0)' },
      ], { duration: dur, easing: 'cubic-bezier(.2,.65,.25,1)', fill: 'forwards' });
      let lastRow = 0;
      const tick = () => {                                   // a soft click every time a row passes the window
        if (!spinning) return;
        const m = new DOMMatrixReadOnly(getComputedStyle(reel).transform);
        const row = Math.floor(-m.m42 / RH);
        if (row !== lastRow) { lastRow = row; beep(1400, .03, .025); }
        requestAnimationFrame(tick);
      };
      if (cfg.sound) requestAnimationFrame(tick);
      anim.onfinish = done;
    }

    /* ----- the topic and its timer */
    const ring = (frac) => {
      const R = 52, C = 2 * Math.PI * R;
      return h('div', { class: 'rl-ring', 'aria-hidden': 'true', html:
        `<svg class="rl-ring-svg" viewBox="0 0 120 120"><circle cx="60" cy="60" r="${R}" class="rl-ring-bg"/><circle cx="60" cy="60" r="${R}" class="rl-ring-fg" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - frac)}"/></svg>` });
    };
    const fmt = x => { const s = Math.max(0, Math.ceil(x)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
    const clockBox = h('div', { class: 'rl-clock' });
    const startBtn = h('button', { class: 'btn', onclick: () => (timer ? pause() : start()) }, 'Start');
    const resetBtn = h('button', { class: 'btn plain', onclick: () => setStage(stageIx) }, 'Reset');
    const nextBtn = h('button', { class: 'btn plain', onclick: () => setStage(stageIx + 1) }, 'Next stage');
    const stageBody = h('div', { class: 'rl-stagebody' });
    let side = 'for';

    function drawClock() {
      clear(clockBox).append(ring(total ? left / total : 0), h('div', { class: 'rl-time' + (left <= 0 ? ' over' : left <= 10 ? ' soon' : '') }, left <= 0 ? 'Time!' : fmt(left)));
    }
    function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }
    function start() {
      if (left <= 0) setStage(stageIx);
      startBtn.textContent = 'Pause';
      let last = performance.now();
      timer = setInterval(() => {
        if (!document.body.contains(clockBox)) { stopTimer(); return; }   // left the page
        const now = performance.now(); left -= (now - last) / 1000; last = now;
        if (left <= 0) { left = 0; stopTimer(); startBtn.textContent = 'Start'; beep(523, .35, .08); setTimeout(() => beep(784, .5, .08), 220); clockBox.classList.add('ring-done'); }
        drawClock();
      }, 200);
    }
    function pause() { stopTimer(); startBtn.textContent = 'Resume'; }
    function setStage(ix) {
      const st = stagesOf(current);
      stageIx = Math.max(0, Math.min(ix, st.length - 1));
      const s = st[stageIx];
      stopTimer(); clockBox.classList.remove('ring-done');
      total = left = (cfg.secs || s.secs);
      startBtn.textContent = 'Start';
      nextBtn.classList.toggle('hidden', stageIx >= st.length - 1);
      drawClock(); drawStage(st, s);
    }

    function drawStage(st, s) {
      const c = current, kids = [];
      if (st.length > 1) kids.push(h('div', { class: 'rl-steps' }, st.map((x, i) => h('span', { class: i === stageIx ? 'on' : i < stageIx ? 'done' : '' }, `${i + 1}. ${x.label}`))));
      if (c.mode === 'debate') {
        kids.push(h('div', { class: 'rl-side ' + side }, side === 'for' ? 'Argue FOR the motion' : 'Argue AGAINST the motion'));
        if (c.devil) kids.push(h('p', { class: 'muted small' }, 'Devil’s advocate: defend this side with conviction, even if you believe the opposite. Use evidence, examples and rebuttals.'));
        else kids.push(h('p', { class: 'muted small' }, 'Give at least two clear arguments with examples, and answer the strongest point on the other side.'));
      } else if (c.mode === 'discuss') {
        const more = h('ul', { class: 'rl-follow hidden' }, c.follow.map(f => h('li', {}, f)));
        kids.push(h('button', { class: 'btn sm plain', onclick: ev => { more.classList.remove('hidden'); ev.target.remove(); } }, 'Show follow-up questions'), more);
      } else if (c.mode === 'p2') {
        if (s.text) kids.push(h('p', { class: 'rl-instr' }, s.text));
        const letters = 'ABCD';
        kids.push(h('div', { class: 'sp-pics rl-pics n' + c.pics.length }, c.pics.map(([q, cap], i) => picture(q, cap, letters[i], s.only && i >= s.only))));
      } else if (c.mode === 'p3' && c.exam === 'cae') {
        if (stageIx === 0) kids.push(h('div', { class: 'rl-map' }, h('div', { class: 'rl-map-q' }, c.title.split('. ')[0].replace(/^Here are (some )?/, '').replace(/^./, m => m.toUpperCase())), c.prompts.map(p => h('div', { class: 'rl-map-p' }, p))));
        else kids.push(h('p', { class: 'rl-instr' }, s.text));
      } else if (c.mode === 'p3' && c.exam === 'cpe') {
        if (stageIx === 0) kids.push(h('div', { class: 'rl-cue' }, h('div', { class: 'rl-cue-q' }, c.title), h('ul', {}, c.prompts.map(p => h('li', {}, p)))));
        else kids.push(h('ul', { class: 'rl-follow' }, s.list.map(f => h('li', {}, f))));
      }
      clear(stageBody).append(...kids);
    }

    function show(c) {
      current = c;
      side = c.mode === 'debate' ? (c.devil ? 'for' : cfg.side === 'random' ? (Math.random() < 0.5 ? 'for' : 'against') : cfg.side) : 'for';
      const part = c.mode === 'debate' ? 'Debate' : c.mode === 'discuss' ? 'Discussion' : PART_NAME[c.exam][c.mode];
      const head = c.mode === 'p2' ? (c.exam === 'cae' ? 'Here are your pictures. ' + c.title : 'Here are some pictures. ' + c.title) : c.title;
      clear(result).append(
        h('div', { class: 'rl-badges' }, h('span', { class: 'rl-badge' }, EXAM[c.exam]), h('span', { class: 'rl-badge' }, part), h('span', { class: 'rl-badge lvl' + c.lvl }, LVL[c.lvl] + (c.devil ? ' · devil’s advocate' : '')), h('span', { class: 'rl-badge' }, B.THEMES[c.theme])),
        h('h2', { class: 'rl-topic' }, head),
        h('div', { class: 'rl-body' }, stageBody, h('div', { class: 'rl-timer' }, clockBox, h('div', { class: 'row rl-tbtns' }, startBtn, resetBtn, nextBtn,
          c.mode === 'debate' && !c.devil ? h('button', { class: 'btn plain', onclick: () => { side = side === 'for' ? 'against' : 'for'; setStage(0); } }, 'Switch side') : null))));
      setStage(0);
      requestAnimationFrame(() => result.classList.add('in'));
    }

    function fullscreen() {
      const el = stage;
      if (document.fullscreenElement) { document.exitFullscreen(); return; }
      if (el.requestFullscreen) el.requestFullscreen().catch(() => toast('Full screen is not available in this browser'));
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      else toast('Full screen is not available in this browser');
    }
    const onKey = ev => {
      if (!document.body.contains(stage)) { document.removeEventListener('keydown', onKey); return; }
      if (/INPUT|TEXTAREA|SELECT/.test((ev.target && ev.target.tagName) || '')) return;
      if (ev.key === 'Enter' && !ev.repeat && ev.target === document.body) { ev.preventDefault(); spin(); }
      else if (ev.code === 'Space' && current && ev.target === document.body) { ev.preventDefault(); timer ? pause() : start(); }
    };
    document.addEventListener('keydown', onKey);

    drawSettings();
    return shell('#/exams',
      h('section', { class: 'hero' }, examTabs('roulette'), heroTitle('Speaking roulette.'),
        h('p', { class: 'hero-sub' }, 'Spin a topic, start the timer and let your student talk. Debates, discussion questions and every part of the Speaking paper — made for live lessons and screen sharing in Zoom.'),
        h('div', { class: 'seg', style: { marginTop: '18px' } },
          ['cpe', 'cae'].map(x => h('button', { class: x === exam ? 'on' : '', onclick: () => go('#/roulette?exam=' + x) }, EXAM[x])),
          h('button', { disabled: true, title: 'Coming soon' }, 'B2 First · soon'))),
      h('section', { class: 'section gray rl-section' }, h('div', { class: 'container' },
        settings, stage,
        h('p', { class: 'muted small', style: { marginTop: '26px', textAlign: 'center' } }, 'Enter — spin · Space — start or pause the timer.'),
        h('p', { class: 'muted small', style: { marginTop: '8px', textAlign: 'center' } }, 'All topics and tasks are original practice material written for Brightword; photos are from Wikimedia Commons under free licences. C1 Advanced and C2 Proficiency are exams of Cambridge University Press & Assessment, which is not connected with Brightword.'))));
  };

  return { views, count: () => B.cards.length };
};
