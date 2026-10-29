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
        h('h2', { class: 'h3' }, 'Part 1 · Essay (compulsory)'), part(1).map(card),
        h('h2', { class: 'h3', style: { marginTop: '34px' } }, 'Part 2 · Choose one task type'), part(2).map(card),
        mine,
        h('p', { class: 'muted small', style: { marginTop: '40px' } }, 'The marks are an AI estimate on the official Cambridge writing scales and can differ from a real examiner’s. Use them to see your weak points; show important pieces to your teacher. All tasks are original practice material written for Brightword; C1 Advanced and C2 Proficiency are exams of Cambridge University Press & Assessment, which is not connected with Lexicon.'))));
  };

  /* ---------------------------------------------------------------- writing a task */
  views.task = id => {
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

  /* ---------------------------------------------------------------- result */
  const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function highlighted(text, errors) {
    const qs = errors.map(e => e.quote).filter(Boolean).sort((a, b) => b.length - a.length);
    if (!qs.length) return [text];
    const re = new RegExp('(' + qs.map(escapeRe).join('|') + ')', 'gi');
    return text.split(re).map(part => { const e = errors.find(x => x.quote.toLowerCase() === part.toLowerCase()); return e ? h('mark', { class: 'wr-err', title: `→ ${e.fix}${e.why ? ' · ' + e.why : ''}` }, part) : part; });
  }
  function resultView(w, host) {
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
