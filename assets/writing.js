/* Lexicon · Writing paper practice, marked by AI on the official Cambridge subscales
   (Content, Communicative Achievement, Organisation, Language — 0 to 5 each, 20 per task).
   All task prompts are original, written for Brightword in the format of the real exam.
   Marking runs in the Edge Function "lexicon-ai" (task "writing"); results are saved in writing_attempts. */
window.LexiconWriting = function (X) {
  'use strict';
  const { h, clear, shell, go, toast, heroTitle, CLOUD, St, fmtDate, examTabs } = X;

  /* ---------------------------------------------------------------- tasks */
  const T = [];
  const add = (id, exam, part, type, title, prompt) => T.push({ id, exam, part, type, title, prompt });
  const CPE1 = 'Read the two texts below. Write an essay summarising and evaluating the key points from both texts. Use your own words throughout as far as possible, and include your own ideas in your answer. Write your answer in 240–280 words.';
  add('cpe-w1-remote', 'cpe', 1, 'essay', 'Working from home', CPE1 + `

Text 1 — The quiet revolution
For millions of office workers, the shift to working from home has been liberating. Freed from the daily commute, employees reclaim hours that can be spent productively or with their families. Many report that they concentrate better without the constant interruptions of an open-plan office, and employers have discovered that trust, rather than surveillance, often produces better results. Far from being a temporary measure, remote work may be the most significant improvement in working life for a generation.

Text 2 — The hidden costs
Remote work has a price that is rarely acknowledged. Young employees, in particular, lose the informal learning that comes from overhearing experienced colleagues and asking quick questions. The boundary between work and home blurs, so that many people end up working longer hours, not shorter ones. And while video calls are efficient, they are a poor substitute for the chance encounters from which new ideas and lasting professional relationships so often emerge.`);
  add('cpe-w1-museums', 'cpe', 1, 'essay', 'Museums in the digital age', CPE1 + `

Text 1 — Open doors
Digitisation has done more to democratise culture than any museum building ever could. A student in a remote village can now examine a medieval manuscript in extraordinary detail, or take a virtual tour of a gallery thousands of miles away, at no cost. Institutions that once served the privileged few who could afford to travel now reach a global audience, and many report that online visitors go on to become enthusiastic visitors in person.

Text 2 — The real thing
There is no digital equivalent of standing in front of an original work of art. Scale, texture and the sense of a shared space with other people are lost on a screen, and with them much of the emotional impact that makes a visit memorable. Moreover, if museums give away their collections online, they risk undermining the ticket sales and donations on which their survival depends, and with it their ability to care for the objects themselves.`);
  add('cpe-w1-tourism', 'cpe', 1, 'essay', 'Tourism and local communities', CPE1 + `

Text 1 — A lifeline
For many regions, tourism is not a luxury but an economic necessity. It creates jobs in places where few other industries exist, keeps traditional crafts alive by giving them a market, and funds the restoration of historic buildings that would otherwise fall into ruin. Visitors also bring a curiosity about local culture that can make residents prouder of their own heritage.

Text 2 — Too much of a good thing
In the most popular destinations, tourism has become a threat to the very communities it is supposed to support. Rents rise as flats are turned into holiday lets, forcing long-term residents out of historic centres. Local shops are replaced by souvenir stalls and chain cafés, and the authentic character that attracted visitors in the first place gradually disappears, leaving behind something closer to a theme park than a living town.`);
  add('cpe-w1-languages', 'cpe', 1, 'essay', 'Learning languages in the age of AI', CPE1 + `

Text 1 — A skill in decline?
Machine translation has reached a point where, for most practical purposes, it is good enough. Travellers can hold conversations through their phones, businesses can translate contracts in seconds, and students can read research published in any language. Given how many years it takes to master a foreign language, it is reasonable to ask whether schools should continue to devote so much time to the subject.

Text 2 — More than a tool
To see a language merely as a means of exchanging information is to misunderstand it. Learning another language changes the way we think, giving us access to ideas and ways of seeing the world that do not translate neatly. It also builds relationships in a way no device can: speaking to someone in their own language signals respect and creates a trust that a translated message, however accurate, cannot.`);

  const CPE2 = 'Write your answer in 280–320 words in an appropriate style.';
  add('cpe-w2-article-skill', 'cpe', 2, 'article', 'Article: the skill nobody teaches', `An online magazine for young adults has invited readers to send in articles with the title "The skill nobody teaches". Write an article describing a skill that is not usually taught at school, explaining why it is so valuable in adult life, and considering whether schools should take responsibility for teaching it. ${CPE2}`);
  add('cpe-w2-letter-reading', 'cpe', 2, 'letter', 'Letter: do young people still read?', `You have read an article in a national newspaper claiming that young people no longer read for pleasure and that this will damage their ability to think deeply. Write a letter to the editor responding to the article. In your letter you should evaluate the claims made and put forward your own view, with examples. ${CPE2}`);
  add('cpe-w2-report-transport', 'cpe', 2, 'report', 'Report: students and public transport', `Your town council wants to encourage more students to use public transport and has asked you to write a report. In your report you should describe how students currently travel, explain the main reasons why many do not use public transport, and make recommendations, with justification, for changes the council could realistically make. ${CPE2}`);
  add('cpe-w2-review-adaptation', 'cpe', 2, 'review', 'Review: a book and its film', `A literary website is publishing a series of reviews of film or television adaptations of well-known books. Write a review of an adaptation you have seen, comparing it with the original book. You should assess how successfully the adaptation captures the spirit of the book and say whether watching it is a good substitute for reading the original. ${CPE2}`);
  add('cpe-w2-article-ambition', 'cpe', 2, 'article', 'Article: is ambition overrated?', `A magazine is running a series called "Big questions" and has asked readers for articles answering the question "Is ambition overrated?". Write an article in which you discuss the benefits and costs of ambition, both for individuals and for society, and reach a clear conclusion of your own. ${CPE2}`);
  add('cpe-w2-report-volunteering', 'cpe', 2, 'report', 'Report: a volunteering programme', `An international education foundation funds a volunteering programme at your college, in which students help in local schools and charities. The foundation has asked you to write a report evaluating the programme. You should assess what it has achieved for the students and for the community, identify any weaknesses, and recommend how it could be developed. ${CPE2}`);

  const CAE1 = (q, a, b, c, ops) => `Your class has attended a panel discussion on the question below. You have made the notes shown. Write an essay for your tutor discussing TWO of the aspects in your notes. You should explain which aspect is more important, giving reasons in support of your answer. You may, if you wish, make use of the opinions expressed in the discussion, but you should use your own words as far as possible. Write your answer in 220–260 words in an appropriate style.

${q}

Notes — things to consider:
• ${a}
• ${b}
• ${c}

Some opinions expressed in the discussion:
${ops.map(o => `“${o}”`).join('\n')}`;
  add('cae-w1-young', 'cae', 1, 'essay', 'Investing in young people', CAE1('Which facilities should local authorities invest in to improve the lives of young people?', 'sports centres', 'libraries and study spaces', 'public transport',
    ['Sport keeps teenagers healthy and out of trouble.', 'Libraries are out of date now that everything is online.', 'Without cheap transport, young people can’t get to anything at all.']));
  add('cae-w1-waste', 'cae', 1, 'essay', 'Reducing waste', CAE1('How can governments best reduce the amount of waste people produce?', 'taxes on packaging', 'education about recycling', 'deposit schemes for bottles and cans',
    ['If something costs more, companies will soon find another way.', 'People recycle when they understand why it matters.', 'Paying people back for every bottle works better than any campaign.']));
  add('cae-w1-careers', 'cae', 1, 'essay', 'Choosing a career', CAE1('Which factors have the greatest influence on the career choices young people make?', 'parents and family', 'expected salary', 'personal interests',
    ['Most of us end up doing what our parents expected.', 'In the end, everyone has to pay the rent.', 'You’ll never be good at a job you don’t enjoy.']));
  add('cae-w1-cities', 'cae', 1, 'essay', 'Better cities', CAE1('How can cities be made more pleasant places to live?', 'more green spaces', 'car-free zones', 'free cultural events',
    ['Parks are the lungs of a city.', 'Cars have taken over streets that belong to people.', 'A city without culture is just a place to sleep.']));

  const CAE2 = 'Write your answer in 220–260 words in an appropriate style.';
  add('cae-w2-email-job', 'cae', 2, 'email', 'Email: summer job application', `You see this advertisement on the website of an international summer school: "We are looking for activity assistants to help organise sports, trips and evening events for teenagers from around the world. Tell us why you would be suitable, what relevant experience you have, and what you could contribute to the programme." Write your email of application to the director, Ms Carter. ${CAE2}`);
  add('cae-w2-proposal-room', 'cae', 2, 'proposal', 'Proposal: the student common room', `The principal of your college wants to improve the student common room and has invited students to submit proposals. Write a proposal describing the main problems with the room as it is now, suggesting changes that would make it more useful and attractive, and explaining how these changes would benefit students. ${CAE2}`);
  add('cae-w2-report-festival', 'cae', 2, 'report', 'Report: a local festival', `The local tourist board has asked you to write a report on a cultural festival that took place in your area recently. In your report you should describe the most successful parts of the festival, mention anything that did not work well, and recommend how the festival could attract more visitors next year. ${CAE2}`);
  add('cae-w2-review-podcast', 'cae', 2, 'review', 'Review: a podcast', `An English-language website for students is asking readers to review a podcast they listen to regularly. Write a review describing what the podcast is about, explaining what makes it worth listening to, and saying what kind of listener would get the most out of it. ${CAE2}`);
  add('cae-w2-letter-park', 'cae', 2, 'letter', 'Letter: plans for the park', `Your local newspaper has reported that the council plans to build a car park on part of a popular public park. Write a letter to the editor explaining why the park matters to people in the area, giving your views on the plan, and suggesting an alternative solution. ${CAE2}`);
  add('cae-w2-proposal-sponsor', 'cae', 2, 'proposal', 'Proposal: a project for young people', `An international company has offered to sponsor a project that would benefit young people in your area. Write a proposal for the company describing the project you suggest, explaining why it is needed, and outlining how its success could be measured. ${CAE2}`);

  const LIMIT = { cpe: { 1: [240, 280], 2: [280, 320] }, cae: { 1: [220, 260], 2: [220, 260] } };
  const PER_DAY = { student: 3, teacher: 20, admin: 50 };
  const EXAM = { cpe: 'C2 Proficiency', cae: 'C1 Advanced' };
  const SUB = [['content', 'Content'], ['communicative', 'Communicative achievement'], ['organisation', 'Organisation'], ['language', 'Language']];
  const byId = id => T.find(t => t.id === id);
  const wordCount = s => (String(s).trim().match(/\S+/g) || []).filter(w => /[A-Za-z]/.test(w)).length;
  const role = () => (St().account && St().account.role) || 'student';
  const levelOf = (exam, total) => {                       // band 3 average = the exam's level (C2 for CPE, C1 for CAE)
    const avg = total / 4, hi = exam === 'cpe' ? 'C2' : 'C1', lo = exam === 'cpe' ? 'C1' : 'B2';
    return avg >= 4.5 ? `strong ${hi}` : avg >= 3 ? hi : avg >= 1 ? lo : `below ${lo}`;
  };
  const draftKey = id => 'lexicon.writing.' + id;
  const loadDraft = id => { try { return localStorage.getItem(draftKey(id)) || ''; } catch (e) { return ''; } };
  const saveDraft = (id, v) => { try { if (v) localStorage.setItem(draftKey(id), v); else localStorage.removeItem(draftKey(id)); } catch (e) { /* */ } };
  const LAST = {};                                          // result kept in memory if it could not be saved

  /* ---------------------------------------------------------------- list */
  const views = {};
  views.list = examArg => {
    const exam = X.examPick ? X.examPick(examArg) : examArg === 'cae' ? 'cae' : 'cpe';
    const left = h('span', { class: 'muted small' });
    const mine = h('div'), fromTeacher = h('div'), teach = role() === 'teacher' || role() === 'admin';
    const reviewCard = h('div');
    if (teach) CLOUD.rpc('wa_queue').then(q => { const n = (q || []).filter(x => x.status === 'pending').length;
      reviewCard.append(h('a', { class: 'card wr-own', href: '#/writing/review' }, h('div', { class: 'grow' }, h('h3', { class: 'h3', style: { margin: '0 0 4px' } }, n ? `Writing review · ${n} to check` : 'Writing review'),
        h('div', { class: 'muted small' }, 'Give your students a task. The AI examiner drafts the report, you check it and approve.')), h('span', { class: 'btn' + (n ? '' : ' plain') }, n ? 'Check' : 'Open'))); }).catch(() => {});
    else CLOUD.rpc('wa_mine').then(rows => {
      if (!rows || !rows.length) return;
      const st = r => !r.attempt ? h('span', { class: 'btn sm' }, 'Write') : r.status === 'approved' ? h('b', { class: 'wr-st2' }, `${r.score}/20`) : h('span', { class: 'wr-st1' }, 'with your teacher');
      fromTeacher.append(h('h2', { class: 'h3' }, 'From your teacher'), h('div', { class: 'card', style: { marginBottom: '30px' } }, rows.map(r => h('a', { class: 'wr-row', href: r.attempt ? '#/wr/' + r.attempt : '#/writing/a/' + r.id },
        h('span', { class: 'grow' }, h('b', {}, r.title), h('div', { class: 'muted small' }, `${EXAM[r.exam]} Part ${r.part} · ${r.type}${r.due_at ? ' · due ' + fmtDate(r.due_at) : ''}${r.teacher ? ' · ' + r.teacher : ''}`)), st(r)))));
    }).catch(() => {});
    CLOUD.rpc('ai_left', { p_kind: 'writing', p_limit: PER_DAY[role()] || 3 }).then(n => { left.textContent = `AI checks left today: ${n} of ${PER_DAY[role()] || 3}`; }).catch(() => {});
    CLOUD.rpc('writing_list', {}).then(rows => {
      if (!rows || !rows.length) return;
      mine.append(h('div', { class: 'section-head row', style: { marginTop: '46px', alignItems: 'baseline', gap: '14px' } }, h('h2', { class: 'h2 grow' }, 'Your writing.'), h('a', { href: '#/writing/history' }, 'Progress chart ›')),
        h('div', { class: 'card' }, rows.map(r => h('a', { class: 'wr-row', href: '#/wr/' + r.id },
          h('b', { class: 'wr-score' }, r.status === 'pending' ? '⏳' : r.score == null ? '—' : `${r.score}/20`),
          h('span', { class: 'grow' }, h('span', {}, r.title || r.task_id), h('span', { class: 'muted small' }, ` · ${EXAM[r.exam]} Part ${r.part} · ${r.words} words`)),
          h('span', { class: 'muted small' }, fmtDate(r.created_at))))));
    }).catch(() => {});
    const card = t => {
      const d = loadDraft(t.id);
      return h('div', { class: 'card lib-card' },
        h('div', { class: 'grow' }, h('h3', { class: 'h3', style: { fontSize: '20px', marginBottom: '4px' } }, t.title),
          h('div', { class: 'muted small' }, `Part ${t.part} · ${t.type} · ${LIMIT[t.exam][t.part].join('–')} words${d ? ` · draft: ${wordCount(d)} words` : ''}`)),
        h('div', { class: 'row lib-actions' }, teach ? h('button', { class: 'btn plain', onclick: () => go('#/writing/assign/' + t.id) }, 'Give to students') : null, h('button', { class: 'btn', onclick: () => go('#/writing/' + t.id) }, d ? 'Continue' : 'Write')));
    };
    const part = p => T.filter(t => t.exam === exam && t.part === p);
    return shell('#/exams',
      h('section', { class: 'hero' }, examTabs('writing'), heroTitle('Writing.'),
        h('p', { class: 'hero-sub' }, 'Write on a real exam-style task. The AI marks it like a Cambridge examiner: four subscales from 0 to 5, then corrections and a model paragraph.'),
        h('div', { class: 'seg', style: { marginTop: '18px' } }, ['cpe', 'cae'].map(x => h('button', { class: x === exam ? 'on' : '', onclick: () => go('#/writing?exam=' + x) }, EXAM[x])))),
      h('section', { class: 'section gray' }, h('div', { class: 'narrow' },
        h('div', { class: 'row set-row', style: { marginBottom: '14px' } }, h('span', { class: 'grow muted small' }, exam === 'cpe' ? 'The real paper: 90 minutes, Part 1 essay + one Part 2 task.' : 'The real paper: 90 minutes, Part 1 essay + one Part 2 task.'), left),
        reviewCard, fromTeacher,
        h('a', { class: 'card wr-own', href: '#/writing/check' }, h('div', { class: 'grow' }, h('h3', { class: 'h3', style: { margin: '0 0 4px' } }, 'Check your own writing'), h('div', { class: 'muted small' }, 'Any essay, article, letter, report, review or proposal: a strict examiner’s report with every error explained and links to the Cambridge Dictionary.')), h('span', { class: 'btn' }, 'Check')),
        h('h2', { class: 'h3' }, 'Part 1 · Essay (compulsory)'), part(1).map(card),
        h('h2', { class: 'h3', style: { marginTop: '34px' } }, 'Part 2 · Choose one task type'), part(2).map(card),
        mine,
        h('p', { class: 'muted small', style: { marginTop: '40px' } }, 'The marks are an AI estimate on the official Cambridge writing scales and can differ from a real examiner’s. Use them to see your weak points; show important pieces to your teacher. All tasks are original practice material written for Brightword; C1 Advanced and C2 Proficiency are exams of Cambridge University Press & Assessment, which is not connected with Lexicon.'))));
  };

  /* ---------------------------------------------------------------- writing a task */
  views.task = (id, b) => {
    if (id === 'check') return views.check();
    if (id === 'assign') return views.assign(b);
    if (id === 'review') return views.review(b);
    if (id === 'a') return views.assignment(b);
    if (id === 'history') return views.history(b);
    const t = byId(id);
    if (!t) { go('#/writing'); return h('div'); }
    const [lo, hi] = LIMIT[t.exam][t.part];
    const ta = h('textarea', { class: 'wr-text', rows: 18, spellcheck: 'false', placeholder: 'Write your answer here…', 'aria-label': 'Your answer' });
    ta.value = loadDraft(id);
    const count = h('span', { class: 'wr-count' });
    const upd = () => { const n = wordCount(ta.value); count.textContent = `${n} words · aim for ${lo}–${hi}`; count.className = 'wr-count ' + (n < lo * 0.9 ? 'low' : n > hi * 1.1 ? 'high' : 'ok'); saveDraft(id, ta.value); };
    ta.addEventListener('input', upd); upd();
    const t0 = Date.now(), clock = h('span', { class: 'muted small' });
    const tick = setInterval(() => { if (!document.body.contains(clock)) return clearInterval(tick); const m = Math.floor((Date.now() - t0) / 60000); clock.textContent = `${m} min${m === 1 ? '' : 's'} · in the exam about 45 min per task`; }, 1000);
    const btn = h('button', { class: 'btn lg' }, 'Check with AI');
    const status = h('span', { class: 'muted small' });
    btn.onclick = async () => {
      const n = wordCount(ta.value);
      if (n < 60) { toast('Write at least 60 words first.'); return; }
      btn.disabled = true; status.textContent = 'The examiner is reading… (up to a minute)';
      try {
        const r = await CLOUD.fn('lexicon-ai', { task: 'writing', exam: t.exam, part: t.part, type: t.type, prompt: t.prompt, title: t.title, taskId: t.id, text: ta.value });
        const w = r.writing; w.text = ta.value; w.task_id = t.id; w.exam = t.exam; w.part = t.part; w.title = t.title;
        saveDraft(id, '');
        if (w.id) go('#/wr/' + w.id); else { LAST.cur = w; go('#/wr/last'); }
      } catch (e) { status.textContent = e.status === 429 ? e.message : ''; toast(e.status === 404 ? 'AI isn’t set up yet.' : e.message); btn.disabled = false; }
    };
    return shell('#/exams',
      h('section', { class: 'section', style: { paddingTop: '36px' } }, h('div', { class: 'narrow' },
        h('a', { href: '#/writing?exam=' + t.exam, class: 'small' }, '← All writing tasks'),
        h('div', { class: 'muted', style: { margin: '14px 0 4px', fontWeight: 600 } }, `${EXAM[t.exam]} · Writing Part ${t.part} · ${t.type}`),
        h('h1', { class: 'h2', style: { marginBottom: '18px' } }, t.title),
        h('div', { class: 'card wr-task' }, t.prompt.split('\n').map(l => l.trim() ? h('p', {}, l) : null)),
        h('div', { class: 'row', style: { margin: '18px 0 8px', flexWrap: 'wrap', gap: '10px' } }, count, h('span', { class: 'grow' }), clock),
        ta,
        h('div', { class: 'row', style: { marginTop: '14px', gap: '12px', flexWrap: 'wrap' } }, btn, status),
        h('p', { class: 'muted small', style: { marginTop: '10px' } }, 'Your text is saved in this browser as you type. Spellcheck is off, as in the exam.'))));
  };


  /* ---------------------------------------------------------------- check your own writing: any task, full examiner's report */
  const CTYPES = { cae: { 1: ['essay'], 2: ['email', 'letter', 'proposal', 'report', 'review'] }, cpe: { 1: ['essay'], 2: ['article', 'letter', 'report', 'review', 'essay'] } };
  const CKEY = 'lexicon.writing.custom';
  const loadC = () => { try { return Object.assign({ exam: 'cpe', part: 1, type: 'essay', title: '', prompt: '', text: '' }, JSON.parse(localStorage.getItem(CKEY) || '{}')); } catch (e) { return { exam: 'cpe', part: 1, type: 'essay', title: '', prompt: '', text: '' }; } };
  const saveC = c => { try { localStorage.setItem(CKEY, JSON.stringify(c)); } catch (e) { /* */ } };
  views.check = () => {
    const c = loadC();
    const host = h('div');
    const draw = () => {
      if (!CTYPES[c.exam][c.part].includes(c.type)) c.type = CTYPES[c.exam][c.part][0];
      saveC(c);
      const [lo, hi] = LIMIT[c.exam][c.part];
      const seg = (items, val, on) => h('div', { class: 'seg' }, items.map(([v, label]) => h('button', { class: v === val ? 'on' : '', onclick: () => { on(v); draw(); } }, label)));
      const title = h('input', { class: 'input', placeholder: 'A short title (optional), e.g. “Healthier lives — essay”', value: c.title, maxlength: 120 });
      title.oninput = () => { c.title = title.value; saveC(c); };
      const prompt = h('textarea', { class: 'wr-prompt', rows: 7, placeholder: c.part === 1 && c.exam === 'cpe' ? 'Paste the task: the instructions and BOTH texts. The examiner checks that you summarise and evaluate the key points of both.' : c.part === 1 ? 'Paste the task: the instructions and the notes (the three points and the opinions).' : 'Paste the task exactly as it is in the book or exam paper: who you are writing to, why, and every point you must cover.' });
      prompt.value = c.prompt; prompt.oninput = () => { c.prompt = prompt.value; saveC(c); };
      const ta = h('textarea', { class: 'wr-text', rows: 18, spellcheck: 'false', placeholder: 'Paste or write your answer here. Keep the paragraphs: leave an empty line between them.', 'aria-label': 'Your answer' });
      ta.value = c.text;
      const count = h('span', { class: 'wr-count' });
      const upd = () => { const n = wordCount(ta.value); count.textContent = `${n} words · ${EXAM[c.exam]} Part ${c.part}: ${lo}–${hi}`; count.className = 'wr-count ' + (n < lo * 0.9 ? 'low' : n > hi * 1.1 ? 'high' : 'ok'); c.text = ta.value; saveC(c); };
      ta.addEventListener('input', upd); upd();
      const btn = h('button', { class: 'btn lg' }, 'Check it in full');
      const status = h('div', { class: 'wr-wait hidden' });
      btn.onclick = async () => {
        const n = wordCount(ta.value);
        if (n < 80) { toast('Paste at least 80 words.'); return; }
        if (!prompt.value.trim() && !confirm('Without the task the examiner cannot check Content properly. Check anyway?')) return;
        btn.disabled = true; status.classList.remove('hidden');
        const steps = ['Reading the task and your text…', 'Checking every part of the task…', 'Marking Content, Communicative achievement, Organisation and Language…', 'Going through your text sentence by sentence…', 'Looking up better words and collocations…', 'Writing a top-band version of your text…', 'Putting the report together…'];
        const t0 = Date.now();
        const tick = setInterval(() => { if (!document.body.contains(status)) return clearInterval(tick); const s = Math.round((Date.now() - t0) / 1000); clear(status).append(h('span', { class: 'spin' }), h('span', {}, steps[Math.min(steps.length - 1, Math.floor(s / 12))]), h('span', { class: 'muted small' }, ` ${s} s · a full check takes about a minute`)); }, 500);
        try {
          const r = await CLOUD.fn('lexicon-ai', { task: 'essay', exam: c.exam, part: c.part, type: c.type, prompt: prompt.value, title: title.value.trim() || `My ${c.type}`, text: ta.value });
          clearInterval(tick);
          const w = r.writing; w.text = ta.value; w.task_id = 'custom'; w.exam = c.exam; w.part = c.part; w.title = title.value.trim() || `My ${c.type}`;
          c.text = ''; saveC(c);
          if (w.id) go('#/wr/' + w.id); else { LAST.cur = w; go('#/wr/last'); }
        } catch (e) { clearInterval(tick); status.classList.add('hidden'); toast(e.status === 404 ? 'AI isn’t set up yet.' : e.message); btn.disabled = false; }
      };
      clear(host).append(
        h('a', { href: '#/writing?exam=' + c.exam, class: 'small' }, '← Writing'),
        h('h1', { class: 'h2', style: { margin: '14px 0 6px' } }, 'Check your own writing.'),
        h('p', { class: 'muted', style: { marginTop: 0 } }, 'Any task from a coursebook, a past paper or your teacher. The AI marks it as strictly as a Cambridge examiner: the four official subscales with reasons, every error and weak phrase explained, better words with links to the Cambridge Dictionary, and a top-band version of your text.'),
        h('div', { class: 'card wr-form' },
          h('div', { class: 'rl-row' }, h('div', { class: 'rl-lab' }, 'Exam'), seg([['cpe', 'C2 Proficiency'], ['cae', 'C1 Advanced']], c.exam, v => { c.exam = v; })),
          h('div', { class: 'rl-row' }, h('div', { class: 'rl-lab' }, 'Part'), seg([[1, 'Part 1 · Essay'], [2, 'Part 2']], c.part, v => { c.part = v; })),
          c.part === 2 ? h('div', { class: 'rl-row' }, h('div', { class: 'rl-lab' }, 'Task type'), h('div', { class: 'chips' }, CTYPES[c.exam][2].map(t => h('button', { class: 'chip' + (t === c.type ? ' on' : ''), onclick: () => { c.type = t; draw(); } }, t[0].toUpperCase() + t.slice(1))))) : null,
          h('div', { class: 'rl-row' }, h('div', { class: 'rl-lab' }, 'Title'), title)),
        h('h2', { class: 'h3', style: { marginTop: '26px' } }, 'The task'), prompt,
        h('div', { class: 'row', style: { margin: '22px 0 8px', flexWrap: 'wrap', gap: '10px' } }, h('h2', { class: 'h3', style: { margin: 0 } }, 'Your answer'), h('span', { class: 'grow' }), count),
        ta,
        h('div', { class: 'row', style: { marginTop: '14px', gap: '12px', flexWrap: 'wrap', alignItems: 'center' } }, btn, status),
        h('p', { class: 'muted small', style: { marginTop: '10px' } }, 'Saved in this browser as you type. One full check counts as one of your daily AI checks.'));
    };
    draw();
    return shell('#/exams', h('section', { class: 'section', style: { paddingTop: '36px' } }, h('div', { class: 'narrow' }, host)));
  };

  /* ---------------------------------------------------------------- the full report */
  // the official descriptors, so that a band lowered by the error check shows the right wording
  const DESC = {
    cpe: {
      content: { 5: 'All content is relevant to the task. Target reader is fully informed.', 3: 'Minor irrelevances and/or omissions may be present. Target reader is on the whole informed.', 1: 'Irrelevances and misinterpretation of task may be present. Target reader is minimally informed.', 0: 'Content is totally irrelevant. Target reader is not informed.' },
      communicative: { 5: 'Demonstrates complete command of the conventions of the communicative task. Communicates complex ideas in an effective and convincing way, holding the target reader’s attention with ease, fulfilling all communicative purposes.', 3: 'Uses the conventions of the communicative task with sufficient flexibility to communicate complex ideas in an effective way, holding the target reader’s attention with ease, fulfilling all communicative purposes.', 1: 'Uses the conventions of the communicative task effectively to hold the target reader’s attention and communicate straightforward and complex ideas, as appropriate.', 0: 'Performance below Band 1.' },
      organisation: { 5: 'Text is organised impressively and coherently using a wide range of cohesive devices and organisational patterns with complete flexibility.', 3: 'Text is a well-organised, coherent whole, using a variety of cohesive devices and organisational patterns with flexibility.', 1: 'Text is well organised and coherent, using a variety of cohesive devices and organisational patterns to generally good effect.', 0: 'Performance below Band 1.' },
      language: { 5: 'Uses a wide range of vocabulary, including less common lexis, with fluency, precision, sophistication and style. Use of grammar is sophisticated, fully controlled and completely natural. Any inaccuracies occur only as slips.', 3: 'Uses a range of vocabulary, including less common lexis, effectively and precisely. Uses a wide range of simple and complex grammatical forms with full control, flexibility and sophistication. Errors, if present, are related to less common words and structures, or occur as slips.', 1: 'Uses a range of vocabulary, including less common lexis, appropriately. Uses a range of simple and complex grammatical forms with control and flexibility. Occasional errors may be present but do not impede communication.', 0: 'Performance below Band 1.' },
    },
    cae: {
      content: { 5: 'All content is relevant to the task. Target reader is fully informed.', 3: 'Minor irrelevances and/or omissions may be present. Target reader is on the whole informed.', 1: 'Irrelevances and misinterpretation of task may be present. Target reader is minimally informed.', 0: 'Content is totally irrelevant. Target reader is not informed.' },
      communicative: { 5: 'Uses the conventions of the communicative task with sufficient flexibility to communicate complex ideas in an effective way, holding the target reader’s attention with ease, fulfilling all communicative purposes.', 3: 'Uses the conventions of the communicative task effectively to hold the target reader’s attention and communicate straightforward and complex ideas, as appropriate.', 1: 'Uses the conventions of the communicative task to hold the target reader’s attention and communicate straightforward ideas.', 0: 'Performance below Band 1.' },
      organisation: { 5: 'Text is a well-organised, coherent whole, using a variety of cohesive devices and organisational patterns with flexibility.', 3: 'Text is well organised and coherent, using a variety of cohesive devices and organisational patterns to generally good effect.', 1: 'Text is generally well organised and coherent, using a variety of linking words and cohesive devices.', 0: 'Performance below Band 1.' },
      language: { 5: 'Uses a range of vocabulary, including less common lexis, effectively and precisely. Uses a wide range of simple and complex grammatical forms with full control, flexibility and sophistication. Errors, if present, are related to less common words and structures, or occur as slips.', 3: 'Uses a range of vocabulary, including less common lexis, appropriately. Uses a range of simple and complex grammatical forms with control and flexibility. Occasional errors may be present but do not impede communication.', 1: 'Uses a range of everyday vocabulary appropriately, with occasional inappropriate use of less common lexis. Uses a range of simple and some complex grammatical forms with a good degree of control. Errors do not impede communication.', 0: 'Performance below Band 1.' },
    },
  };
  const descOf = (exam, k, b) => { const d = (DESC[exam] || DESC.cpe)[k]; return b === 4 ? 'Band 4 shares features of Bands 3 and 5.' : b === 2 ? 'Band 2 shares features of Bands 1 and 3.' : d[b]; };
  const SEV = { error: 'Error', slip: 'Slip', better: 'Could be better' };
  const STATUS = { met: '✓', partly: '◐', missing: '✕' };
  // Cambridge's own search finds the entry for inflected forms (healthier → healthy) and phrasal verbs, and suggests idioms
  const camb = t => 'https://dictionary.cambridge.org/search/direct/?datasetsearch=english&q=' + encodeURIComponent(String(t).toLowerCase());
  const dictChips = d => d && d.length ? h('div', { class: 'wr-dict' }, h('span', { class: 'muted small' }, 'Cambridge Dictionary:'), d.map(x => h('a', { href: camb(x.term), target: '_blank', rel: 'noopener', class: 'wr-dchip' }, x.term + ' ↗'))) : null;
  // find each issue's quote in the text (spaces, quotes and dashes may differ), keep non-overlapping ranges
  function locate(text, items) {
    const flex = q => q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+').replace(/['’‘`]/g, "['’‘`]").replace(/["“”]/g, '["“”]').replace(/[-–—]/g, '[-–—]');
    const used = [];
    items.forEach((it, i) => {
      let m = null; const re = new RegExp(flex(it.quote), 'gi');
      while ((m = re.exec(text))) { const a = m.index, b = a + m[0].length; if (!used.some(u => a < u.b && b > u.a)) { used.push({ a, b, i }); break; } }
    });
    return used.sort((x, y) => x.a - y.a);
  }
  function markedText(text, issues) {
    const ranges = locate(text, issues), out = []; let at = 0;
    for (const r of ranges) {
      if (r.a > at) out.push(text.slice(at, r.a));
      const it = issues[r.i];
      out.push(h('mark', { class: 'wr-mk ' + it.severity, title: `${r.i + 1}. → ${it.fix}`, onclick: () => { const el = document.getElementById('wr-i' + (r.i + 1)); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); } } }, text.slice(r.a, r.b), h('sup', {}, r.i + 1)));
      at = r.b;
    }
    out.push(text.slice(at));
    return out;
  }
  function fullView(w, host, R0) {
    const R = R0 || w.final || w.result || w, text = w.text || '', task = !!w.assignment_id;
    const issues = R.issues || [], ups = R.upgrades || [];
    const card = (title, ...kids) => h('div', { class: 'card', style: { marginTop: '16px' } }, h('h3', { class: 'h3' }, title), ...kids);
    const counts = {}; issues.forEach(i => { counts[i.type] = (counts[i.type] || 0) + 1; });
    const list = h('div', { class: 'wr-issues' });
    let filter = 'all';
    const drawList = () => clear(list).append(...issues.map((it, i) => (filter === 'all' || filter === it.type || filter === it.severity) ? h('div', { class: 'wr-issue ' + it.severity, id: 'wr-i' + (i + 1) },
      h('div', { class: 'row wr-ihead' }, h('b', { class: 'wr-num' }, i + 1), h('span', { class: 'wr-badge' }, it.type), h('span', { class: 'wr-badge sev ' + it.severity }, SEV[it.severity])),
      h('div', { class: 'wr-change' }, h('s', {}, it.quote), h('span', { class: 'wr-arrow' }, '→'), h('b', {}, it.fix)),
      it.why ? h('p', { class: 'wr-why' }, it.why) : null, dictChips(it.dict)) : null).filter(Boolean));
    const filters = h('div', { class: 'chips no-print', style: { margin: '6px 0 14px' } });
    const drawFilters = () => clear(filters).append(
      ...[['all', `All ${issues.length}`], ['error', `Errors ${issues.filter(i => i.severity === 'error').length}`], ['better', `Could be better ${issues.filter(i => i.severity === 'better').length}`]].concat(Object.entries(counts).map(([k, n]) => [k, `${k} ${n}`]))
        .map(([k, label]) => h('button', { class: 'chip' + (filter === k ? ' on' : ''), onclick: () => { filter = k; drawFilters(); drawList(); } }, label)));
    drawFilters(); drawList();
    const improved = h('div', { class: 'hidden print-show' }, h('div', { class: 'wr-model', style: { whiteSpace: 'pre-wrap' } }, R.improved || ''),
      (R.improvedNotes || []).length ? h('ul', { class: 'small', style: { marginTop: '14px' } }, R.improvedNotes.map(x => h('li', {}, x))) : null,
      h('button', { class: 'btn sm plain', style: { marginTop: '10px' }, onclick: () => { navigator.clipboard && navigator.clipboard.writeText(R.improved || '').then(() => toast('Copied')); } }, 'Copy'));
    const pdf = () => { filter = 'all'; drawFilters(); drawList(); printReport(w.title || 'Writing report', w.student_name); };
    clear(host).append(...[
      h('div', { class: 'row no-print', style: { gap: '10px', flexWrap: 'wrap' } }, h('a', { href: '#/writing?exam=' + (w.exam || 'cpe'), class: 'small grow' }, '← Writing'),
        h('button', { class: 'btn sm plain', onclick: pdf }, 'Download PDF')),
      h('div', { class: 'print-only wr-print-head' }, h('b', {}, 'Brightword'), ' · Writing report', w.student_name ? ' · ' + w.student_name : ''),
      h('div', { class: 'muted', style: { margin: '14px 0 4px', fontWeight: 600 } }, `${EXAM[w.exam || R.exam] || ''} · Writing Part ${w.part || R.part} · ${R.type || ''} · ${R.words} words (${(R.range || []).join('–')})${w.created_at ? ' · ' + fmtDate(w.created_at) : ''}`),
      h('h1', { class: 'h2', style: { marginBottom: '20px' } }, w.title || 'My writing'),
      R.reviewed ? h('div', { class: 'card wr-teacher' }, h('div', { class: 'wr-teacher-h' }, h('b', {}, '✓ Checked by your teacher'), R.reviewed.by ? ' · ' + R.reviewed.by : '', R.reviewed.at ? h('span', { class: 'muted small' }, ' · ' + fmtDate(R.reviewed.at)) : null),
        R.teacherNote ? h('p', { class: 'wr-tnote' }, R.teacherNote) : null) : null,
      h('div', { class: 'card wr-score-card' },
        h('div', { class: 'wr-total' }, h('b', {}, R.total), h('span', {}, '/ 20'), h('div', { class: 'muted small' }, `about ${levelOf(w.exam || R.exam, R.total)} level`)),
        h('div', { class: 'wr-bars' }, SUB.map(([k, name]) => { const s = R.scores[k]; return h('a', { class: 'wr-bar', href: '#', onclick: ev => { ev.preventDefault(); const el = document.getElementById('wr-s-' + k); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } },
          h('div', { class: 'row' }, h('b', { class: 'grow' }, name), h('b', {}, `${s.band}/5`)),
          h('div', { class: 'bar' }, h('i', { style: { width: (s.band / 5 * 100) + '%' } }))); }))),
      R.summary ? h('div', { class: 'card', style: { marginTop: '16px' } }, h('p', { style: { margin: 0, fontSize: '17px', lineHeight: 1.55 } }, R.summary)) : null,
      (R.missing || []).length ? h('p', { class: 'err small' }, `This part of the report could not be produced this time: ${R.missing.join(', ')}. Check again later for the full report.`) : null,
      (R.priorities || []).length ? card('What will raise your mark most', h('ol', { class: 'wr-prio' }, R.priorities.map(x => h('li', {}, x)))) : null,
      (R.requirements || []).length ? card('Did you do everything the task asks?', h('div', { class: 'wr-reqs' }, R.requirements.map(r => h('div', { class: 'wr-req ' + r.status }, h('b', { class: 'wr-st' }, STATUS[r.status]), h('div', {}, h('b', {}, r.point), r.comment ? h('div', { class: 'muted small' }, r.comment) : null))))) : null,
      card('Your mark, criterion by criterion', ...SUB.map(([k, name]) => { const s = R.scores[k]; return h('div', { class: 'wr-crit', id: 'wr-s-' + k },
        h('div', { class: 'row' }, h('h4', { class: 'grow' }, name), h('b', { class: 'wr-band' }, `Band ${s.band}`)),
        h('blockquote', { class: 'wr-desc' }, descOf(w.exam || R.exam, k, s.band)),
        s.why ? h('p', {}, s.adjusted && !s.teacher ? h('span', { class: 'muted' }, `The examiner’s first reading gave band ${s.aiBand}: `) : null, s.why) : null,
        (s.evidence || []).length ? h('div', { class: 'muted small' }, 'From your text: ', s.evidence.map((q, i) => h('span', {}, i ? ' · ' : '', h('i', {}, '“' + q + '”')))) : null,
        s.adjusted && !s.teacher ? h('p', { class: 'wr-adj small' }, s.adjusted) : null,
        s.next && s.band < 5 ? h('p', { class: 'wr-next' }, h('b', {}, `To reach band ${s.band + 1}: `), s.next) : null); })),
      (R.strengths || []).length ? card('What works well', h('ul', { class: 'wr-str' }, R.strengths.map(s => h('li', {}, h('b', {}, s.point), s.quote ? h('span', { class: 'muted' }, ` — “${s.quote}”`) : null, s.why ? h('div', { class: 'small muted' }, s.why) : null)))) : null,
      text ? card('Your text, marked', h('p', { class: 'muted small' }, h('span', { class: 'wr-mk error' }, 'error'), ' ', h('span', { class: 'wr-mk slip' }, 'slip'), ' ', h('span', { class: 'wr-mk better' }, 'could be better'), ' — tap a mark to see the explanation.'), h('div', { class: 'wr-mine' }, markedText(text, issues))) : null,
      issues.length ? card(`Every comment, explained (${issues.length})`, filters, list) : null,
      ups.length ? card('Better words and phrases', h('div', { class: 'wr-ups' }, ups.map(v => h('div', { class: 'wr-up' },
        h('div', { class: 'wr-change' }, h('span', {}, v.instead), h('span', { class: 'wr-arrow' }, '→'), h('b', {}, v.try)),
        v.why ? h('p', { class: 'wr-why' }, v.why) : null, v.example ? h('p', { class: 'wr-ex' }, v.example) : null, dictChips(v.dict))))) : null,
      (R.paragraphs || []).length ? card('Paragraph by paragraph', h('ol', { class: 'wr-paras' }, R.paragraphs.map(p => h('li', {}, p.role ? h('b', {}, p.role + '. ') : null, p.comment)))) : null,
      R.cohesion && (R.cohesion.good.length || R.cohesion.weak.length) ? card('Linking and cohesion',
        R.cohesion.good.length ? h('p', {}, h('b', {}, 'Works: '), R.cohesion.good.join(' · ')) : null,
        R.cohesion.weak.length ? h('p', {}, h('b', {}, 'Weak or overused: '), R.cohesion.weak.join(' · ')) : null,
        R.cohesion.advice ? h('p', { class: 'muted' }, R.cohesion.advice) : null) : null,
      R.improved ? card('Your text at the top band', h('p', { class: 'muted small' }, 'Your ideas and plan, rewritten as a band 5 answer. Try to improve your own text first, then compare.'),
        h('button', { class: 'btn plain', onclick: ev => { improved.classList.toggle('hidden'); ev.target.textContent = improved.classList.contains('hidden') ? 'Show the top-band version' : 'Hide it'; } }, 'Show the top-band version'), improved) : null,
      R.prompt ? h('details', { class: 'card', style: { marginTop: '16px' } }, h('summary', {}, 'The task'), h('div', { class: 'wr-task', style: { marginTop: '10px' } }, R.prompt.split('\n').map(l => l.trim() ? h('p', {}, l) : null))) : null,
      h('div', { class: 'row no-print', style: { marginTop: '20px', gap: '10px', flexWrap: 'wrap' } }, task ? null : h('a', { class: 'btn', href: '#/writing/check' }, 'Check another text'), h('button', { class: 'btn plain', onclick: pdf }, 'Download PDF'),
        h('a', { class: 'btn plain', href: '#/writing/history' + (w.can_review && w.user_id ? '/' + w.user_id : '') }, 'Progress chart'), h('a', { class: 'btn plain', href: '#/writing?exam=' + (w.exam || 'cpe') }, 'Writing')),
      R.reviewed ? h('p', { class: 'muted small', style: { marginTop: '24px' } }, 'Marked by your teacher, who started from an AI examiner’s draft and checked and edited every mark and comment.') : h('p', { class: 'muted small', style: { marginTop: '24px' } }, `An AI estimate on the official Cambridge subscales${R.model ? ' (model: ' + R.model.split('/').pop() + ')' : ''}, deliberately strict. A real examiner may mark differently, and the AI can be wrong about a single comment: if one looks doubtful, check it in the dictionary or ask your teacher.`)].filter(x => x != null));
  }

  /* ---------------------------------------------------------------- result */
  const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function highlighted(text, errors) {
    const qs = errors.map(e => e.quote).filter(Boolean).sort((a, b) => b.length - a.length);
    if (!qs.length) return [text];
    const re = new RegExp('(' + qs.map(escapeRe).join('|') + ')', 'gi');
    return text.split(re).map(part => { const e = errors.find(x => x.quote.toLowerCase() === part.toLowerCase()); return e ? h('mark', { class: 'wr-err', title: `→ ${e.fix}${e.why ? ' · ' + e.why : ''}` }, part) : part; });
  }
  function resultView(w, host) {
    if (w.assignment_id && w.can_review) return reviewView(w, host);
    if (w.assignment_id && w.status !== 'approved') return handedIn(w, host);
    if ((w.final || w.result || w).v === 2) return fullView(w, host);
    const R = w.result || w, t = byId(w.task_id) || {};
    clear(host).append(
      h('a', { href: '#/writing?exam=' + (w.exam || 'cpe'), class: 'small' }, '← All writing tasks'),
      h('div', { class: 'muted', style: { margin: '14px 0 4px', fontWeight: 600 } }, `${EXAM[w.exam] || ''} · Writing Part ${w.part} · ${R.words} words${w.created_at ? ' · ' + fmtDate(w.created_at) : ''}`),
      h('h1', { class: 'h2', style: { marginBottom: '20px' } }, w.title || t.title || 'Writing'),
      h('div', { class: 'card wr-score-card' },
        h('div', { class: 'wr-total' }, h('b', {}, R.total), h('span', {}, '/ 20'), h('div', { class: 'muted small' }, `about ${levelOf(w.exam, R.total)} level`)),
        h('div', { class: 'wr-bars' }, SUB.map(([k, name]) => { const s = R.scores[k]; return h('div', { class: 'wr-bar' },
          h('div', { class: 'row' }, h('b', { class: 'grow' }, name), h('b', {}, `${s.band}/5`)),
          h('div', { class: 'bar' }, h('i', { style: { width: (s.band / 5 * 100) + '%' } })),
          s.why ? h('div', { class: 'muted small' }, s.why) : null); }))),
      R.summary ? h('div', { class: 'card', style: { marginTop: '16px' } }, h('p', { style: { margin: 0 } }, R.summary)) : null,
      R.priorities.length ? h('div', { class: 'card', style: { marginTop: '16px' } }, h('h3', { class: 'h3' }, 'Do these three things next time'), h('ol', {}, R.priorities.map(x => h('li', {}, x)))) : null,
      R.strengths.length ? h('div', { class: 'card', style: { marginTop: '16px' } }, h('h3', { class: 'h3' }, 'What works well'), h('ul', {}, R.strengths.map(x => h('li', {}, x)))) : null,
      R.errors.length ? h('div', { class: 'card', style: { marginTop: '16px' } }, h('h3', { class: 'h3' }, 'Corrections'),
        h('table', { class: 'wr-table' }, h('tbody', {}, R.errors.map(e => h('tr', {}, h('td', {}, h('s', {}, e.quote)), h('td', {}, h('b', {}, e.fix)), h('td', { class: 'muted small' }, e.why)))))) : null,
      R.vocabulary.length ? h('div', { class: 'card', style: { marginTop: '16px' } }, h('h3', { class: 'h3' }, 'Upgrade your vocabulary'),
        h('table', { class: 'wr-table' }, h('tbody', {}, R.vocabulary.map(v => h('tr', {}, h('td', {}, v.instead), h('td', {}, h('b', {}, v.try)), h('td', { class: 'muted small' }, v.why)))))) : null,
      R.example ? h('div', { class: 'card', style: { marginTop: '16px' } }, h('h3', { class: 'h3' }, 'Your weakest paragraph, rewritten at the top band'), h('p', { class: 'wr-model' }, R.example)) : null,
      w.text ? h('div', { class: 'card', style: { marginTop: '16px' } }, h('h3', { class: 'h3' }, 'Your text'), h('p', { class: 'muted small' }, 'Marked words: hover or tap to see the correction.'), h('div', { class: 'wr-mine' }, highlighted(w.text, R.errors))) : null,
      t.id ? h('div', { class: 'row', style: { marginTop: '20px', gap: '10px' } }, h('button', { class: 'btn', onclick: () => go('#/writing/' + t.id) }, 'Write it again'), h('a', { class: 'btn plain', href: '#/writing?exam=' + (w.exam || 'cpe') }, 'Another task')) : null,
      h('p', { class: 'muted small', style: { marginTop: '24px' } }, `An AI estimate on the official Cambridge subscales${R.model ? ' (model: ' + R.model.split('/').pop() + ')' : ''}. A real examiner may mark differently.`));
  }
  views.result = id => {
    const host = h('div', { class: 'narrow' }, h('p', { class: 'muted' }, 'Loading…'));
    if (id === 'last') { if (LAST.cur) resultView(LAST.cur, host); else go('#/writing'); }
    else CLOUD.rpc('writing_get', { p_id: id }).then(r => { const w = Array.isArray(r) ? r[0] : r; if (!w) throw new Error('This piece of writing was not found.'); resultView(w, host); }).catch(e => { clear(host).append(h('p', { class: 'err' }, e.message)); });
    return shell('#/exams', h('section', { class: 'section', style: { paddingTop: '36px' } }, host));
  };

  /* ---------------------------------------------------------------- PDF: the browser's own "Save as PDF", with a print layout */
  function printReport(title, who) {
    const old = document.title;
    document.title = [title, who].filter(Boolean).join(' — ') + ' · Brightword';
    document.body.classList.add('printing');
    const shut = [...document.querySelectorAll('details:not([open])')]; shut.forEach(d => { d.open = true; });
    const done = () => { document.title = old; document.body.classList.remove('printing'); shut.forEach(d => { d.open = false; }); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    setTimeout(() => { window.print(); setTimeout(done, 1500); }, 60);
    toast('In the print window choose “Save as PDF”.');
  }

  /* ---------------------------------------------------------------- student: a task handed in, waiting for the teacher */
  function handedIn(w, host) {
    clear(host).append(...[
      h('a', { href: '#/writing?exam=' + (w.exam || 'cpe'), class: 'small' }, '← Writing'),
      h('div', { class: 'muted', style: { margin: '14px 0 4px', fontWeight: 600 } }, `${EXAM[w.exam] || ''} · Writing Part ${w.part} · ${w.words} words · handed in ${fmtDate(w.created_at)}`),
      h('h1', { class: 'h2', style: { marginBottom: '20px' } }, w.title || 'Writing task'),
      h('div', { class: 'card wr-teacher' }, h('div', { class: 'wr-teacher-h' }, h('b', {}, '⏳ With your teacher')),
        h('p', { style: { margin: '6px 0 0' } }, 'Your teacher is checking it. When the marks and comments are ready, you will get a message and the full report will appear here.')),
      w.prompt ? h('details', { class: 'card', style: { marginTop: '16px' } }, h('summary', {}, 'The task'), h('div', { class: 'wr-task', style: { marginTop: '10px' } }, w.prompt.split('\n').map(l => l.trim() ? h('p', {}, l) : null))) : null,
      h('div', { class: 'card', style: { marginTop: '16px' } }, h('h3', { class: 'h3' }, 'What you handed in'), h('div', { class: 'wr-mine' }, w.text || ''))].filter(Boolean));
  }

  /* ---------------------------------------------------------------- teacher: check the AI draft, edit, approve */
  const clone = o => JSON.parse(JSON.stringify(o || {}));
  const ITYPES = ['grammar', 'vocabulary', 'collocation', 'word choice', 'register', 'spelling', 'punctuation', 'cohesion', 'style', 'task'];
  function reviewView(w, host) {
    const ai = w.result || {};
    const F = clone(w.final || ai);                          // what the student will see
    F.scores = F.scores || {}; SUB.forEach(([k]) => { F.scores[k] = F.scores[k] || { band: 0, why: '' }; });
    F.issues = (F.issues || []).map(x => Object.assign({ keep: true }, x));
    const text = w.text || '';
    const approved = w.status === 'approved';
    let dirty = false, view = 'edit';
    const body = h('div');
    const totalEl = h('b');
    const status = h('span', { class: 'muted small' });
    const total = () => SUB.reduce((n, [k]) => n + (+F.scores[k].band || 0), 0);
    const touch = () => { dirty = true; status.textContent = 'Unsaved changes'; totalEl.textContent = total(); };
    const finalOf = () => {
      const R = clone(F);
      R.issues = F.issues.filter(x => x.keep).map(({ keep, ...x }) => x);
      R.issues.sort((a, b) => { const i = text.toLowerCase().indexOf(a.quote.toLowerCase()), j = text.toLowerCase().indexOf(b.quote.toLowerCase()); return i - j; });
      R.total = total();
      R.errors = R.issues.filter(e => e.severity !== 'better').slice(0, 12).map(e => ({ quote: e.quote, fix: e.fix, why: (e.why || '').slice(0, 200) }));
      R.priorities = (R.priorities || []).filter(Boolean);
      R.reviewed = { by: (St().profile && St().profile.name) || '', at: new Date().toISOString() };
      R.v = 2; R.kind = 'full'; delete R.noai; delete R.noaiWhy;
      return R;
    };
    const save = async approve => {
      if (approve && !confirm(approved ? 'Save the changes? The student sees them straight away.' : `Approve and send to ${w.student_name || w.student_email}? They will get a message with the report (${total()}/20).`)) return;
      status.textContent = 'Saving…';
      try {
        await CLOUD.rpc('writing_review', { p_id: w.id, p_final: finalOf(), p_approve: !!approve || approved });
        dirty = false;
        if (approve && !approved) { toast('Approved: the student can see the report now.'); go('#/writing/review'); return; }
        status.textContent = 'Saved ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch (e) { status.textContent = ''; toast(e.message); }
    };
    const redo = async btn => {
      btn.disabled = true; btn.textContent = 'The AI is reading… (about a minute)';
      try { const r = await CLOUD.fn('lexicon-ai', { task: 'essay_redo', attempt: w.id }); if (r.error) throw new Error(r.error); toast('The AI draft is ready.'); go('#/wr/' + w.id); }
      catch (e) { toast(e.message); btn.disabled = false; btn.textContent = 'Ask the AI for a draft again'; }
    };

    // the editor
    const scoreBox = c => {
      const [k, name] = c, s = F.scores[k];
      const seg = h('div', { class: 'seg wr-bandseg' });
      const drawSeg = () => clear(seg).append(...[0, 1, 2, 3, 4, 5].map(b => h('button', { class: b === +s.band ? 'on' : '', onclick: () => { if (b !== +s.band) { s.band = b; s.teacher = true; touch(); drawSeg(); desc.textContent = descOf(w.exam, k, b); } } }, String(b))));
      drawSeg();
      const desc = h('blockquote', { class: 'wr-desc' }, descOf(w.exam, k, +s.band));
      const why = h('textarea', { class: 'wr-edit', rows: 3 }); why.value = s.why || ''; why.oninput = () => { s.why = why.value; s.teacher = true; touch(); };
      const aiB = ai.scores && ai.scores[k] && !ai.noai ? ai.scores[k].band : null;
      return h('div', { class: 'wr-crit' }, h('div', { class: 'row', style: { gap: '10px', flexWrap: 'wrap' } }, h('h4', { class: 'grow' }, name), aiB != null ? h('span', { class: 'muted small' }, `AI: ${aiB}`) : null, seg), desc, why,
        s.next !== undefined ? (() => { const n = h('textarea', { class: 'wr-edit', rows: 2, placeholder: 'To reach the next band… (optional)' }); n.value = s.next || ''; n.oninput = () => { s.next = n.value; touch(); }; return h('div', {}, h('div', { class: 'muted small' }, 'To reach the next band'), n); })() : null);
    };
    const issueBox = (it, i) => {
      const fix = h('input', { class: 'input', value: it.fix || '' }); fix.oninput = () => { it.fix = fix.value; touch(); };
      const why = h('textarea', { class: 'wr-edit', rows: 2 }); why.value = it.why || ''; why.oninput = () => { it.why = why.value; touch(); };
      const sev = h('select', {}, ['error', 'slip', 'better'].map(v => h('option', { value: v, selected: it.severity === v }, SEV[v]))); sev.onchange = () => { it.severity = sev.value; touch(); box.className = 'wr-issue ' + it.severity + (it.keep ? '' : ' off'); };
      const keep = h('input', { type: 'checkbox', checked: it.keep }); keep.onchange = () => { it.keep = keep.checked; touch(); box.className = 'wr-issue ' + it.severity + (it.keep ? '' : ' off'); drawMarks(); };
      const box = h('div', { class: 'wr-issue ' + it.severity + (it.keep ? '' : ' off'), id: 'wr-i' + (i + 1) },
        h('div', { class: 'row wr-ihead', style: { gap: '10px', flexWrap: 'wrap' } }, h('b', { class: 'wr-num' }, i + 1), h('label', { class: 'row', style: { gap: '6px', alignItems: 'center' } }, keep, 'Keep'), h('span', { class: 'wr-badge' }, it.type), sev, it.added ? h('span', { class: 'wr-badge' }, 'yours') : null),
        h('div', { class: 'wr-change' }, h('s', {}, it.quote), h('span', { class: 'wr-arrow' }, '→')), fix, why, dictChips(it.dict));
      return box;
    };
    const marks = h('div', { class: 'wr-mine wr-pick' });
    const drawMarks = () => clear(marks).append(...markedText(text, F.issues.map(x => x.keep ? x : Object.assign({}, x, { quote: '\u0000' }))));
    const add = { quote: h('input', { class: 'input', placeholder: 'Select words in the text above, or type them exactly' }), fix: h('input', { class: 'input', placeholder: 'Correction or better version' }), why: h('textarea', { class: 'wr-edit', rows: 2, placeholder: 'Explanation for the student' }),
      sev: h('select', {}, ['error', 'slip', 'better'].map(v => h('option', { value: v }, SEV[v]))), type: h('select', {}, ITYPES.map(v => h('option', { value: v }, v))) };
    marks.addEventListener('mouseup', () => { const t = String(window.getSelection() || '').replace(/\d+$/, '').trim(); if (t && t.length < 160) { add.quote.value = t; add.fix.focus(); } });
    const issuesHost = h('div', { class: 'wr-issues' });
    const drawIssues = () => clear(issuesHost).append(...F.issues.map(issueBox));
    const addBtn = h('button', { class: 'btn sm', onclick: () => {
      const q = add.quote.value.trim(), f = add.fix.value.trim();
      if (!q || !f) { toast('Fill in the words and the correction.'); return; }
      if (!text.toLowerCase().includes(q.toLowerCase())) { toast('These words are not in the text exactly like that.'); return; }
      F.issues.push({ quote: q, fix: f, why: add.why.value.trim(), severity: add.sev.value, type: add.type.value, dict: [], keep: true, added: true });
      add.quote.value = add.fix.value = add.why.value = ''; touch(); drawIssues(); drawMarks();
    } }, 'Add comment');
    const note = h('textarea', { class: 'wr-edit', rows: 3, placeholder: 'A personal comment for the student (optional): what you liked, what to focus on next time.' });
    note.value = F.teacherNote || ''; note.oninput = () => { F.teacherNote = note.value; touch(); };
    const summary = h('textarea', { class: 'wr-edit', rows: 4 }); summary.value = F.summary || ''; summary.oninput = () => { F.summary = summary.value; touch(); };
    const prio = h('textarea', { class: 'wr-edit', rows: 4, placeholder: 'One per line' }); prio.value = (F.priorities || []).join('\n'); prio.oninput = () => { F.priorities = prio.value.split('\n').map(x => x.trim()); touch(); };

    const drawEdit = () => {
      drawIssues(); drawMarks(); totalEl.textContent = total();
      clear(body).append(...[
        ai.noai ? h('div', { class: 'card wr-teacher', style: { marginTop: '16px' } }, h('b', {}, 'No AI draft for this text yet.'), h('p', { class: 'small' }, ai.noaiWhy || ''), h('p', { class: 'small muted' }, 'You can mark it yourself below, or ask the AI again (uses one of your daily AI checks).'),
          h('button', { class: 'btn sm', onclick: ev => redo(ev.target) }, 'Ask the AI for a draft again')) : null,
        h('div', { class: 'card', style: { marginTop: '16px' } }, h('h3', { class: 'h3' }, 'Your comment to the student'), note),
        h('div', { class: 'card', style: { marginTop: '16px' } }, h('h3', { class: 'h3' }, 'Marks'), h('p', { class: 'muted small', style: { marginTop: 0 } }, 'Start from the AI examiner’s draft and change anything you disagree with. The student sees only your final version.'), ...SUB.map(scoreBox)),
        h('div', { class: 'card', style: { marginTop: '16px' } }, h('h3', { class: 'h3' }, 'Overall verdict'), summary, h('h4', { style: { margin: '16px 0 6px' } }, 'What will raise the mark most'), prio),
        h('div', { class: 'card', style: { marginTop: '16px' } }, h('h3', { class: 'h3' }, 'The text'), h('p', { class: 'muted small', style: { marginTop: 0 } }, 'Select words with the mouse to add your own comment on them.'), marks,
          h('div', { class: 'wr-addc' }, h('h4', { style: { margin: '0 0 8px' } }, 'Add your own comment'), add.quote, add.fix, add.why, h('div', { class: 'row', style: { gap: '8px', flexWrap: 'wrap', alignItems: 'center' } }, add.sev, add.type, addBtn))),
        h('div', { class: 'card', style: { marginTop: '16px' } }, h('h3', { class: 'h3' }, `Comments (${F.issues.length})`), h('p', { class: 'muted small', style: { marginTop: 0 } }, 'Untick a comment to remove it. Edit the correction or the explanation as you like.'), issuesHost),
        h('p', { class: 'muted small', style: { marginTop: '16px' } }, 'Strengths, the paragraph analysis, better words and the top-band version come from the AI draft and are shown to the student as they are.')].filter(Boolean));
    };
    const preview = () => { const box = h('div'); fullView(Object.assign({}, w, { can_review: true }), box, finalOf()); const first = box.querySelector('.no-print'); if (first) first.remove(); clear(body).append(h('div', { class: 'wr-previewnote' }, 'Preview: this is what the student will see.'), box); };
    const modeBtn = h('button', { class: 'btn plain' }, 'Preview');
    modeBtn.onclick = () => { view = view === 'edit' ? 'preview' : 'edit'; modeBtn.textContent = view === 'edit' ? 'Preview' : 'Back to editing'; if (view === 'edit') drawEdit(); else preview(); window.scrollTo(0, 0); };
    window.onbeforeunload = () => dirty && document.body.contains(host) ? 'You have unsaved changes.' : undefined;
    const bar = h('div', { class: 'wr-bar-sticky no-print' }, h('div', { class: 'wr-bar-in' },
      h('div', { class: 'wr-bar-total' }, totalEl, h('span', { class: 'muted' }, ' / 20')), status, h('span', { class: 'grow' }), modeBtn,
      h('button', { class: 'btn plain', onclick: () => save(false) }, approved ? 'Save' : 'Save draft'),
      approved ? h('button', { class: 'btn plain', onclick: async () => { if (!confirm('Hide the report from the student again and put it back in “To check”?')) return; try { await CLOUD.rpc('writing_reopen', { p_id: w.id }); toast('Back in “To check”.'); go('#/writing/review'); } catch (e) { toast(e.message); } } }, 'Reopen') : null,
      h('button', { class: 'btn', onclick: () => save(true) }, approved ? 'Save for the student' : 'Approve and send')));
    clear(host).append(...[
      h('a', { href: '#/writing/review', class: 'small' }, '← To check'),
      h('div', { class: 'muted', style: { margin: '14px 0 4px', fontWeight: 600 } }, `${w.student_name || w.student_email} · ${EXAM[w.exam] || ''} Part ${w.part} · ${w.words} words · handed in ${fmtDate(w.created_at)}`),
      h('h1', { class: 'h2', style: { marginBottom: '6px' } }, w.title || 'Writing task'),
      h('div', { class: 'row', style: { gap: '8px', flexWrap: 'wrap', alignItems: 'center' } }, h('span', { class: 'pill ' + (approved ? 'ok' : 'wait') }, approved ? `Approved · the student sees ${w.score}/20` : 'Waiting for your review'),
        ai.noai ? null : h('span', { class: 'muted small' }, `AI draft: ${ai.total}/20`), h('a', { class: 'small', href: '#/writing/history/' + w.user_id }, 'Progress chart ›')),
      w.prompt ? h('details', { class: 'card', style: { marginTop: '16px' } }, h('summary', {}, 'The task'), h('div', { class: 'wr-task', style: { marginTop: '10px' } }, w.prompt.split('\n').map(l => l.trim() ? h('p', {}, l) : null))) : null,
      body, bar].filter(Boolean));
    drawEdit();
  }

  /* ---------------------------------------------------------------- teacher: give a task */
  const TYPES_OF = { cae: { 1: ['essay'], 2: ['email', 'letter', 'proposal', 'report', 'review'] }, cpe: { 1: ['essay'], 2: ['article', 'letter', 'report', 'review', 'essay'] } };
  views.assign = from => {
    const src = byId(from);
    const c = src ? { exam: src.exam, part: src.part, type: src.type, title: src.title, prompt: src.prompt } : { exam: 'cpe', part: 1, type: 'essay', title: '', prompt: '' };
    const chosen = new Set();
    let students = null, due = '';
    const host = h('div');
    CLOUD.rpc('my_students').then(r => { students = (r || []).filter(s => s.email); draw(); }).catch(e => { students = []; toast(e.message); draw(); });
    const draw = () => {
      if (!TYPES_OF[c.exam][c.part].includes(c.type)) c.type = TYPES_OF[c.exam][c.part][0];
      const seg = (items, val, on) => h('div', { class: 'seg' }, items.map(([v, label]) => h('button', { class: v === val ? 'on' : '', onclick: () => { on(v); draw(); } }, label)));
      const lib = h('select', { class: 'input' }, h('option', { value: '' }, 'My own task (paste it below)'), T.filter(t => t.exam === c.exam).map(t => h('option', { value: t.id, selected: src && src.id === t.id }, `Part ${t.part} · ${t.title}`)));
      lib.onchange = () => { const t = byId(lib.value); if (t) Object.assign(c, { exam: t.exam, part: t.part, type: t.type, title: t.title, prompt: t.prompt }); else Object.assign(c, { title: '', prompt: '' }); draw(); };
      const title = h('input', { class: 'input', placeholder: 'Title the student sees, e.g. “Essay: tourism”', value: c.title, maxlength: 150 }); title.oninput = () => { c.title = title.value; };
      const prompt = h('textarea', { class: 'wr-prompt', rows: 9, placeholder: 'The task exactly as the student should see it: instructions, texts or notes, word count.' }); prompt.value = c.prompt; prompt.oninput = () => { c.prompt = prompt.value; };
      const date = h('input', { type: 'date', value: due }); date.oninput = () => { due = date.value; };
      const list = students === null ? h('p', { class: 'muted' }, 'Loading your students…') : !students.length ? h('p', { class: 'muted' }, 'You have no students yet. Add them on the Students page.') :
        h('div', { class: 'wr-studs' }, h('label', { class: 'wr-stud all' }, h('input', { type: 'checkbox', checked: chosen.size === students.length, onchange: ev => { students.forEach(s => ev.target.checked ? chosen.add(s.email) : chosen.delete(s.email)); draw(); } }), h('b', {}, 'All students')),
          students.map(s => h('label', { class: 'wr-stud' }, h('input', { type: 'checkbox', checked: chosen.has(s.email), onchange: ev => { ev.target.checked ? chosen.add(s.email) : chosen.delete(s.email); } }), h('span', {}, s.name || s.email, s.name ? h('span', { class: 'muted small' }, ' ' + s.email) : null))));
      const btn = h('button', { class: 'btn lg' }, 'Give the task');
      btn.onclick = async () => {
        if (!chosen.size) { toast('Choose at least one student.'); return; }
        if (c.prompt.trim().length < 20) { toast('Write or paste the task first.'); return; }
        btn.disabled = true;
        try {
          await CLOUD.rpc('wa_create', { p_exam: c.exam, p_part: c.part, p_type: c.type, p_title: c.title.trim() || (src ? src.title : 'Writing task'), p_prompt: c.prompt, p_students: [...chosen], p_due: due ? new Date(due + 'T23:59:00+03:00').toISOString() : null });
          toast(`Sent to ${chosen.size} student${chosen.size === 1 ? '' : 's'}. They also got a message with the link.`); go('#/writing/review/tasks');
        } catch (e) { toast(e.message); btn.disabled = false; }
      };
      clear(host).append(
        h('a', { href: '#/writing/review', class: 'small' }, '← Review'),
        h('h1', { class: 'h2', style: { margin: '14px 0 6px' } }, 'Give a writing task.'),
        h('p', { class: 'muted', style: { marginTop: 0 } }, 'Students write it on Brightword. The AI examiner prepares a draft report for you; you check and edit it, then approve — only then does the student see the marks.'),
        h('div', { class: 'card wr-form' },
          h('div', { class: 'rl-row' }, h('div', { class: 'rl-lab' }, 'Exam'), seg([['cpe', 'C2 Proficiency'], ['cae', 'C1 Advanced']], c.exam, v => { c.exam = v; })),
          h('div', { class: 'rl-row' }, h('div', { class: 'rl-lab' }, 'From the bank'), lib),
          h('div', { class: 'rl-row' }, h('div', { class: 'rl-lab' }, 'Part'), seg([[1, 'Part 1 · Essay'], [2, 'Part 2']], c.part, v => { c.part = v; })),
          c.part === 2 ? h('div', { class: 'rl-row' }, h('div', { class: 'rl-lab' }, 'Task type'), h('div', { class: 'chips' }, TYPES_OF[c.exam][2].map(t => h('button', { class: 'chip' + (t === c.type ? ' on' : ''), onclick: () => { c.type = t; draw(); } }, t[0].toUpperCase() + t.slice(1))))) : null,
          h('div', { class: 'rl-row' }, h('div', { class: 'rl-lab' }, 'Title'), title),
          h('div', { class: 'rl-row' }, h('div', { class: 'rl-lab' }, 'Due (optional)'), date)),
        h('h2', { class: 'h3', style: { marginTop: '26px' } }, 'The task'), prompt,
        h('h2', { class: 'h3', style: { marginTop: '26px' } }, 'Students'), list,
        h('div', { class: 'row', style: { marginTop: '20px' } }, btn));
    };
    draw();
    return shell('#/writing/review', h('section', { class: 'section', style: { paddingTop: '36px' } }, h('div', { class: 'narrow' }, host)));
  };

  /* ---------------------------------------------------------------- teacher: the review queue and the tasks given */
  views.review = tab => {
    tab = tab === 'done' || tab === 'tasks' ? tab : 'todo';
    const host = h('div', {}, h('p', { class: 'muted' }, 'Loading…'));
    Promise.all([CLOUD.rpc('wa_queue'), CLOUD.rpc('wa_teacher')]).then(([q, tasks]) => {
      q = q || []; tasks = tasks || [];
      const todo = q.filter(x => x.status === 'pending'), done = q.filter(x => x.status === 'approved');
      const row = x => h('a', { class: 'wr-row', href: '#/wr/' + x.id },
        h('b', { class: 'wr-score' }, x.status === 'approved' ? `${x.score}/20` : x.noai ? '—' : `AI ${x.ai}`),
        h('span', { class: 'grow' }, h('b', {}, x.name || x.email), h('span', {}, ' · ' + x.title), h('div', { class: 'muted small' }, `${EXAM[x.exam]} Part ${x.part} · ${x.words} words${x.noai ? ' · no AI draft yet' : ''}${x.draft && x.status !== 'approved' ? ' · your draft saved' : ''}`)),
        h('span', { class: 'muted small' }, x.status === 'approved' ? 'checked ' + fmtDate(x.reviewed_at) : fmtDate(x.at)));
      const stLabel = s => !s.attempt ? h('span', { class: 'wr-st0' }, 'not handed in') : s.status === 'approved' ? h('a', { class: 'wr-st2', href: '#/wr/' + s.attempt }, `checked · ${s.score}/20`) : h('a', { class: 'wr-st1', href: '#/wr/' + s.attempt }, 'to check');
      const taskCard = t => h('div', { class: 'card', style: { marginTop: '14px', opacity: t.archived ? 0.6 : 1 } },
        h('div', { class: 'row', style: { gap: '10px', flexWrap: 'wrap' } }, h('div', { class: 'grow' }, h('h3', { class: 'h3', style: { margin: 0 } }, t.title),
          h('div', { class: 'muted small' }, `${EXAM[t.exam]} Part ${t.part} · ${t.type} · given ${fmtDate(t.created_at)}${t.due_at ? ' · due ' + fmtDate(t.due_at) : ''}${t.archived ? ' · closed' : ''}`)),
          h('button', { class: 'btn sm plain', onclick: async () => { try { await CLOUD.rpc('wa_archive', { p_id: t.id, p_archived: !t.archived }); go('#/writing/review/tasks'); } catch (e) { toast(e.message); } } }, t.archived ? 'Open again' : 'Close')),
        h('div', { class: 'wr-studlist' }, t.students.map(s => h('div', { class: 'row', style: { gap: '10px' } }, h('span', { class: 'grow' }, s.name || s.email), stLabel(s)))),
        h('details', {}, h('summary', { class: 'small' }, 'The task'), h('div', { class: 'wr-task small' }, t.prompt.split('\n').map(l => l.trim() ? h('p', {}, l) : null))));
      const tabs = h('div', { class: 'seg', style: { margin: '6px 0 18px' } }, [['todo', `To check · ${todo.length}`], ['done', `Checked · ${done.length}`], ['tasks', `Tasks given · ${tasks.length}`]].map(([k, l]) => h('button', { class: k === tab ? 'on' : '', onclick: () => go('#/writing/review' + (k === 'todo' ? '' : '/' + k)) }, l)));
      const empty = m => h('div', { class: 'card' }, h('p', { class: 'muted', style: { margin: 0 } }, m));
      clear(host).append(tabs,
        tab === 'todo' ? (todo.length ? h('div', { class: 'card' }, todo.map(row)) : empty(tasks.length ? 'Nothing to check right now. New texts appear here as soon as students hand them in.' : 'Give your students a writing task: when they hand it in, the AI prepares a draft report and it appears here for you to check.')) :
        tab === 'done' ? (done.length ? h('div', { class: 'card' }, done.map(row)) : empty('Nothing approved yet.')) :
        (tasks.length ? h('div', {}, tasks.map(taskCard)) : empty('No tasks given yet.')));
    }).catch(e => clear(host).append(h('p', { class: 'err' }, e.message)));
    return shell('#/writing/review',
      h('section', { class: 'hero compact-hero' }, heroTitle('Writing review'), h('p', { class: 'hero-sub' }, 'The AI examiner drafts the report. You check it, change what you disagree with, and approve.'),
        h('div', { class: 'row', style: { justifyContent: 'center', gap: '10px', marginTop: '18px', flexWrap: 'wrap' } }, h('a', { class: 'btn', href: '#/writing/assign' }, 'Give a writing task'), h('a', { class: 'btn plain', href: '#/writing' }, 'Task bank'))),
      h('section', { class: 'section gray' }, h('div', { class: 'narrow' }, host)));
  };

  /* ---------------------------------------------------------------- student: write a task from the teacher */
  views.assignment = id => {
    const host = h('div', {}, h('p', { class: 'muted' }, 'Loading…'));
    CLOUD.rpc('wa_get', { p_id: id }).then(a => {
      if (!a) throw new Error('This task was not found, or it was not given to you.');
      if (a.attempt) { go('#/wr/' + a.attempt); return; }
      if (a.archived) throw new Error('Your teacher has closed this task.');
      const [lo, hi] = LIMIT[a.exam][a.part];
      const key = 'a-' + a.id;
      const ta = h('textarea', { class: 'wr-text', rows: 18, spellcheck: 'false', placeholder: 'Write your answer here. Leave an empty line between paragraphs.', 'aria-label': 'Your answer' });
      ta.value = loadDraft(key);
      const count = h('span', { class: 'wr-count' });
      const upd = () => { const n = wordCount(ta.value); count.textContent = `${n} words · aim for ${lo}–${hi}`; count.className = 'wr-count ' + (n < lo * 0.9 ? 'low' : n > hi * 1.1 ? 'high' : 'ok'); saveDraft(key, ta.value); };
      ta.addEventListener('input', upd); upd();
      const btn = h('button', { class: 'btn lg' }, 'Hand it in');
      const status = h('div', { class: 'wr-wait hidden' });
      btn.onclick = async () => {
        const n = wordCount(ta.value);
        if (n < 80) { toast('Write at least 80 words first.'); return; }
        if (!confirm('Hand it in? You can do it only once: after that your teacher checks it.')) return;
        btn.disabled = true; status.classList.remove('hidden');
        const t0 = Date.now();
        const tick = setInterval(() => { if (!document.body.contains(status)) return clearInterval(tick); const s = Math.round((Date.now() - t0) / 1000); clear(status).append(h('span', { class: 'spin' }), h('span', {}, s < 4 ? 'Saving your text…' : 'Preparing it for your teacher…'), h('span', { class: 'muted small' }, ` ${s} s · about a minute`)); }, 500);
        try {
          const r = await CLOUD.fn('lexicon-ai', { task: 'essay', assignment: a.id, text: ta.value });
          clearInterval(tick);
          if (r.error) throw new Error(r.error);
          saveDraft(key, ''); toast('Handed in. Your teacher will check it.');
          go('#/wr/' + r.submitted.id);
        } catch (e) { clearInterval(tick); status.classList.add('hidden'); toast(e.message); btn.disabled = false; }
      };
      clear(host).append(
        h('a', { href: '#/writing?exam=' + a.exam, class: 'small' }, '← Writing'),
        h('div', { class: 'muted', style: { margin: '14px 0 4px', fontWeight: 600 } }, `From ${a.teacher || 'your teacher'} · ${EXAM[a.exam]} · Writing Part ${a.part} · ${a.type}${a.due_at ? ' · due ' + fmtDate(a.due_at) : ''}`),
        h('h1', { class: 'h2', style: { marginBottom: '18px' } }, a.title),
        h('div', { class: 'card wr-task' }, a.prompt.split('\n').map(l => l.trim() ? h('p', {}, l) : null)),
        h('div', { class: 'row', style: { margin: '18px 0 8px' } }, count), ta,
        h('div', { class: 'row', style: { marginTop: '14px', gap: '12px', flexWrap: 'wrap', alignItems: 'center' } }, btn, status),
        h('p', { class: 'muted small', style: { marginTop: '10px' } }, 'Saved in this browser as you type. Spellcheck is off, as in the exam. This task does not use your daily AI checks.'));
    }).catch(e => clear(host).append(h('a', { href: '#/writing', class: 'small' }, '← Writing'), h('p', { class: 'err' }, e.message)));
    return shell('#/exams', h('section', { class: 'section', style: { paddingTop: '36px' } }, h('div', { class: 'narrow' }, host)));
  };

  /* ---------------------------------------------------------------- history: marks over time, criterion by criterion */
  // small multiples on one 0–5 scale (four lines on one chart would sit on top of each other: bands are whole numbers)
  function lineChart({ pts, max, height, label, tip, width }) {
    const W = width || 640, H = height, L = 30, R = 14, Tp = 14, B = 26;
    const n = pts.length, x = i => n === 1 ? (L + W - R) / 2 : L + i * (W - L - R) / (n - 1), y = v => Tp + (H - Tp - B) * (1 - v / max);
    const NS = 'http://www.w3.org/2000/svg', el = (t, a, ...k) => { const e = document.createElementNS(NS, t); for (const [q, v] of Object.entries(a)) e.setAttribute(q, v); k.forEach(c => c != null && e.append(c)); return e; };
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'wr-chart', role: 'img', 'aria-label': label });
    const step = max > 5 ? 5 : 1;
    for (let v = 0; v <= max; v += step) svg.append(el('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), class: 'g' }), el('text', { x: L - 8, y: y(v) + 4, class: 'ax', 'text-anchor': 'end' }, String(v)));
    const every = Math.max(1, Math.ceil(n / (W < 400 ? 4 : 8)));
    pts.forEach((p, i) => { if (i % every === 0 || i === n - 1) svg.append(el('text', { x: x(i), y: H - 6, class: 'ax', 'text-anchor': 'middle' }, p.label)); });
    const ok = pts.map((p, i) => [p, i]).filter(([p]) => p.v != null);
    if (ok.length > 1) svg.append(el('polyline', { points: ok.map(([p, i]) => `${x(i)},${y(p.v)}`).join(' '), class: 'ln' }));
    ok.forEach(([p, i]) => svg.append(el('circle', { cx: x(i), cy: y(p.v), r: 5, class: 'pt' + (p.teacher ? ' t' : '') })));
    const cross = el('line', { y1: Tp, y2: H - B, class: 'cross', style: 'display:none' });
    svg.append(cross);
    const box = h('div', { class: 'wr-chartbox' }, svg);
    const tipEl = h('div', { class: 'wr-tip hidden' });
    box.append(tipEl);
    pts.forEach((p, i) => {
      const hw = n === 1 ? W : (W - L - R) / (n - 1);
      const hit = el('rect', { x: x(i) - hw / 2, y: 0, width: hw, height: H, class: 'hit' });
      const show = () => { cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.style.display = ''; clear(tipEl).append(...tip(p)); tipEl.classList.remove('hidden'); const r = box.getBoundingClientRect(), px = x(i) / W * r.width; tipEl.style.left = Math.min(Math.max(px - 90, 0), r.width - 180) + 'px'; };
      hit.addEventListener('mouseenter', show); hit.addEventListener('click', show);
      hit.addEventListener('mouseleave', () => { cross.style.display = 'none'; tipEl.classList.add('hidden'); });
      svg.append(hit);
    });
    return box;
  }
  views.history = uid => {
    const host = h('div', {}, h('p', { class: 'muted' }, 'Loading…'));
    let exam = null;
    CLOUD.rpc('writing_history', uid ? { p_user: uid } : {}).then(rows => {
      rows = rows || [];
      const exams = [...new Set(rows.map(r => r.exam))];
      const draw = () => {
        exam = exam && exams.includes(exam) ? exam : exams.includes('cpe') && rows.filter(r => r.exam === 'cpe').length >= rows.filter(r => r.exam === 'cae').length ? 'cpe' : exams[0];
        const rs = rows.filter(r => r.exam === exam);
        if (!rs.length) { clear(host).append(h('div', { class: 'card' }, h('p', { class: 'muted', style: { margin: 0 } }, 'No marked writing yet. Check a text or hand in a task from your teacher, and your progress will appear here.'))); return; }
        const pts = rs.map(r => ({ r, label: new Date(r.at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }), teacher: r.teacher }));
        const tip = p => [h('b', {}, p.r.title || 'Writing'), h('div', { class: 'muted small' }, `${fmtDate(p.r.at)} · ${p.r.teacher ? 'teacher’s mark' : 'AI mark'}`),
          h('div', { class: 'small' }, SUB.map(([k, name]) => h('div', { class: 'row' }, h('span', { class: 'grow' }, name), h('b', {}, p.r.scores[k] == null ? '—' : p.r.scores[k])))), h('div', { class: 'row' }, h('span', { class: 'grow' }, 'Total'), h('b', {}, `${p.r.total}/20`))];
        const k3 = (k, a) => { const v = a.map(r => k === 'total' ? r.total : r.scores[k]).filter(x => x != null); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
        const m = Math.min(3, Math.floor(rs.length / 2)), first = rs.slice(0, m), last = rs.slice(-m);
        const delta = k => m ? k3(k, last) - k3(k, first) : null;
        const dl = d => d == null ? '' : d > 0.05 ? `▲ +${d.toFixed(1)}` : d < -0.05 ? `▼ ${d.toFixed(1)}` : '= 0';
        const tiles = h('div', { class: 'wr-tiles' },
          h('div', { class: 'wr-tile' }, h('div', { class: 'muted small' }, 'Latest'), h('b', {}, `${rs[rs.length - 1].total}`, h('span', { class: 'muted' }, '/20')), h('div', { class: 'small' }, `about ${levelOf(exam, rs[rs.length - 1].total)}`)),
          h('div', { class: 'wr-tile' }, h('div', { class: 'muted small' }, 'Average'), h('b', {}, k3('total', rs).toFixed(1), h('span', { class: 'muted' }, '/20')), h('div', { class: 'small' }, `${rs.length} marked text${rs.length === 1 ? '' : 's'}`)),
          m ? h('div', { class: 'wr-tile' }, h('div', { class: 'muted small' }, `Change (last ${m} vs first ${m})`), h('b', { class: delta('total') >= 0 ? 'up' : 'down' }, dl(delta('total'))), h('div', { class: 'small' }, 'out of 20')) : null);
        clear(host).append(...[
          exams.length > 1 ? h('div', { class: 'seg', style: { marginBottom: '16px' } }, exams.map(x => h('button', { class: x === exam ? 'on' : '', onclick: () => { exam = x; draw(); } }, EXAM[x]))) : null,
          tiles,
          h('div', { class: 'card', style: { marginTop: '16px' } }, h('h3', { class: 'h3', style: { marginBottom: '4px' } }, 'Total mark'), h('p', { class: 'muted small', style: { marginTop: 0 } }, `Out of 20 · ${EXAM[exam]} · ● teacher’s mark  ○ AI mark`),
            lineChart({ pts: pts.map(p => Object.assign({}, p, { v: p.r.total })), max: 20, height: 220, label: 'Total mark over time', tip })),
          h('div', { class: 'wr-multi' }, SUB.map(([k, name]) => h('div', { class: 'card' },
            h('div', { class: 'row' }, h('h4', { class: 'grow', style: { margin: 0 } }, name), m ? h('span', { class: 'small ' + (delta(k) >= 0 ? 'up' : 'down') }, dl(delta(k))) : null),
            lineChart({ pts: pts.map(p => Object.assign({}, p, { v: p.r.scores[k] })), max: 5, height: 160, width: 320, label: name + ' band over time', tip })))),
          h('div', { class: 'card', style: { marginTop: '16px', overflowX: 'auto' } }, h('h3', { class: 'h3' }, 'Every marked text'),
            h('table', { class: 'wr-table wr-hist' }, h('thead', {}, h('tr', {}, h('th', {}, 'Date'), h('th', {}, 'Text'), ...SUB.map(([, n]) => h('th', { title: n }, n.split(' ').map(w => w[0].toUpperCase()).join(''))), h('th', {}, 'Total'))),
              h('tbody', {}, rs.slice().reverse().map(r => h('tr', {}, h('td', { class: 'muted small' }, fmtDate(r.at)), h('td', {}, h('a', { href: '#/wr/' + r.id }, r.title || 'Writing'), r.teacher ? h('span', { class: 'pill ok', style: { marginLeft: '6px' } }, 'teacher') : null),
                ...SUB.map(([k]) => h('td', { class: 'num' }, r.scores[k] == null ? '—' : r.scores[k])), h('td', { class: 'num' }, h('b', {}, r.total)))))))].filter(Boolean));
      };
      if (!rows.length) { clear(host).append(h('div', { class: 'card' }, h('p', { class: 'muted', style: { margin: 0 } }, 'No marked writing yet. Check a text or hand in a task from your teacher, and your progress will appear here.'))); return; }
      draw();
    }).catch(e => clear(host).append(h('p', { class: 'err' }, e.message)));
    return shell(uid ? '#/students' : '#/exams',
      h('section', { class: 'section', style: { paddingTop: '36px' } }, h('div', { class: 'narrow' },
        h('a', { href: uid ? '#/student/' + uid : '#/writing', class: 'small' }, uid ? '← Student' : '← Writing'),
        h('h1', { class: 'h2', style: { margin: '14px 0 6px' } }, 'Writing progress.'),
        h('p', { class: 'muted', style: { marginTop: 0 } }, 'Your marks on the four Cambridge criteria, text by text. Where your teacher checked a text, their mark is used instead of the AI’s.'),
        host)));
  };

  /* teacher's page of one student: their writing */
  function studentBlock(uid) {
    const box = h('div');
    CLOUD.rpc('writing_list', { p_user: uid }).then(rows => {
      if (!rows || !rows.length) return;
      box.append(h('div', { class: 'section-head row', style: { marginTop: '40px', alignItems: 'baseline', gap: '14px' } }, h('h2', { class: 'h2 grow' }, 'Writing.'), h('a', { href: '#/writing/history/' + uid }, 'Progress chart ›')),
        h('div', { class: 'card' }, rows.map(r => h('a', { class: 'wr-row', href: '#/wr/' + r.id }, h('b', { class: 'wr-score' }, r.status === 'pending' ? (r.score == null ? 'to check' : `AI ${r.score}`) : r.score == null ? '—' : `${r.score}/20`),
          h('span', { class: 'grow' }, r.title || r.task_id, h('span', { class: 'muted small' }, ` · ${EXAM[r.exam]} Part ${r.part} · ${r.words} words`)), h('span', { class: 'muted small' }, fmtDate(r.created_at))))));
    }).catch(() => {});
    return box;
  }

  return { views, studentBlock, TASKS: T };
};
