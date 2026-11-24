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
    const mine = h('div');
    CLOUD.rpc('ai_left', { p_kind: 'writing', p_limit: PER_DAY[role()] || 3 }).then(n => { left.textContent = `AI checks left today: ${n} of ${PER_DAY[role()] || 3}`; }).catch(() => {});
    CLOUD.rpc('writing_list', {}).then(rows => {
      if (!rows || !rows.length) return;
      mine.append(h('div', { class: 'section-head', style: { marginTop: '46px' } }, h('h2', { class: 'h2' }, 'Your writing.')),
        h('div', { class: 'card' }, rows.map(r => h('a', { class: 'wr-row', href: '#/wr/' + r.id },
          h('b', { class: 'wr-score' }, r.score == null ? '—' : `${r.score}/20`),
          h('span', { class: 'grow' }, h('span', {}, r.title || r.task_id), h('span', { class: 'muted small' }, ` · ${EXAM[r.exam]} Part ${r.part} · ${r.words} words`)),
          h('span', { class: 'muted small' }, fmtDate(r.created_at))))));
    }).catch(() => {});
    const card = t => {
      const d = loadDraft(t.id);
      return h('div', { class: 'card lib-card' },
        h('div', { class: 'grow' }, h('h3', { class: 'h3', style: { fontSize: '20px', marginBottom: '4px' } }, t.title),
          h('div', { class: 'muted small' }, `Part ${t.part} · ${t.type} · ${LIMIT[t.exam][t.part].join('–')} words${d ? ` · draft: ${wordCount(d)} words` : ''}`)),
        h('div', { class: 'row lib-actions' }, h('button', { class: 'btn', onclick: () => go('#/writing/' + t.id) }, d ? 'Continue' : 'Write')));
    };
    const part = p => T.filter(t => t.exam === exam && t.part === p);
    return shell('#/exams',
      h('section', { class: 'hero' }, examTabs('writing'), heroTitle('Writing.'),
        h('p', { class: 'hero-sub' }, 'Write on a real exam-style task. The AI marks it like a Cambridge examiner: four subscales from 0 to 5, then corrections and a model paragraph.'),
        h('div', { class: 'seg', style: { marginTop: '18px' } }, ['cpe', 'cae'].map(x => h('button', { class: x === exam ? 'on' : '', onclick: () => go('#/writing?exam=' + x) }, EXAM[x])))),
      h('section', { class: 'section gray' }, h('div', { class: 'narrow' },
        h('div', { class: 'row set-row', style: { marginBottom: '14px' } }, h('span', { class: 'grow muted small' }, exam === 'cpe' ? 'The real paper: 90 minutes, Part 1 essay + one Part 2 task.' : 'The real paper: 90 minutes, Part 1 essay + one Part 2 task.'), left),
        h('a', { class: 'card wr-own', href: '#/writing/check' }, h('div', { class: 'grow' }, h('h3', { class: 'h3', style: { margin: '0 0 4px' } }, 'Check your own writing'), h('div', { class: 'muted small' }, 'Any essay, article, letter, report, review or proposal: a strict examiner’s report with every error explained and links to the Cambridge Dictionary.')), h('span', { class: 'btn' }, 'Check')),
        h('h2', { class: 'h3' }, 'Part 1 · Essay (compulsory)'), part(1).map(card),
        h('h2', { class: 'h3', style: { marginTop: '34px' } }, 'Part 2 · Choose one task type'), part(2).map(card),
        mine,
        h('p', { class: 'muted small', style: { marginTop: '40px' } }, 'The marks are an AI estimate on the official Cambridge writing scales and can differ from a real examiner’s. Use them to see your weak points; show important pieces to your teacher. All tasks are original practice material written for Brightword; C1 Advanced and C2 Proficiency are exams of Cambridge University Press & Assessment, which is not connected with Lexicon.'))));
  };

  /* ---------------------------------------------------------------- writing a task */
  views.task = id => {
    if (id === 'check') return views.check();
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
  function fullView(w, host) {
    const R = w.result || w, text = w.text || '';
    const issues = R.issues || [], ups = R.upgrades || [];
    const card = (title, ...kids) => h('div', { class: 'card', style: { marginTop: '16px' } }, h('h3', { class: 'h3' }, title), ...kids);
    const counts = {}; issues.forEach(i => { counts[i.type] = (counts[i.type] || 0) + 1; });
    const list = h('div', { class: 'wr-issues' });
    let filter = 'all';
    const drawList = () => clear(list).append(...issues.map((it, i) => (filter === 'all' || filter === it.type || filter === it.severity) ? h('div', { class: 'wr-issue ' + it.severity, id: 'wr-i' + (i + 1) },
      h('div', { class: 'row wr-ihead' }, h('b', { class: 'wr-num' }, i + 1), h('span', { class: 'wr-badge' }, it.type), h('span', { class: 'wr-badge sev ' + it.severity }, SEV[it.severity])),
      h('div', { class: 'wr-change' }, h('s', {}, it.quote), h('span', { class: 'wr-arrow' }, '→'), h('b', {}, it.fix)),
      it.why ? h('p', { class: 'wr-why' }, it.why) : null, dictChips(it.dict)) : null).filter(Boolean));
    const filters = h('div', { class: 'chips', style: { margin: '6px 0 14px' } });
    const drawFilters = () => clear(filters).append(
      ...[['all', `All ${issues.length}`], ['error', `Errors ${issues.filter(i => i.severity === 'error').length}`], ['better', `Could be better ${issues.filter(i => i.severity === 'better').length}`]].concat(Object.entries(counts).map(([k, n]) => [k, `${k} ${n}`]))
        .map(([k, label]) => h('button', { class: 'chip' + (filter === k ? ' on' : ''), onclick: () => { filter = k; drawFilters(); drawList(); } }, label)));
    drawFilters(); drawList();
    const improved = h('div', { class: 'hidden' }, h('div', { class: 'wr-model', style: { whiteSpace: 'pre-wrap' } }, R.improved || ''),
      (R.improvedNotes || []).length ? h('ul', { class: 'small', style: { marginTop: '14px' } }, R.improvedNotes.map(x => h('li', {}, x))) : null,
      h('button', { class: 'btn sm plain', style: { marginTop: '10px' }, onclick: () => { navigator.clipboard && navigator.clipboard.writeText(R.improved || '').then(() => toast('Copied')); } }, 'Copy'));
    clear(host).append(...[
      h('a', { href: '#/writing?exam=' + (w.exam || 'cpe'), class: 'small' }, '← Writing'),
      h('div', { class: 'muted', style: { margin: '14px 0 4px', fontWeight: 600 } }, `${EXAM[w.exam || R.exam] || ''} · Writing Part ${w.part || R.part} · ${R.type || ''} · ${R.words} words (${(R.range || []).join('–')})${w.created_at ? ' · ' + fmtDate(w.created_at) : ''}`),
      h('h1', { class: 'h2', style: { marginBottom: '20px' } }, w.title || 'My writing'),
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
        s.why ? h('p', {}, s.adjusted ? h('span', { class: 'muted' }, `The examiner’s first reading gave band ${s.aiBand}: `) : null, s.why) : null,
        (s.evidence || []).length ? h('div', { class: 'muted small' }, 'From your text: ', s.evidence.map((q, i) => h('span', {}, i ? ' · ' : '', h('i', {}, '“' + q + '”')))) : null,
        s.adjusted ? h('p', { class: 'wr-adj small' }, s.adjusted) : null,
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
      h('div', { class: 'row', style: { marginTop: '20px', gap: '10px' } }, h('a', { class: 'btn', href: '#/writing/check' }, 'Check another text'), h('a', { class: 'btn plain', href: '#/writing?exam=' + (w.exam || 'cpe') }, 'Writing tasks')),
      h('p', { class: 'muted small', style: { marginTop: '24px' } }, `An AI estimate on the official Cambridge subscales${R.model ? ' (model: ' + R.model.split('/').pop() + ')' : ''}, deliberately strict. A real examiner may mark differently, and the AI can be wrong about a single comment: if one looks doubtful, check it in the dictionary or ask your teacher.`)].filter(x => x != null));
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
    if ((w.result || w).v === 2) return fullView(w, host);
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

  /* teacher's page of one student: their writing */
  function studentBlock(uid) {
    const box = h('div');
    CLOUD.rpc('writing_list', { p_user: uid }).then(rows => {
      if (!rows || !rows.length) return;
      box.append(h('div', { class: 'section-head', style: { marginTop: '40px' } }, h('h2', { class: 'h2' }, 'Writing.')),
        h('div', { class: 'card' }, rows.map(r => h('a', { class: 'wr-row', href: '#/wr/' + r.id }, h('b', { class: 'wr-score' }, r.score == null ? '—' : `${r.score}/20`),
          h('span', { class: 'grow' }, r.title || r.task_id, h('span', { class: 'muted small' }, ` · ${EXAM[r.exam]} Part ${r.part} · ${r.words} words`)), h('span', { class: 'muted small' }, fmtDate(r.created_at))))));
    }).catch(() => {});
    return box;
  }

  return { views, studentBlock, TASKS: T };
};
