/* Lexicon · course practice made with AI.
   Teachers: AI writes learner-friendly meanings + examples for new words, and per topic three exercise sets
   (text with gaps, multiple-choice cloze, key word transformations). They are generated ONCE in the editor,
   saved with the course, checked by the teacher, and then served to students without any AI calls.
   The AI runs in the Supabase Edge Function "lexicon-ai" (supabase/functions/lexicon-ai). */
window.LexiconPractice = function (X) {
  'use strict';
  const { h, clear, shell, go, toast, modal, heroTitle, CLOUD, St, save, UBY, sessionFrame, shuffle, cleanDef, setKeys, confirmBox } = X;

  /* ---------------------------------------------------------------- AI calls */
  async function ai(task, payload) {
    try { return await CLOUD.fn('lexicon-ai', Object.assign({ task }, payload)); }
    catch (e) {
      if (e.status === 404) throw new Error('AI isn’t set up yet: the function “lexicon-ai” is not deployed in Supabase.');
      if (e.code === 'offline') throw new Error('No connection to the AI service. If the function was just deployed, check that “Verify JWT” is off for it.');
      throw e;
    }
  }
  const words4ai = t => t.words.filter(w => String(w.head || '').trim()).map(w => ({ head: w.head.trim(), meaning: cleanDef(w.meaning) }));
  const sig = t => t.words.map(w => String(w.head || '').trim().toLowerCase()).filter(Boolean).sort().join('|');

  /* new or rewritten words: learner-friendly meaning + 3 examples. Wiktionary's own senses stay in “Other meanings”. */
  async function fillWords(list, onProgress) {
    const todo = list.filter(w => String(w.head || '').trim());
    for (let i = 0; i < todo.length; i += 10) {
      const part = todo.slice(i, i + 10);
      onProgress && onProgress(`Writing meanings and examples with AI… ${Math.min(i + 10, todo.length)} of ${todo.length}`);
      const r = await ai('words', { words: part.map(w => ({ head: w.head, hint: w.aiHint || '' })) });
      (r.words || []).forEach((g, k) => {
        const w = part[k]; if (!w || !g || !g.meaning) return;
        w.meaning = g.meaning;
        if (g.examples && g.examples.length) { w.examples = g.examples.slice(0, 3); w.ex = []; }
        if (g.pos) w.pos = g.pos;
        w.register = g.register || '';
        w.ai = 1; delete w.missing; delete w.aiHint;
      });
    }
  }

  /* ---------------------------------------------------------------- editor: exercises of one topic */
  const KINDS = [
    { id: 'text', name: 'Text with gaps', icon: '📄', desc: 'A short text on the topic; students put the words in the gaps.' },
    { id: 'cloze', name: 'Choose the word', icon: '🔘', desc: 'Sentences with four options, like CPE Part 1.' },
    { id: 'kwt', name: 'Key word transformations', icon: '🔑', desc: 'Rewrite the sentence with the key word, 3–8 words, like CPE Part 4.' },
  ];
  const countOf = (ex, k) => !ex ? 0 : k === 'text' ? (ex.text && ex.text.gaps ? ex.text.gaps.length : 0) : (ex[k] || []).length;

  function topicExercises(t, changed) {
    const box = h('div', { class: 'px-ed' });
    const draw = () => {
      clear(box);
      const ex = t.ex || null, n = t.words.filter(w => String(w.head || '').trim()).length;
      const stale = ex && ex.sig && ex.sig !== sig(t);
      const status = h('span', { class: 'muted small' });
      const genAll = h('button', { class: 'btn sm', type: 'button', disabled: n < 3 }, ex ? '✨ Regenerate all' : '✨ Generate exercises');
      genAll.onclick = () => (ex ? confirmBox('Regenerate all exercises?', 'The current texts and questions of this topic will be replaced.', 'Regenerate', () => run(KINDS.map(k => k.id))) : run(KINDS.map(k => k.id)));
      const run = async kinds => {
        box.querySelectorAll('button').forEach(b => { b.disabled = true; });
        const fails = [], made = [], all = words4ai(t);
        for (const k of kinds) {
          const name = KINDS.find(x => x.id === k).name;
          if (k === 'text') {
            let r = null, err = null;
            for (let a = 0; a < 2 && !r; a++) {                 // one retry: the model sometimes answers badly
              status.textContent = `Writing “${name}”… (up to a minute)`;
              try { r = await ai(k, { title: t.title, words: all }); } catch (e) { err = e; }
            }
            if (r && r.text) { t.ex = Object.assign({}, t.ex || {}, { text: r.text, at: Date.now(), sig: sig(t) }); changed(); made.push(`${name}: ${r.text.gaps.length} gaps`); }
            else fails.push(`${name}: ${err ? err.message : 'no text'}`);
            continue;
          }
          /* one question per word: ask again for the words the first answer missed (up to 3 rounds) */
          const want = all.slice(0, k === 'cloze' ? 12 : 10).map(w => w.head);
          let got = [], todo = want.slice(), lastErr = null;
          for (let a = 0; a < 3 && todo.length; a++) {
            status.textContent = `Writing “${name}”… ${got.length} of ${want.length} ready`;
            try {
              const r = await ai(k, { title: t.title, words: all, only: a ? todo : undefined });
              for (const it of r[k] || []) if (want.includes(it.target) && !got.some(g => g.target === it.target)) got.push(it);
            } catch (e) { lastErr = e; }
            todo = want.filter(hd => !got.some(g => g.target === hd));
          }
          if (got.length) {
            got.sort((x, y) => want.indexOf(x.target) - want.indexOf(y.target));
            t.ex = Object.assign({}, t.ex || {}, { [k]: got, at: Date.now(), sig: sig(t) }); changed();
            made.push(`${name}: ${got.length} of ${want.length}` + (todo.length ? ` (missing: ${todo.join(', ')})` : ''));
          } else fails.push(`${name}: ${lastErr ? lastErr.message : 'the AI gave no usable questions'}`);
        }
        status.textContent = '';
        draw();
        if (fails.length) modal((b, close) => b.append(h('h3', {}, 'Some exercises were not made'), ...fails.map(f => h('p', { class: 'small' }, f)), made.length ? h('p', { class: 'small muted' }, 'Made: ' + made.join(' · ')) : null, h('p', { class: 'small muted' }, 'Press “Regenerate this part” to try again.'), h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: close }, 'OK'))));
        else toast('Ready — ' + made.join(' · ') + '. Check them before your students do.');
      };
      box.append(...[
        h('div', { class: 'px-ed-head' }, h('b', {}, 'Exercises for students'), h('span', { class: 'grow' }), genAll),
        n < 3 ? h('div', { class: 'muted small' }, 'Add at least 3 words, then let AI write a text with gaps, multiple-choice sentences and key word transformations for this topic.') : null,
        stale ? h('div', { class: 'ed-note' }, 'The words changed after these exercises were made. Regenerate to include the new words.') : null,
        status].filter(Boolean));
      if (!ex) return;
      for (const k of KINDS) {
        const c = countOf(ex, k.id);
        const det = h('details', { class: 'px-sec' },
          h('summary', {}, `${k.icon} ${k.name} · ${c ? c + (k.id === 'text' ? (c === 1 ? ' gap' : ' gaps') : (c === 1 ? ' question' : ' questions')) : 'not made'}`),
          h('div', { class: 'px-prev' }, preview(k.id, ex, draw, changed)),
          h('div', { class: 'row', style: { gap: '8px', marginTop: '10px' } }, h('button', { class: 'btn plain sm', type: 'button', onclick: () => run([k.id]) }, '✨ Regenerate this part')));
        box.append(det);
      }
    };
    const preview = (k, ex, redraw, changed) => {
      const del = (arr, i) => h('button', { class: 'icon-x', type: 'button', title: 'Delete this question', onclick: () => { arr.splice(i, 1); changed(); redraw(); } }, '×');
      if (k === 'text') {
        const T = ex.text; if (!T) return h('p', { class: 'muted small' }, 'Not made yet.');
        return h('div', {}, T.title ? h('h4', {}, T.title) : null, T.paragraphs.map(p => h('p', {}, fillGaps(p, T.gaps, g => h('mark', { title: g.head }, g.form)))));
      }
      if (k === 'cloze') return (ex.cloze || []).map((q, i) => h('div', { class: 'px-item' }, del(ex.cloze, i), h('div', {}, q.sentence), h('div', { class: 'small muted' }, q.options.map(o => o === q.answer ? `✓ ${o}` : o).join(' · ')), q.why ? h('div', { class: 'small muted' }, q.why) : null));
      return (ex.kwt || []).map((q, i) => h('div', { class: 'px-item' }, del(ex.kwt, i), h('div', {}, q.first), h('div', { class: 'small' }, h('b', {}, q.key)), h('div', {}, q.second), h('div', { class: 'small muted' }, 'Answers: ' + q.answers.join(' / '))));
    };
    draw();
    box.refresh = draw;   // the editor calls this after words are added
    return box;
  }
  /* "[[3]]" → node for gap 3 */
  const fillGaps = (p, gaps, make) => String(p).split(/(\[\[\d+\]\])/).map(s => { const m = s.match(/^\[\[(\d+)\]\]$/); if (!m) return s; const g = gaps.find(x => x.n === +m[1]); return g ? make(g) : '…'; });

  /* ---------------------------------------------------------------- student: practice tiles on the topic page */
  const kindsOf = u => (u && u.ex ? KINDS.filter(k => countOf(u.ex, k.id)) : []);
  /* games of a topic open only after each practice part was finished once */
  const needsPractice = u => { const rec = St().cx || {}; return kindsOf(u).some(k => !rec[u.id + ':' + k.id]); };
  const startChain = uid => { const k = kindsOf(UBY[uid])[0]; if (k) views.cx(uid, k.id, true); };
  function unitSection(u) {
    const have = kindsOf(u);
    if (!have.length) return null;
    const rec = St().cx || {}, todo = needsPractice(u);
    return h('section', { class: 'section', id: 'practice' }, h('div', { class: 'container' },
      h('div', { class: 'section-head' }, h('h2', { class: 'h2' }, 'Practise in context.'), h('p', { class: 'lead' }, todo ? 'Next step after learning the words: use them in a text, choose the right word, then transform sentences like in the exam. The games open when you finish.' : 'Use the words in a text, choose the right word, transform sentences like in the exam.'),
        h('button', { class: 'btn lg', style: { marginTop: '18px' }, onclick: () => startChain(u.id) }, todo ? 'Start the practice' : 'Practise again')),
      h('div', { class: 'game-tiles' }, have.map(k => {
        const r = rec[u.id + ':' + k.id];
        return h('button', { class: 'game-tile', style: { '--tint': 'linear-gradient(135deg,#0a84ff,#5e5ce6)' }, onclick: () => go(`#/cx/${u.id}/${k.id}`) },
          h('span', { class: 'gi', 'aria-hidden': 'true' }, k.icon), h('span', { class: 'rec' }, r ? `Best ${r.best}%` : 'New'), h('h3', {}, k.name), h('p', {}, k.desc));
      }))));
  }
  const record = (uid, kind, pct) => {
    const S = St(); S.cx = S.cx || {};
    const k = uid + ':' + kind, o = S.cx[k] || { best: 0, n: 0 };
    S.cx[k] = { best: Math.max(o.best || 0, pct), last: pct, n: (o.n || 0) + 1, at: Date.now() }; save();
  };
  const norm = s => String(s || '').toLowerCase().replace(/[’‘`´]/g, "'").replace(/[“”]/g, '"').replace(/[.!?,;:"]+\s*$/, '').replace(/\s+/g, ' ').trim();

  function finish(F, uid, kind, right, total, extra, chain) {
    const pct = Math.round(right / Math.max(1, total) * 100);
    record(uid, kind, pct);
    const ks = kindsOf(UBY[uid]), nx = chain ? ks[ks.findIndex(k => k.id === kind) + 1] : null;
    const toGames = () => { go('#/unit/' + uid); setTimeout(() => { const g = document.getElementById('games'); if (g) g.scrollIntoView({ behavior: 'smooth' }); }, 450); };
    const main = nx ? h('button', { class: 'btn', onclick: () => views.cx(uid, nx.id, true) }, `Next: ${nx.name} →`)
      : chain ? h('button', { class: 'btn', onclick: toGames }, 'Done — play the games →') : h('button', { class: 'btn', onclick: () => views.cx(uid, kind) }, 'Again');
    clear(F.stage).append(h('div', { class: 'q-card', style: { textAlign: 'center' } },
      h('div', { class: 'prompt head' }, `${pct}%`), h('p', { class: 'muted' }, `${right} of ${total} right.`), extra || null,
      chain && !nx ? h('p', {}, '🎮 Practice finished: the games of this topic are open.') : null,
      h('div', { class: 'row', style: { justifyContent: 'center', gap: '10px', marginTop: '18px', flexWrap: 'wrap' } }, main,
        chain ? h('button', { class: 'btn plain', onclick: () => views.cx(uid, kind, true) }, 'Again') : null,
        h('button', { class: 'btn plain', onclick: () => go('#/unit/' + uid) }, 'Back to the topic'))));
    setKeys(ev => { if (ev.key === 'Enter') { ev.preventDefault(); main.click(); } });
  }

  const views = {};
  views.cx = (uid, kind, chain) => {
    const u = UBY[uid], ex = u && u.ex;
    if (!u || !ex || !countOf(ex, kind)) { go(u ? '#/unit/' + uid : '#/units'); return h('div'); }
    const F = sessionFrame(() => go('#/unit/' + uid));
    F.chain = !!chain;
    if (kind === 'text') runText(F, u, ex.text);
    else if (kind === 'cloze') runCloze(F, u, ex.cloze);
    else runKwt(F, u, ex.kwt);
    return null;
  };

  function runText(F, u, T) {
    F.progress(0, T.gaps.length);
    const bank = shuffle([...new Set(T.gaps.map(g => g.head).concat(shuffle(u.entries.map(e => e.head).filter(x => !T.gaps.some(g => g.head === x))).slice(0, 3)))]).sort((a, b) => a.localeCompare(b));
    const sels = [];
    const sel = g => { const s = h('select', { class: 'px-gap', 'aria-label': 'Gap ' + g.n, onchange: () => F.progress(sels.filter(x => x.el.value).length, T.gaps.length) }, h('option', { value: '' }, `(${g.n})`), bank.map(b => h('option', { value: b }, b))); sels.push({ el: s, g }); return s; };
    const check = h('button', { class: 'btn lg' }, 'Check');
    const card = h('div', { class: 'q-card px-text' },
      h('div', { class: 'fmt' }, `${u.label} · Text with gaps`),
      T.title ? h('h2', { class: 'h3' }, T.title) : null,
      h('p', { class: 'muted small' }, 'Choose a word for each gap. In the text it may need another form (e.g. “took” for “take”): you will see the exact form after checking.'),
      h('div', { class: 'px-bank' }, bank.map(b => h('span', { class: 'chip' }, b))),
      T.paragraphs.map(p => h('p', { class: 'px-par' }, fillGaps(p, T.gaps, sel))),
      h('div', { class: 'row', style: { marginTop: '14px' } }, check));
    clear(F.stage).append(card);
    check.onclick = () => {
      let right = 0;
      sels.forEach(({ el, g }) => {
        const ok = el.value === g.head; if (ok) right++;
        const shown = h('span', { class: 'px-ans ' + (ok ? 'ok' : 'no') }, g.form);
        el.replaceWith(ok ? shown : h('span', {}, el.value ? h('s', { class: 'px-ans no' }, el.value) : null, ' ', h('span', { class: 'px-ans ok' }, g.form)));
      });
      check.remove();
      card.append(h('div', { class: 'row', style: { gap: '10px', marginTop: '18px' } }, h('div', { class: 'verdict ' + (right === T.gaps.length ? 'ok' : 'no'), style: { margin: 0 } }, `${right} of ${T.gaps.length}`),
        h('span', { class: 'grow' }), h('button', { class: 'btn', onclick: () => finish(F, u.id, 'text', right, T.gaps.length, null, F.chain) }, 'Finish')));
      F.progress(T.gaps.length, T.gaps.length);
    };
  }

  function runCloze(F, u, items) {
    const qs = shuffle(items); let i = 0, right = 0; const wrong = [];
    const step = () => {
      F.progress(i, qs.length);
      if (i >= qs.length) return finish(F, u.id, 'cloze', right, qs.length, wrong.length ? h('div', { class: 'px-review' }, h('h3', { class: 'h3' }, 'Your mistakes'), wrong.map(q => h('p', {}, q.sentence.replace('_____', q.answer.toUpperCase()), h('br'), h('span', { class: 'small muted' }, q.why || '')))) : null, F.chain);
      const q = qs[i], opts = shuffle(q.options); let done = false;
      const box = h('div', { class: 'opts' });
      const next = h('button', { class: 'btn', style: { marginTop: '16px', display: 'none' }, onclick: () => { i++; step(); } }, 'Next');
      const why = h('p', { class: 'muted', style: { marginTop: '14px' } });
      const pick = (o, b) => {
        if (done) return; done = true;
        const ok = o === q.answer; if (ok) right++; else wrong.push(q);
        [...box.children].forEach(x => { x.disabled = true; if (x.dataset.o === q.answer) x.classList.add('right'); });
        if (!ok) b.classList.add('wrong');
        why.textContent = q.why || ''; next.style.display = '';
        setKeys(ev => { if (ev.key === 'Enter') { i++; step(); } });
      };
      opts.forEach((o, k) => { const b = h('button', { class: 'opt', onclick: () => pick(o, b) }, h('kbd', {}, k + 1), h('span', {}, o)); b.dataset.o = o; box.append(b); });
      const parts = q.sentence.split('_____');
      clear(F.stage).append(h('div', { class: 'q-card' }, h('div', { class: 'fmt' }, `${u.label} · Choose the word`),
        h('div', { class: 'prompt' }, parts[0], h('span', { class: 'blank' }, '_____'), parts[1] || ''), box, why, next));
      setKeys(ev => { const n = parseInt(ev.key, 10); if (n >= 1 && n <= 4) pick(box.children[n - 1].dataset.o, box.children[n - 1]); else if (ev.key === 'Escape') go('#/unit/' + u.id); });
    };
    step();
  }

  function runKwt(F, u, items) {
    const qs = shuffle(items); let i = 0, right = 0;
    const step = () => {
      F.progress(i, qs.length);
      if (i >= qs.length) return finish(F, u.id, 'kwt', right, qs.length, null, F.chain);
      const q = qs[i]; let done = false;
      const parts = q.second.split('_____');
      const input = h('input', { type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: '3–8 words, including the key word', 'aria-label': 'Your answer', class: 'px-kwt-in' });
      const out = h('div', { style: { marginTop: '14px' } });
      const checkB = h('button', { class: 'btn' }, 'Check');
      const nextStep = () => { i++; step(); };
      const check = () => {
        if (done) return;
        const a = norm(input.value); if (!a) { input.focus(); return; }
        done = true; input.disabled = true; checkB.remove();
        const n = a.split(' ').length, hasKey = a.split(/[^a-z'-]+/).includes(q.key.toLowerCase());
        const ok = q.answers.some(x => norm(x) === a);
        if (ok) right++;
        input.classList.add(ok ? 'ok' : 'no');
        const notes = [];
        if (!ok && !hasKey) notes.push(`You must use the key word ${q.key} without changing it.`);
        if (!ok && (n < 3 || n > 8)) notes.push(`Your answer has ${n} word${n === 1 ? '' : 's'}; it must have 3–8.`);
        const nextB = h('button', { class: 'btn', onclick: nextStep }, 'Next');
        out.append(h('div', { class: 'verdict ' + (ok ? 'ok' : 'no') }, ok ? 'Correct' : 'Not quite'),
          notes.map(t => h('p', { class: 'small' }, t)),
          h('p', {}, h('span', { class: 'muted' }, ok && q.answers.length < 2 ? '' : 'Correct answers: '), ok && q.answers.length < 2 ? null : q.answers.join(' / ')),
          q.why ? h('p', { class: 'muted small' }, q.why) : null,
          h('div', { class: 'row', style: { gap: '10px', flexWrap: 'wrap' } }, nextB,
            !ok && hasKey && n >= 3 && n <= 8 ? h('button', { class: 'btn plain', title: 'The AI may have missed a correct version', onclick: () => { right++; nextStep(); } }, 'Mine is also right — count it') : null));
        setKeys(ev => { if (ev.key === 'Enter') { ev.preventDefault(); nextStep(); } });
      };
      checkB.onclick = check;
      clear(F.stage).append(h('div', { class: 'q-card' }, h('div', { class: 'fmt' }, `${u.label} · Key word transformation`),
        h('p', { class: 'px-first' }, q.first), h('div', { class: 'px-key' }, q.key),
        h('p', { class: 'px-second' }, parts[0], h('span', { class: 'blank' }, '_____'), parts[1] || ''),
        h('div', { class: 'typebox' }, input, checkB), out,
        h('div', { class: 'keys' }, 'Write only the missing words: 3 to 8, including the key word. Contractions count as two words.')));
      setKeys(ev => { if (ev.key === 'Enter' && !done) { ev.preventDefault(); check(); } else if (ev.key === 'Escape') go('#/unit/' + u.id); });
      setTimeout(() => input.focus(), 40);
    };
    step();
  }

  return { ai, fillWords, topicExercises, unitSection, views, KINDS, needsPractice, startChain, kindsOf };
};
