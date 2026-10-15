/* Lexicon · exam practice: full C1 Advanced / C2 Proficiency papers, timed like the real exam.
   Questions come from the server without answers; marking, explanations and statistics come back only after
   the test is handed in (see supabase/stage4.sql). Installed by app.js: window.LexiconExams(helpers) → views. */
window.LexiconExams = function (X) {
  'use strict';
  const { h, clear, shell, go, toast, modal, heroTitle, CLOUD, every, fmtDate, pad2 } = X;

  const EXAM = { cpe: 'C2 Proficiency', cae: 'C1 Advanced' };
  const PAPER = { rue: 'Reading and Use of English' };
  const PART = { mcc: 'Multiple-choice cloze', open: 'Open cloze', wf: 'Word formation', kwt: 'Key word transformations', mc: 'Multiple choice', gapped: 'Gapped text', match: 'Multiple matching', cross: 'Cross-text multiple matching' };
  const TAGS = {
    collocation: 'Collocations', idiom: 'Idioms and fixed phrases', 'phrasal-verb': 'Phrasal verbs', 'dependent-preposition': 'Dependent prepositions',
    'word-meaning': 'Shades of meaning', 'verb-pattern': 'Verb patterns', linking: 'Linking words', relative: 'Relative clauses',
    'article-determiner': 'Articles and determiners', pronoun: 'Pronouns and reference', 'verb-form': 'Verb forms', passive: 'Passive forms',
    modal: 'Modal verbs', conditional: 'Conditionals and wishes', inversion: 'Inversion', comparison: 'Comparison', reported: 'Reporting verbs',
    'wf-noun': 'Word formation: nouns', 'wf-adjective': 'Word formation: adjectives', 'wf-adverb': 'Word formation: adverbs', 'wf-verb': 'Word formation: verbs',
    'wf-negative': 'Word formation: negative prefixes', 'wf-internal': 'Word formation: spelling changes',
    'r-detail': 'Reading: detail', 'r-inference': 'Reading: inference', 'r-attitude': 'Reading: opinion and attitude', 'r-purpose': 'Reading: the writer’s purpose',
    'r-cohesion': 'Reading: text structure', 'r-comparison': 'Reading: comparing texts', 'r-specific': 'Reading: finding information',
  };
  const tagName = t => TAGS[t] || t;
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const LS = id => 'lexicon.exam.' + id;
  const examName = t => `${EXAM[t.exam] || t.exam} · ${PAPER[t.paper] || t.paper}`;
  const qCount = t => t.data.parts.reduce((a, p) => a + p.questions.length, 0);
  const mins = ms => Math.max(0, Math.round(ms / 60000));
  const clock = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 60)}:${pad2(s % 60)}`; };
  const err = (host, e) => clear(host).append(h('div', { class: 'card' }, h('p', { class: 'err' }, e.message || String(e))));
  const loading = () => h('p', { class: 'muted' }, 'Loading…');
  const marksOf = p => p.questions.length * (p.marks || 1);
  const firstN = p => p.questions[0].n, lastN = p => p.questions[p.questions.length - 1].n;

  /* text with [[n]] gaps → paragraphs; gap(n) builds the node in the gap */
  const paras = (text, gap, cls) => (text || []).map(t => {
    const bits = String(t).split(/\[\[(\d+)\]\]/);
    if (bits.length === 3 && !bits[0].trim() && !bits[2].trim()) return gap(+bits[1], true);
    return h('p', { class: cls || '' }, bits.map((b, i) => (i % 2 ? gap(+b, false) : b)));
  });

  /* ============================================================ the list of tests */
  const views = {};
  views.list = () => {
    const host = h('div', {}, loading());
    const statsHost = h('div');
    const draw = d => {
      clear(host);
      if (!d.access) {
        host.append(h('div', { class: 'card' }, h('h3', { class: 'h3', style: { fontSize: '22px' } }, 'Ask your teacher'),
          h('p', {}, 'Practice tests are open to students of a teacher on Lexicon. Ask your teacher to add your email on their Students page — then the tests appear here.')));
        return;
      }
      if (!d.tests.length) host.append(h('div', { class: 'card' }, h('p', { class: 'muted' }, d.admin ? 'No tests yet. Import the test file below.' : 'No tests yet.')));
      for (const t of d.tests) host.append(testCard(t));
      if (d.admin) host.append(importCard());
    };
    const testCard = t => {
      const open = t.open && Date.parse(t.open.deadline) > Date.now();
      const meta = `${PAPER[t.paper] || t.paper} · ${t.minutes} minutes · ${t.parts} parts · ${t.max_score} marks`;
      const last = t.last ? h('div', { class: 'xm-last' }, h('b', {}, `${t.last.score} / ${t.last.max}`), h('span', { class: 'muted small' }, `${pct(t.last.score, t.last.max)}% · ${fmtDate(t.last.at)}${t.attempts > 1 ? ` · best ${t.best} · ${t.attempts} attempts` : ''}`)) : null;
      return h('div', { class: 'card lib-card' },
        h('div', { class: 'grow' }, h('h3', { class: 'h3', style: { fontSize: '22px', marginBottom: '4px' } }, `${EXAM[t.exam] || t.exam} · ${t.title.split(' · ').slice(-1)[0]}`),
          h('div', { class: 'muted small' }, meta), t.published ? null : h('span', { class: 'pill' }, 'hidden'), last),
        h('div', { class: 'row lib-actions' },
          t.last ? h('button', { class: 'btn plain', onclick: () => go('#/review/' + t.last.id) }, 'Review') : null,
          open ? h('button', { class: 'btn', onclick: () => go('#/exam/' + t.open.id) }, `Continue · ${mins(Date.parse(t.open.deadline) - Date.now())} min left`)
            : h('button', { class: 'btn', onclick: () => startTest(t) }, t.last ? 'Try again' : 'Start')));
    };
    const startTest = t => modal((box, close) => {
      box.append(h('h3', {}, `${EXAM[t.exam]} · ${PAPER[t.paper] || t.paper}`),
        h('p', {}, `You have ${t.minutes} minutes, as in the real exam. The clock keeps running if you close the page, and your answers are saved as you go — you can continue on another device.`),
        h('p', { class: 'muted' }, 'When the time is up, the test is handed in automatically. Then you see your marks and an explanation for every question.'),
        h('div', { class: 'actions' }, h('button', { class: 'btn plain', onclick: close }, 'Not now'),
          h('button', { class: 'btn', 'data-autofocus': true, onclick: async ev => {
            ev.target.disabled = true;
            try { const id = await CLOUD.rpc('exam_start', { p_test: t.id }); close(); go('#/exam/' + id); } catch (e) { close(); toast(e.message); }
          } }, 'Start the clock')));
    });
    const out = h('div', { class: 'muted small' });   /* kept across redraws */
    const importCard = () => {
      const file = h('input', { type: 'file', accept: '.json,application/json', class: 'hidden', onchange: async ev => {
        const f = ev.target.files[0]; if (!f) return;
        let d; try { d = JSON.parse(await f.text()); } catch (e) { out.textContent = 'This isn’t a test file.'; return; }
        const tests = (d && d.tests) || [];
        if (!tests.length) { out.textContent = 'No tests in this file.'; return; }
        out.textContent = 'Importing…';
        const done = [];
        for (const x of tests) {
          try { const r = await CLOUD.rpc('admin_upsert_test', { p_test: x.test, p_key: x.key }); done.push(`${r.id} (${r.max} marks)`); }
          catch (e) { out.textContent = `${x.test && x.test.id}: ${e.message}`; return; }
        }
        out.textContent = 'Imported: ' + done.join(', ');
        load();
      } });
      return h('div', { class: 'card', style: { marginTop: '34px' } }, h('h3', { class: 'h3', style: { fontSize: '20px' } }, 'Admin: import tests'),
        h('p', { class: 'muted small' }, 'Choose a test file (lexicon-exams.json). Tests with the same id are replaced; students’ past results stay.'),
        h('div', { class: 'row' }, h('button', { class: 'btn plain', onclick: () => file.click() }, 'Choose file…'), file), out);
    };
    const load = () => CLOUD.rpc('exam_list').then(d => {
      draw(d);
      if (d.access) CLOUD.rpc('exam_stats', {}).then(s => { clear(statsHost); if (s.attempts.length) statsHost.append(h('div', { class: 'section-head', style: { marginTop: '50px' } }, h('h2', { class: 'h2' }, 'Your progress.')), statsBlock(s)); }).catch(() => {});
    }).catch(e => err(host, e));
    load();
    return shell('#/exams',
      h('section', { class: 'hero' }, heroTitle('Exam practice.'), h('p', { class: 'hero-sub' }, 'Full papers in the format of the real exam, with the real time limit. Marked the moment you finish, with an explanation for every question.')),
      h('section', { class: 'section gray' }, h('div', { class: 'narrow' }, host, statsHost,
        h('p', { class: 'muted small', style: { marginTop: '40px' } }, 'All tests are original practice material written for Lexicon. C1 Advanced and C2 Proficiency are exams of Cambridge University Press & Assessment; Lexicon is not connected with or endorsed by Cambridge.'))));
  };

  /* ============================================================ taking a test */
  views.run = id => {
    const page = h('div', { class: 'cpe-page xm-page' }, h('p', { class: 'muted center', style: { padding: '120px 20px' } }, 'Opening the test…'));
    CLOUD.rpc('exam_get', { p_attempt: id }).then(d => run(d)).catch(e => { clear(page).append(h('div', { class: 'narrow', style: { paddingTop: '80px' } }, h('p', { class: 'err' }, e.message), h('a', { href: '#/exams' }, 'Back to the tests'))); });
    const run = d => {
      if (d.attempt.finished) { go('#/review/' + id); return; }
      const T = d.test, parts = T.data.parts;
      const A = Object.assign({}, d.attempt.answers || {});
      try { const loc = JSON.parse(localStorage.getItem(LS(id)) || 'null'); if (loc && loc.answers) Object.assign(A, loc.answers); } catch (e) { /* */ }
      const offset = Date.parse(d.now) - Date.now(), deadline = Date.parse(d.attempt.deadline);
      const left = () => deadline - (Date.now() + offset);
      let cur = 0, dirty = false, finishing = false;
      try { cur = Math.min(parts.length - 1, +sessionStorage.getItem(LS(id) + '.part') || 0); } catch (e) { /* */ }
      const status = h('span', { class: 'xm-status muted small' });
      const keepLocal = () => { try { localStorage.setItem(LS(id), JSON.stringify({ answers: A, at: Date.now() })); } catch (e) { /* */ } };
      const set = (n, v) => { if (v === '' || v == null) delete A[n]; else A[n] = v; dirty = true; keepLocal(); drawTabs(); status.textContent = ''; };
      const saveNow = async () => {
        if (!dirty || finishing) return;
        dirty = false;
        try { const ok = await CLOUD.rpc('exam_save', { p_attempt: id, p_answers: A }); status.textContent = 'Saved'; if (ok === false) timeUp(); }
        catch (e) { dirty = true; status.textContent = 'Offline — answers kept on this device'; }
      };
      const handIn = async auto => {
        if (finishing) return; finishing = true;
        clear(body).append(h('p', { class: 'muted center', style: { padding: '80px 0' } }, auto ? 'Time is up. Handing in your test…' : 'Marking your test…'));
        for (let k = 0; k < 3; k++) {
          try { await CLOUD.rpc('exam_finish', { p_attempt: id, p_answers: A }); try { localStorage.removeItem(LS(id)); } catch (e) { /* */ } if (auto) toast('Time is up — your test was handed in'); go('#/review/' + id); return; }
          catch (e) { if (k === 2) { finishing = false; status.textContent = e.message; toast(e.message); drawPart(); return; } await new Promise(r => setTimeout(r, 1500)); }
        }
      };
      const timeUp = () => handIn(true);
      const answered = p => p.questions.filter(q => String(A[q.n] || '').trim()).length;
      const tabsHost = h('div');
      const drawTabs = () => clear(tabsHost).append(h('div', { class: 'cpe-tabs xm-tabs', style: { gridTemplateColumns: `repeat(${parts.length}, 1fr)` } }, parts.map((p, i) => {
        const a = answered(p);
        return h('button', { class: (i === cur ? 'on' : '') + (a === p.questions.length ? ' full' : ''), onclick: () => { cur = i; saveNow(); drawPart(); } }, h('b', {}, `Part ${p.n}`), h('span', {}, `${a}/${p.questions.length}`));
      })));
      const timer = h('span', { class: 'cpe-clock xm-clock' });
      let warned = 0;
      const tick = () => {
        const ms = left(); timer.textContent = clock(ms);
        timer.classList.toggle('low', ms < 10 * 60000);
        if (ms < 10 * 60000 && warned < 1) { warned = 1; toast('10 minutes left'); }
        if (ms < 5 * 60000 && warned < 2) { warned = 2; toast('5 minutes left'); }
        if (ms <= 0) timeUp();
      };
      const finish = () => {
        const empty = parts.map(p => [p.n, p.questions.length - answered(p)]).filter(x => x[1]);
        const total = empty.reduce((a, x) => a + x[1], 0);
        modal((box, close) => box.append(h('h3', {}, 'Hand in the test?'),
          total ? h('p', {}, `${total} question${total > 1 ? 's are' : ' is'} still empty: ${empty.map(([n, k]) => `Part ${n} (${k})`).join(', ')}. Empty answers score 0.`) : h('p', {}, 'You have answered every question.'),
          h('p', { class: 'muted' }, `${clock(left())} left on the clock. After you hand in, you can’t change your answers.`),
          h('div', { class: 'actions' }, h('button', { class: 'btn plain', 'data-autofocus': true, onclick: close }, 'Keep working'), h('button', { class: 'btn', onclick: () => { close(); handIn(false); } }, 'Hand in and mark'))));
      };
      const body = h('div');
      const drawPart = () => {
        try { sessionStorage.setItem(LS(id) + '.part', cur); } catch (e) { /* */ }
        drawTabs();
        const p = parts[cur];
        const wide = ['mc', 'gapped', 'match', 'cross'].includes(p.type);
        clear(body).append(h('div', { class: wide ? 'xm-wide' : 'narrow' },
          h('div', { class: 'cpe-head' }, h('h2', { class: 'h2' }, `Part ${p.n}`), h('div', { class: 'muted' }, `${PART[p.type]} · questions ${firstN(p)}–${lastN(p)} · ${marksOf(p)} marks`), h('p', { class: 'cpe-hint' }, p.instructions)),
          partView(p, A, set),
          h('div', { class: 'row cpe-nav' }, cur > 0 ? h('button', { class: 'btn plain', onclick: () => { cur--; saveNow(); drawPart(); window.scrollTo(0, 0); } }, `← Part ${parts[cur - 1].n}`) : null, h('span', { class: 'grow' }),
            cur < parts.length - 1 ? h('button', { class: 'btn lg', onclick: () => { cur++; saveNow(); drawPart(); window.scrollTo(0, 0); } }, `Part ${parts[cur + 1].n} →`) : h('button', { class: 'btn lg', onclick: finish }, 'Hand in'))));
      };
      clear(page).append(
        h('div', { class: 'cpe-top' }, h('div', { class: 'cpe-top-in xm-top-in' },
          h('button', { class: 'xbtn', title: 'Leave (the clock keeps running)', 'aria-label': 'Leave the test', onclick: () => { saveNow(); go('#/exams'); } }, '×'),
          h('div', { class: 'cpe-title' }, EXAM[T.exam], h('small', {}, PAPER[T.paper] || T.paper)), status, timer,
          h('button', { class: 'btn sm', onclick: finish }, 'Hand in'))),
        h('div', { class: 'xm-body' }, h('div', { class: 'narrow' }, tabsHost), body));
      tick(); every(tick, 1000); every(saveNow, 15000);
      const leave = () => { saveNow(); document.removeEventListener('visibilitychange', vis); };
      const vis = () => { if (document.visibilityState === 'hidden') saveNow(); };
      document.addEventListener('visibilitychange', vis);
      window.addEventListener('hashchange', leave, { once: true });
      drawPart();
    };
    return page;
  };

  /* one part, as the candidate sees it */
  function partView(p, A, set) {
    const val = n => (A[n] == null ? '' : String(A[n]));
    const textInput = (n, cls) => h('input', { type: 'text', class: 'xm-in ' + (cls || ''), value: val(n), autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': 'Question ' + n, oninput: ev => set(n, ev.target.value) });
    const letters = (n, list) => {
      const box = h('div', { class: 'xm-letters', role: 'radiogroup', 'aria-label': 'Question ' + n });
      const draw = () => clear(box).append(...list.map(L => h('button', { type: 'button', class: val(n) === L ? 'on' : '', 'aria-pressed': val(n) === L ? 'true' : 'false', onclick: () => { set(n, val(n) === L ? '' : L); draw(); } }, L)));
      draw(); return box;
    };
    const Q = {}; p.questions.forEach(q => { Q[q.n] = q; });
    if (p.type === 'mcc' || p.type === 'open' || p.type === 'wf') {
      const gap = n => {
        const q = Q[n];
        if (p.type === 'mcc') {
          const sel = h('select', { class: 'xm-sel', 'aria-label': 'Question ' + n, onchange: ev => set(n, ev.target.value) },
            h('option', { value: '' }, '…'), q.options.map((o, i) => { const L = 'ABCD'[i]; const op = h('option', { value: L }, `${L}  ${o}`); if (val(n) === L) op.selected = true; return op; }));
          return h('span', { class: 'xm-gap' }, h('b', {}, n), sel);
        }
        return h('span', { class: 'xm-gap' }, h('b', {}, n), textInput(n), p.type === 'wf' ? h('span', { class: 'cpe-stem xm-word' }, q.word) : null);
      };
      const opts = p.type === 'mcc' ? h('div', { class: 'xm-optlist' }, p.questions.map(q => h('div', {}, h('b', {}, q.n), q.options.map((o, i) => h('span', {}, h('i', {}, 'ABCD'[i]), o))))) : null;
      return h('div', {}, h('div', { class: 'card xm-card' }, p.heading ? h('h3', { class: 'xm-h' }, p.heading) : null, paras(p.text, gap, 'xm-p')), opts ? h('div', { class: 'card xm-card', style: { marginTop: '16px' } }, h('div', { class: 'muted small', style: { marginBottom: '8px' } }, 'Options'), opts) : null);
    }
    if (p.type === 'kwt') {
      return h('div', { class: 'card xm-card' }, p.questions.map(q => {
        const wc = h('span', { class: 'cpe-wc muted small' });
        const inp = textInput(q.n, 'wide');
        const count = () => { const n = inp.value.trim().split(/\s+/).filter(Boolean).reduce((a, w) => a + (/n['’]t$|['’](d|s|ll|ve|re|m)$/i.test(w) ? 2 : 1), 0); wc.textContent = n ? `${n} word${n > 1 ? 's' : ''}` : ''; };
        inp.addEventListener('input', count); count();
        return h('div', { class: 'xm-kwt' }, h('div', { class: 'xm-n' }, q.n), h('div', { class: 'grow' }, h('div', { class: 'cpe-s1' }, q.first), h('div', { class: 'cpe-key' }, q.word), h('div', { class: 'cpe-s' }, q.before + ' ', inp, ' ' + q.after), wc));
      }));
    }
    if (p.type === 'mc') {
      return h('div', { class: 'xm-split' },
        h('div', { class: 'card xm-text' }, h('h3', { class: 'xm-h' }, p.heading), p.intro ? h('p', { class: 'muted' }, p.intro) : null, paras(p.text, () => null, 'xm-p')),
        h('div', { class: 'xm-qs' }, p.questions.map(q => {
          const box = h('div', { class: 'cpe-opts xm-mcopts' });
          const draw = () => clear(box).append(...q.options.map((o, i) => { const L = 'ABCD'[i]; return h('button', { type: 'button', class: 'cpe-opt' + (val(q.n) === L ? ' sel' : ''), onclick: () => { set(q.n, val(q.n) === L ? '' : L); draw(); } }, h('kbd', {}, L), o); }));
          draw();
          return h('div', { class: 'card xm-q' }, h('div', { class: 'xm-stem' }, h('b', {}, q.n + ' '), q.stem), box);
        })));
    }
    if (p.type === 'gapped') {
      const L = p.options.map(o => o.letter), byL = {}; p.options.forEach(o => { byL[o.letter] = o.text; });
      const optsHost = h('div', { class: 'xm-paras' });
      const drawOpts = () => {
        const used = {}; p.questions.forEach(q => { if (val(q.n)) used[val(q.n)] = q.n; });
        clear(optsHost).append(...p.options.map(o => h('div', { class: 'xm-para' + (used[o.letter] ? ' used' : '') }, h('b', {}, o.letter), h('div', {}, o.text, used[o.letter] ? h('div', { class: 'muted small' }, `in gap ${used[o.letter]}`) : null))));
      };
      const slot = n => {
        const prev = h('div', { class: 'xm-slot-text' });
        const sel = h('select', { class: 'xm-sel', 'aria-label': 'Gap ' + n, onchange: ev => { set(n, ev.target.value); show(); drawOpts(); } }, h('option', { value: '' }, 'Choose…'), L.map(x => { const op = h('option', { value: x }, 'Paragraph ' + x); if (val(n) === x) op.selected = true; return op; }));
        const show = () => { prev.textContent = val(n) ? byL[val(n)] : ''; };
        show();
        return h('div', { class: 'xm-slot' }, h('div', { class: 'row' }, h('b', { class: 'xm-n' }, n), sel), prev);
      };
      drawOpts();
      return h('div', { class: 'xm-split' },
        h('div', { class: 'card xm-text' }, h('h3', { class: 'xm-h' }, p.heading), p.intro ? h('p', { class: 'muted' }, p.intro) : null, paras(p.text, slot, 'xm-p')),
        h('div', { class: 'xm-side' }, h('div', { class: 'muted small', style: { margin: '0 0 8px' } }, 'Paragraphs'), optsHost));
    }
    /* match / cross: sections on one side, questions with letter buttons on the other */
    const L = p.sections.map(s => s.letter);
    return h('div', { class: 'xm-split' },
      h('div', { class: 'card xm-text' }, h('h3', { class: 'xm-h' }, p.heading), p.sections.map(s => h('div', { class: 'xm-section' }, h('div', { class: 'xm-sec-h' }, h('b', {}, s.letter), s.title), paras(s.text, () => null, 'xm-p')))),
      h('div', { class: 'xm-qs' }, h('div', { class: 'muted', style: { margin: '0 0 10px' } }, p.prompt + ' …'),
        p.questions.map(q => h('div', { class: 'card xm-q xm-mq' }, h('div', { class: 'xm-stem' }, h('b', {}, q.n + ' '), q.stem), letters(q.n, L)))));
  }

  /* ============================================================ after the test: marks and explanations */
  views.review = id => {
    const host = h('div', {}, h('div', { class: 'narrow' }, loading()));
    const hero = h('section', { class: 'hero' }, heroTitle('Your results.'));
    CLOUD.rpc('exam_review', { p_attempt: id }).then(d => draw(d)).catch(e => err(host, e));
    let onlyWrong = true;
    const draw = d => {
      const a = d.attempt, T = d.test, K = d.key, R = a.result || { items: {}, parts: {}, tags: {} };
      const took = mins(Date.parse(a.finished_at) - Date.parse(a.started_at));
      clear(hero).append(
        h('div', { class: 'muted', style: { fontSize: '19px', fontWeight: 600 } }, (d.student.me ? '' : `${d.student.name || d.student.email} · `) + examName(T)),
        heroTitle(`${a.score} / ${a.max}`),
        h('p', { class: 'hero-sub' }, `${pct(a.score, a.max)}% · ${fmtDate(a.finished_at)} · ${took} of ${T.minutes} minutes`),
        h('div', { class: 'cpe-bars' }, T.data.parts.map(p => { const r = R.parts[p.n] || { got: 0, max: marksOf(p) }; return h('div', { class: 'cpe-bar xm-bar' }, h('span', {}, `Part ${p.n}`), h('div', { class: 'track' }, h('i', { style: { width: pct(r.got, r.max) + '%' } })), h('b', {}, `${r.got}/${r.max}`)); })),
        h('p', { class: 'muted small cpe-note' }, 'This is a practice test: the percentage shows how you did on this paper. Cambridge converts marks to its scale separately for every real exam, so no exact Cambridge score can be given here.'),
        h('div', { class: 'hero-cta' }, h('a', { class: 'btn lg', href: '#/exams' }, d.student.me ? 'All tests' : 'Exam practice'),
          d.student.me ? null : h('button', { class: 'btn lg plain', onclick: () => history.back() }, 'Back')));
      const tags = Object.entries(R.tags || {}).map(([t, v]) => ({ tag: t, got: v.got, max: v.max }));
      const body = h('div');
      const drawBody = () => {
        clear(body);
        T.data.parts.forEach(p => body.append(reviewPart(p, a.answers || {}, K, R, onlyWrong)));
      };
      const toggle = h('label', { class: 'xm-toggle' }, h('input', { type: 'checkbox', checked: true, onchange: ev => { onlyWrong = ev.target.checked; drawBody(); } }), ' Only the questions with lost marks');
      drawBody();
      clear(host).append(h('div', { class: 'narrow' },
        tags.length ? h('div', { class: 'card' }, h('h3', { class: 'h3', style: { fontSize: '22px' } }, 'By topic'), topicLists(tags)) : null,
        h('div', { class: 'row', style: { margin: '34px 0 10px' } }, h('h2', { class: 'h2', style: { margin: 0 } }, 'Every question.'), h('span', { class: 'grow' }), toggle)),
        h('div', { class: 'narrow' }, body));
    };
    return shell('#/exams', hero, h('section', { class: 'section gray' }, host));
  };

  function shownAnswer(k) { return k.type === 'choice' ? k.answer : (k.show || (k.accept || []).join(' / ')); }
  function reviewPart(p, ans, K, R, onlyWrong) {
    const rows = p.questions.map(q => ({ q, k: K[q.n] || {}, r: (R.items || {})[q.n] || { got: 0, max: p.marks || 1 }, a: String(ans[q.n] == null ? '' : ans[q.n]).trim() }));
    const shown = rows.filter(x => !onlyWrong || x.r.got < x.r.max);
    const got = rows.reduce((s, x) => s + x.r.got, 0), max = rows.reduce((s, x) => s + x.r.max, 0);
    const head = h('div', { class: 'xm-rv-head' }, h('h3', {}, `Part ${p.n} · ${PART[p.type]}`), h('span', { class: 'pill' + (got === max ? ' ok' : '') }, `${got} / ${max}`));
    const byN = {}; rows.forEach(x => { byN[x.q.n] = x; });
    let context = null;
    if (['mcc', 'open', 'wf'].includes(p.type)) {
      context = h('div', { class: 'xm-ctx' }, paras(p.text, n => { const x = byN[n]; const ok = x.r.got >= x.r.max; const mine = x.a ? (p.type === 'mcc' ? `${x.a} ${x.q.options['ABCD'.indexOf(x.a)] || ''}` : x.a) : '—';
        return h('span', { class: 'xm-mark ' + (ok ? 'ok' : 'no') }, h('b', {}, n), ok ? mine : [h('s', {}, mine), ' ', p.type === 'mcc' ? `${x.k.answer} ${x.q.options['ABCD'.indexOf(x.k.answer)]}` : shownAnswer(x.k)]); }, 'xm-p'));
    } else if (p.type === 'gapped') {
      const byL = {}; p.options.forEach(o => { byL[o.letter] = o.text; });
      context = h('details', { class: 'xm-ctx' }, h('summary', {}, 'The text with the right paragraphs'), paras(p.text, n => { const x = byN[n]; const ok = x.r.got >= x.r.max;
        return h('div', { class: 'xm-slot ' + (ok ? 'ok' : 'no') }, h('div', {}, h('b', { class: 'xm-n' }, n), ok ? ` ${x.k.answer} ✓` : ` you chose ${x.a || '—'}, right: ${x.k.answer}`), h('div', { class: 'xm-slot-text' }, byL[x.k.answer])); }, 'xm-p'));
    } else if (p.type === 'mc' || p.type === 'match' || p.type === 'cross') {
      context = h('details', { class: 'xm-ctx' }, h('summary', {}, 'The text'), p.sections ? p.sections.map(s => h('div', { class: 'xm-section' }, h('div', { class: 'xm-sec-h' }, h('b', {}, s.letter), s.title), paras(s.text, () => null, 'xm-p'))) : paras(p.text, () => null, 'xm-p'));
    }
    const card = x => {
      const ok = x.r.got >= x.r.max, part = x.r.got > 0 && !ok;
      const optText = L => (p.type === 'mc' || p.type === 'mcc') && x.q.options ? ` — ${x.q.options['ABCD'.indexOf(L)] || ''}` : '';
      return h('div', { class: 'xm-rv ' + (ok ? 'ok' : part ? 'part' : 'no') },
        h('div', { class: 'xm-rv-top' }, h('b', { class: 'xm-n' }, x.q.n), h('span', { class: 'grow muted small' }, (x.k.tags || []).map(tagName).join(' · ')), h('span', { class: 'xm-score' }, `${x.r.got}/${x.r.max}`)),
        p.type === 'kwt' ? h('div', { class: 'xm-rv-q' }, x.q.first, ' ', h('span', { class: 'cpe-key inline' }, x.q.word), h('div', {}, x.q.before, ' … ', x.q.after)) : null,
        x.q.stem ? h('div', { class: 'xm-rv-q' }, (p.prompt ? p.prompt + ' ' : '') + x.q.stem) : null,
        p.type === 'wf' ? h('div', { class: 'xm-rv-q muted small' }, 'Word given: ', h('b', {}, x.q.word)) : null,
        h('div', { class: 'rv-a ' + (ok ? 'ok' : 'no') }, h('span', {}, 'Your answer'), x.a ? x.a + optText(x.a) : 'no answer'),
        ok ? null : h('div', { class: 'rv-a ok' }, h('span', {}, 'Correct'), shownAnswer(x.k) + (x.k.type === 'choice' ? optText(x.k.answer) : '')),
        x.k.type === 'text' && (x.k.accept || []).length > 1 ? h('div', { class: 'rv-n' }, 'Also accepted: ' + x.k.accept.slice(1).join(', ')) : null,
        x.k.type === 'kwt' && (x.k.accept || []).length > 1 ? h('div', { class: 'rv-n' }, 'Accepted answers: ' + x.k.accept.join(' · ')) : null,
        x.k.why ? h('div', { class: 'xm-why' }, x.k.why) : null);
    };
    return h('div', { class: 'card xm-rv-part' }, head, context, shown.length ? shown.map(card) : h('p', { class: 'muted' }, 'Full marks in this part.'));
  }

  /* ============================================================ strengths, weaknesses and progress */
  function topicLists(tags) {
    const rows = tags.filter(t => t.max > 0).map(t => Object.assign({}, t, { p: pct(t.got, t.max) })).sort((x, y) => x.p - y.p || y.max - x.max);
    const weak = rows.filter(t => t.p < 70), strong = rows.filter(t => t.p >= 70).reverse();
    const bar = t => h('div', { class: 'xm-topic' }, h('span', {}, tagName(t.tag)), h('div', { class: 'track' }, h('i', { class: t.p < 50 ? 'low' : t.p < 70 ? 'mid' : 'hi', style: { width: Math.max(3, t.p) + '%' } })), h('b', {}, `${t.p}%`), h('span', { class: 'muted small' }, `${t.got}/${t.max}`));
    return h('div', { class: 'xm-topics' },
      h('div', {}, h('div', { class: 'xm-th' }, 'To work on'), weak.length ? weak.map(bar) : h('p', { class: 'muted small' }, 'Nothing below 70%.')),
      h('div', {}, h('div', { class: 'xm-th' }, 'Strong'), strong.length ? strong.map(bar) : h('p', { class: 'muted small' }, 'Nothing at 70% or above yet.')));
  }
  function chart(attempts) {
    const W = 640, H = 220, L = 40, Rm = 16, Tm = 16, B = 34;
    const n = attempts.length, x = i => L + (n === 1 ? (W - L - Rm) / 2 : i * (W - L - Rm) / (n - 1)), y = v => Tm + (100 - v) * (H - Tm - B) / 100;
    const col = { cpe: 'var(--blue)', cae: 'var(--learn)' };
    let s = `<svg viewBox="0 0 ${W} ${H}" class="xm-chart" role="img" aria-label="Scores over time">`;
    for (const g of [0, 25, 50, 75, 100]) s += `<line x1="${L}" x2="${W - Rm}" y1="${y(g)}" y2="${y(g)}" class="grid"/><text x="${L - 8}" y="${y(g) + 4}" text-anchor="end">${g}%</text>`;
    for (const ex of ['cae', 'cpe']) {
      const pts = attempts.map((a, i) => ({ i, a })).filter(o => o.a.exam === ex);
      if (pts.length > 1) s += `<polyline fill="none" stroke="${col[ex]}" stroke-width="2.5" points="${pts.map(o => `${x(o.i)},${y(pct(o.a.score, o.a.max))}`).join(' ')}"/>`;
      for (const o of pts) s += `<circle cx="${x(o.i)}" cy="${y(pct(o.a.score, o.a.max))}" r="5" fill="${col[ex]}"><title>${EXAM[ex]} · ${pct(o.a.score, o.a.max)}% · ${fmtDate(o.a.finished_at)}</title></circle>`;
    }
    attempts.forEach((a, i) => { if (n <= 8 || i % Math.ceil(n / 8) === 0 || i === n - 1) s += `<text x="${x(i)}" y="${H - 10}" text-anchor="middle">${fmtDate(a.finished_at)}</text>`; });
    s += '</svg>';
    const box = h('div', { class: 'xm-chart-box' }); box.innerHTML = s;
    const exams = [...new Set(attempts.map(a => a.exam))];
    return h('div', {}, box, h('div', { class: 'legend' }, exams.map(ex => h('span', { style: { '--c': col[ex] } }, EXAM[ex]))));
  }
  function statsBlock(s) {
    const all = s.attempts, at = all.filter(a => a.counted !== false);
    if (!all.length) return h('div', { class: 'card' }, h('p', { class: 'muted' }, s.student.me ? 'No finished tests yet.' : 'This student hasn’t finished a test yet.'));
    const tags = s.tags.map(t => ({ tag: t.tag, got: t.got, max: t.max }));
    const recent = s.tags.filter(t => t.last_max).map(t => ({ tag: t.tag, got: t.last_got, max: t.last_max }));
    let mode = 'all';
    const topicsHost = h('div');
    const drawTopics = () => clear(topicsHost).append(topicLists(mode === 'all' ? tags : recent));
    const seg = h('div', { class: 'seg' });
    const drawSeg = () => clear(seg).append(...[['all', 'All tests'], ['recent', 'Last 2 tests']].map(([v, t]) => h('button', { type: 'button', class: mode === v ? 'on' : '', onclick: () => { mode = v; drawSeg(); drawTopics(); } }, t)));
    drawSeg(); drawTopics();
    return h('div', {},
      at.length ? h('div', { class: 'card' }, h('h3', { class: 'h3', style: { fontSize: '22px' } }, 'Scores over time'), chart(at)) : null,
      !at.length ? null : h('div', { class: 'card', style: { marginTop: '22px' } }, h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('h3', { class: 'h3', style: { fontSize: '22px', margin: 0 } }, 'Strengths and weaknesses'), seg),
        h('p', { class: 'muted small' }, 'Each question is tagged with what it tests. The bars show the share of marks won on that topic.'), topicsHost),
      h('div', { class: 'card', style: { marginTop: '22px' } }, h('h3', { class: 'h3', style: { fontSize: '22px' } }, 'All attempts'),
        all.length > at.length ? h('p', { class: 'muted small' }, 'Tests left with fewer than a quarter of the questions answered are not counted in the chart and the topics.') : null,
        h('div', { class: 'table-wrap' }, h('table', { class: 'words people' }, h('thead', {}, h('tr', {}, ['Date', 'Test', 'Score', ''].map(t => h('th', {}, t)))),
          h('tbody', {}, all.slice().reverse().map(a => h('tr', { class: a.counted === false ? 'xm-skip' : '' }, h('td', {}, fmtDate(a.finished_at)), h('td', {}, EXAM[a.exam], h('div', { class: 'muted small' }, a.title.split(' · ').slice(1).join(' · '))),
            h('td', {}, h('b', {}, `${a.score}/${a.max}`), h('div', { class: 'muted small' }, a.counted === false ? 'left early · not counted' : pct(a.score, a.max) + '%')),
            h('td', {}, h('a', { href: '#/review/' + a.id }, 'Review')))))))));
  }

  /* ============================================================ teacher: one student */
  views.student = uid => {
    const host = h('div', { class: 'narrow' }, loading());
    const hero = h('section', { class: 'hero' }, heroTitle('Student.'));
    CLOUD.rpc('exam_stats', { p_user: uid }).then(s => {
      clear(hero).append(heroTitle(s.student.name || s.student.email), h('p', { class: 'hero-sub' }, s.student.name ? s.student.email : 'Exam practice results'));
      clear(host).append(statsBlock(s));
    }).catch(e => err(host, e));
    return shell('#/students', hero, h('section', { class: 'section gray' }, host, h('div', { class: 'narrow', style: { marginTop: '24px' } }, h('a', { href: '#/students' }, '← All students'))));
  };

  return { views, statsBlock };
};
