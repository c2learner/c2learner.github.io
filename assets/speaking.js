/* Lexicon · Speaking paper practice (C2 Proficiency and C1 Advanced).
   A solo mock test in the real format and timing: the screen plays the examiner, the browser records each part.
   After each part: listen back, get AI feedback (Whisper transcript → examiner-style marks for grammar,
   vocabulary and discourse), and at the end send the recordings to the teacher in Telegram.
   All tasks are original; photos come from Wikimedia Commons (free licences, credited under each photo). */
window.LexiconSpeaking = function (X) {
  'use strict';
  const { h, clear, shell, go, toast, heroTitle, CLOUD, St, save, examTabs, teacherTg } = X;
  const EXAM = { cpe: 'C2 Proficiency', cae: 'C1 Advanced' };
  const PER_DAY = { student: 3, teacher: 10, admin: 30 };
  const role = () => (St().account && St().account.role) || 'student';

  /* ---------------------------------------------------------------- tests
     section = one continuous recording; step = what the "examiner" shows, with its time in seconds */
  const pic = (q, cap) => ({ q, cap });
  const interview = qs => ({ name: 'Part 1 · Interview', note: 'The examiner asks you questions about yourself and your opinions. Answer each one naturally: two or three sentences, with a reason or an example.', steps: qs.map(t => ({ text: t, secs: 30 })) });
  const caeTest = (id, title, p1, p2, p3, p4) => ({ id, exam: 'cae', title, sections: [
    interview(p1),
    { name: 'Part 2 · Long turn', note: 'Here are three pictures. Talk about TWO of them for one minute, comparing them and answering both questions above the pictures. Then answer a short follow-up question.', steps: [
      { text: p2.q, pics: p2.pics, secs: 60, label: 'Compare two of the pictures' },
      { text: p2.follow, pics: p2.pics, secs: 30, label: 'Follow-up question' }] },
    { name: 'Part 3 · Collaborative task', note: 'In the exam you discuss this with a partner. Practising alone, talk through the ideas as if you were discussing them: give opinions, compare the ideas, invite a view (“What do you think about…?”). Then make a decision.', steps: [
      { text: p3.q, prompts: p3.prompts, secs: 120, label: 'Discuss the ideas' },
      { text: p3.decide, prompts: p3.prompts, secs: 60, label: 'Decide' }] },
    { name: 'Part 4 · Discussion', note: 'The examiner asks wider questions on the topic of Part 3. Develop your answers: give reasons, examples and, where useful, the other side of the argument.', steps: p4.map(t => ({ text: t, secs: 60 })) },
  ] });
  const cpeTest = (id, title, p1, p2, p3) => ({ id, exam: 'cpe', title, sections: [
    interview(p1),
    { name: 'Part 2 · Collaborative task', note: 'In the exam you talk with a partner about pictures. Practising alone, discuss the pictures as if with a partner: react to them, speculate, compare, and reach a decision.', steps: [
      { text: p2.first, pics: p2.pics.slice(0, 2), secs: 60, label: 'Pictures A and B · 1 minute' },
      { text: p2.second, pics: p2.pics, secs: 150, label: 'All the pictures · discuss and decide' }] },
    { name: 'Part 3 · Long turn', note: 'Read the question on the card. Speak on your own for about two minutes. You may use the ideas on the card or your own. Then answer the follow-up question.', steps: [
      { text: p3.card, ideas: p3.ideas, secs: 120, label: 'Your long turn · about 2 minutes', card: true },
      { text: p3.follow, secs: 45, label: 'Follow-up question' }] },
    { name: 'Part 3 · Discussion', note: 'The examiner leads a discussion on the topic of the card. Give developed, well-argued answers.', steps: p3.discuss.map(t => ({ text: t, secs: 60 })) },
  ] });
  const TESTS = [
    caeTest('cae-s1', 'Work and success',
      ['Where are you from, and what do you like most about living there?', 'What do you enjoy doing when you have some free time?', 'How important is it for you to keep learning new skills? Why?', 'If you could live in another country for a year, where would you choose? Why?'],
      { q: 'Why might these people have decided to learn these skills? How difficult might it be for them?', follow: 'Which of these skills do you think would be the most useful in everyday life? Why?',
        pics: [pic('violin lesson teacher student', 'A violin lesson'), pic('cooking class adults kitchen', 'An adult cooking class'), pic('driving lesson learner car instructor', 'A driving lesson')] },
      { q: 'Here are some things that can help people to be successful at work. How might these things help people to be successful?', decide: 'Which of these do you think matters most for long-term success? Why?', prompts: ['having good qualifications', 'being well organised', 'getting on well with colleagues', 'having a mentor', 'being willing to take risks'] },
      ['Some people say success at work is mostly a matter of luck. What do you think?', 'Should schools teach students how to find and keep a job? Why or why not?', 'Is it better to stay in one job for a long time or to change jobs often?', 'How might the world of work change in the next twenty years?']),
    caeTest('cae-s2', 'Cities and the environment',
      ['How do you usually travel around your town or city?', 'What kind of music do you listen to, and when?', 'Do you prefer spending time indoors or outdoors? Why?', 'What is one thing you would like to change about your daily routine?'],
      { q: 'Why might these people have chosen to spend time in these places? How might they be feeling?', follow: 'Which of these places would you find the most relaxing? Why?',
        pics: [pic('people relaxing city park grass', 'A city park'), pic('hikers mountain trail', 'Hikers on a mountain trail'), pic('shopping mall interior people', 'A shopping centre')] },
      { q: 'Here are some ways cities could reduce pollution. How effective might these measures be?', decide: 'Which measure would people in your city be most likely to accept? Why?', prompts: ['banning cars from the city centre', 'planting more trees', 'making public transport free', 'encouraging people to work from home', 'taxing companies that pollute'] },
      ['Do you think individuals can really make a difference to the environment?', 'Who should pay for protecting the environment: governments, companies or individuals?', 'Are people today more aware of environmental problems than in the past?', 'Would you be willing to pay more for products that are better for the environment? Why?']),
    caeTest('cae-s3', 'Technology and communication',
      ['What do you use your phone for most?', 'How do you usually keep in touch with your friends?', 'Do you enjoy reading? What kind of things do you read?', 'What is the best piece of advice anyone has ever given you?'],
      { q: 'What might be the advantages of communicating in these ways? What problems might there be?', follow: 'Which way of communicating do you prefer? Why?',
        pics: [pic('video conference laptop meeting', 'A video call'), pic('handwritten letter envelope', 'A handwritten letter'), pic('friends talking cafe table', 'Friends talking in a café')] },
      { q: 'Here are some areas of life that technology has changed. How has technology changed these areas of our lives?', decide: 'In which area has the change been the most positive? Why?', prompts: ['shopping', 'education', 'friendships', 'health', 'entertainment'] },
      ['Do you think people spend too much time online?', 'Should there be an age limit for using social media? Why or why not?', 'Has technology made people’s lives more stressful?', 'What new technology would you most like to see in the future?']),
    caeTest('cae-s4', 'Free time and helping others',
      ['What did you enjoy most about your last holiday?', 'Do you prefer to spend your free time alone or with other people?', 'Is there a sport or activity you would like to try? Why?', 'How has your town changed in recent years?'],
      { q: 'What might people enjoy about volunteering in these ways? How might their work benefit others?', follow: 'Which kind of volunteering would you choose? Why?',
        pics: [pic('volunteers planting trees', 'Volunteers planting trees'), pic('volunteers serving food bank', 'Volunteers at a food bank'), pic('volunteer reading children library', 'A volunteer reading with children')] },
      { q: 'Here are some reasons why people take up hobbies. Why might people take up hobbies for these reasons?', decide: 'Which reason do you think is the most common among young people? Why?', prompts: ['to relax', 'to meet new people', 'to learn something new', 'to keep fit', 'to be creative'] },
      ['Do people have less free time now than in the past?', 'Should employers encourage their staff to have hobbies? Why?', 'Is it important for children to have organised activities after school?', 'Why do some people find it hard to relax?']),
    cpeTest('cpe-s1', 'Progress and tradition',
      ['Where are you from?', 'What do you most appreciate about the place where you live?', 'How do you think you will use English in the future?', 'If you could master any skill overnight, what would it be, and why?'],
      { first: 'Look at pictures A and B. Talk about how the people in these pictures might be feeling.', second: 'Now look at all the pictures. A museum is planning an exhibition called “Progress”, and these pictures show aspects it might include. Talk about the aspects of progress the pictures show. Then decide which picture best represents progress today.',
        pics: [pic('scientist working laboratory', 'A scientist in a laboratory'), pic('skyscraper under construction cranes', 'A skyscraper being built'), pic('farmer driving tractor field', 'A farmer with a tractor'), pic('solar panel farm field', 'A solar farm')] },
      { card: 'How important is it to preserve traditions in a rapidly changing world?', ideas: ['identity', 'economic development', 'younger generations'], follow: 'Do you think some traditions should be allowed to disappear? Why?',
        discuss: ['To what extent does globalisation threaten local cultures?', 'Is progress always a good thing?', 'Why do people so often feel nostalgic about the past?', 'Who should decide which traditions are worth preserving?'] }),
    cpeTest('cpe-s2', 'Work and fulfilment',
      ['Where are you from?', 'What is the most valuable thing you have learnt outside a classroom?', 'How do you tend to make important decisions?', 'What kind of work would you find most fulfilling?'],
      { first: 'Look at pictures A and B. Talk about what the people in these pictures might find challenging about their work.', second: 'Now look at all the pictures. A careers magazine is publishing an article called “Choosing a career”, and these pictures will illustrate it. Talk about the aspects of working life each picture shows. Then decide which picture would make the best cover.',
        pics: [pic('surgeons operating theatre', 'Surgeons in an operating theatre'), pic('chef cooking restaurant kitchen', 'A chef in a restaurant kitchen'), pic('open plan office workers computers', 'An open-plan office'), pic('firefighters at work fire', 'Firefighters at work')] },
      { card: 'What makes a job worth doing?', ideas: ['financial reward', 'personal satisfaction', 'contribution to society'], follow: 'Is it possible to be happy in a job you don’t enjoy?',
        discuss: ['Should people be paid according to how useful their work is to society?', 'How will automation change the kinds of jobs people do?', 'Is it realistic to expect to love your job?', 'What responsibilities do employers have towards their staff?'] }),
    cpeTest('cpe-s3', 'Media and information',
      ['Where are you from?', 'How do you usually find out what is happening in the world?', 'Is there a book or film that changed the way you think?', 'How much do you trust what you read online?'],
      { first: 'Look at pictures A and B. Talk about the role the media might be playing in these situations.', second: 'Now look at all the pictures. A university is producing a leaflet about its media studies course, and these pictures may be included. Talk about the influence of the media that each picture suggests. Then decide which picture should go on the front of the leaflet.',
        pics: [pic('press conference journalists cameras', 'A press conference'), pic('man reading newspaper', 'Reading a newspaper'), pic('teenager using smartphone', 'Using a smartphone'), pic('television news studio', 'A television news studio')] },
      { card: 'To what extent should the media be free from regulation?', ideas: ['freedom of speech', 'protecting the public', 'false information'], follow: 'Should social media companies be responsible for what their users post?',
        discuss: ['Has the internet made people better informed, or simply more opinionated?', 'Should famous people have a right to privacy?', 'Why do false stories spread so quickly?', 'Will printed newspapers survive?'] }),
    cpeTest('cpe-s4', 'Lifestyle and the planet',
      ['Where are you from?', 'What do you do to switch off after a busy day?', 'How environmentally conscious would you say you are?', 'Where would you most like to be living in ten years’ time?'],
      { first: 'Look at pictures A and B. Talk about how the people in these pictures might be affecting the environment.', second: 'Now look at all the pictures. An environmental charity is running a campaign called “Small changes, big difference”, and these pictures are being considered for its posters. Talk about the message each picture might give. Then decide which would be the most effective.',
        pics: [pic('commuters cycling bike lane city', 'Cycling to work'), pic('recycling bins street', 'Recycling bins'), pic('traffic jam motorway', 'A traffic jam'), pic('farmers market vegetables stall', 'A farmers’ market')] },
      { card: 'Is economic growth compatible with protecting the environment?', ideas: ['jobs', 'new technologies', 'consumer habits'], follow: 'Should poorer countries have to follow the same environmental rules as richer ones?',
        discuss: ['Are individuals or governments more responsible for tackling climate change?', 'Would you accept a lower standard of living to protect the planet?', 'Can tourism ever be good for fragile environments?', 'How optimistic are you about the future of the planet?'] }),
  ];
  const byId = id => TESTS.find(t => t.id === id);
  const fmt = s => `${Math.floor(s / 60)}:${String(Math.max(0, Math.floor(s % 60))).padStart(2, '0')}`;
  const sectionSecs = s => s.steps.reduce((a, b) => a + b.secs, 0);

  /* ---------------------------------------------------------------- photos from Wikimedia Commons (cached per search) */
  const PIC_CACHE = 'lexicon.pics.v1';
  let picCache = {}; try { picCache = JSON.parse(localStorage.getItem(PIC_CACHE) || '{}'); } catch (e) { picCache = {}; }
  const BAD = /logo|map|diagram|chart|flag|coat of arms|drawing|painting|poster|illustration|svg|sign|screenshot|nude|naked/i;
  async function findPhoto(q) {
    if (picCache[q]) return picCache[q];
    const u = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=6&gsrlimit=12'
      + '&gsrsearch=' + encodeURIComponent(q + ' filetype:bitmap') + '&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=800';
    const j = await fetch(u).then(r => r.json());
    const pages = Object.values((j.query && j.query.pages) || {}).sort((a, b) => a.index - b.index);
    for (const p of pages) {
      const ii = p.imageinfo && p.imageinfo[0]; if (!ii || BAD.test(p.title)) continue;
      if (ii.width < 700 || ii.width < ii.height) continue;               // landscape photos only, like the exam
      const m = ii.extmetadata || {};
      const strip = v => String((v && v.value) || '').replace(/<[^>]+>/g, '').trim();
      const r = { src: ii.thumburl || ii.url, page: ii.descriptionurl, author: strip(m.Artist).slice(0, 60), licence: strip(m.LicenseShortName) };
      picCache[q] = r; try { localStorage.setItem(PIC_CACHE, JSON.stringify(picCache)); } catch (e) { /* */ }
      return r;
    }
    return null;
  }
  function picture(p, letter) {
    const box = h('figure', { class: 'sp-pic' }, h('div', { class: 'sp-ph' }, h('span', {}, p.cap)), letter ? h('b', { class: 'sp-letter' }, letter) : null);
    findPhoto(p.q).then(r => {
      if (!r) return;
      const img = h('img', { src: r.src, alt: p.cap, loading: 'lazy', referrerpolicy: 'no-referrer' });
      img.onload = () => { const ph = box.querySelector('.sp-ph'); if (ph) ph.replaceWith(img); };
      box.append(h('figcaption', {}, h('a', { href: r.page, target: '_blank', rel: 'noopener' }, 'Photo'), r.author ? ` · ${r.author}` : '', r.licence ? ` · ${r.licence}` : ''));
    }).catch(() => {});
    return box;
  }

  /* ---------------------------------------------------------------- list */
  const views = {};
  views.list = examArg => {
    const exam = examArg === 'cae' ? 'cae' : 'cpe';
    const left = h('span', { class: 'muted small' });
    CLOUD.rpc('ai_left', { p_kind: 'speaking', p_limit: PER_DAY[role()] || 3 }).then(n => { left.textContent = `AI speaking checks left today: ${n} of ${PER_DAY[role()] || 3}`; }).catch(() => {});
    const rec = (St().sp || {});
    const tests = TESTS.filter(t => t.exam === exam);
    return shell('#/exams',
      h('section', { class: 'hero' }, examTabs('speaking'), heroTitle('Speaking.'),
        h('p', { class: 'hero-sub' }, 'A mock speaking test in the real format and timing. The screen plays the examiner, you answer out loud, and every part is recorded. Then listen back, get AI feedback and send the recordings to your teacher.'),
        h('div', { class: 'seg', style: { marginTop: '18px' } }, ['cpe', 'cae'].map(x => h('button', { class: x === exam ? 'on' : '', onclick: () => go('#/speaking?exam=' + x) }, EXAM[x])))),
      h('section', { class: 'section gray' }, h('div', { class: 'narrow' },
        h('div', { class: 'row', style: { marginBottom: '14px', flexWrap: 'wrap', gap: '10px' } }, h('span', { class: 'grow muted small' }, exam === 'cpe' ? 'The real test: about 16 minutes, 3 parts, with a partner and two examiners.' : 'The real test: about 15 minutes, 4 parts, with a partner and two examiners.'), left),
        tests.map(t => h('div', { class: 'card lib-card' },
          h('div', { class: 'grow' }, h('h3', { class: 'h3', style: { fontSize: '20px', marginBottom: '4px' } }, t.title),
            h('div', { class: 'muted small' }, `${t.sections.map(s => s.name.split(' · ')[0]).filter((x, i, a) => a.indexOf(x) === i).length} parts · about ${Math.round(t.sections.reduce((a, s) => a + sectionSecs(s), 0) / 60)} minutes of speaking${rec[t.id] ? ' · done ' + new Date(rec[t.id]).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}`)),
          h('div', { class: 'row lib-actions' }, h('button', { class: 'btn', onclick: () => go('#/speaking/' + t.id) }, rec[t.id] ? 'Again' : 'Start')))),
        h('div', { class: 'card', style: { marginTop: '22px' } }, h('h3', { class: 'h3' }, 'How it works'),
          h('ol', {}, h('li', {}, 'Use headphones or a quiet room, and allow the microphone when the browser asks.'),
            h('li', {}, 'Each part starts when you press Start. The timer moves on to the next question by itself, as in the exam; press Next if you finish early.'),
            h('li', {}, 'After each part: listen to yourself, and ask the AI for feedback on grammar, vocabulary and how you organise your ideas. Pronunciation and interaction are for your teacher to judge.'),
            h('li', {}, 'At the end, send the recordings to your teacher in Telegram.'))),
        h('p', { class: 'muted small', style: { marginTop: '30px' } }, 'All tasks are original practice material written for Lexicon; photos are from Wikimedia Commons under free licences. C1 Advanced and C2 Proficiency are exams of Cambridge University Press & Assessment, which is not connected with Lexicon.'))));
  };

  /* ---------------------------------------------------------------- the mock test */
  const pickMime = () => ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find(m => window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) || '';
  const extOf = mime => /mp4/.test(mime) ? 'm4a' : /ogg/.test(mime) ? 'ogg' : 'webm';
  const blobToB64 = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = rej; r.readAsDataURL(b); });

  views.run = id => {
    const t = byId(id);
    if (!t) { go('#/speaking'); return h('div'); }
    const page = h('div', { class: 'narrow sp-page' });
    const put = (...xs) => clear(page).append(...xs.flat().filter(x => x != null && x !== false));   // native append would print arrays and nulls as text
    const results = [];                                 // { section, blob, url, secs, ai }
    let stream = null, rec = null, timer = null, stopped = false;
    const stopAll = () => { stopped = true; clearInterval(timer); try { if (rec && rec.state !== 'inactive') rec.stop(); } catch (e) { /* */ } if (stream) stream.getTracks().forEach(x => x.stop()); stream = null; };
    window.addEventListener('hashchange', stopAll, { once: true });

    const stepView = (sec, st, i) => {
      const letters = 'ABCD';
      return h('div', { class: 'sp-step' },
        st.label ? h('div', { class: 'muted small', style: { fontWeight: 600, marginBottom: '6px' } }, st.label) : null,
        st.card ? h('div', { class: 'sp-card' }, h('div', { class: 'sp-card-q' }, st.text), h('ul', {}, st.ideas.map(x => h('li', {}, x)))) : h('div', { class: 'prompt sp-q' }, st.text),
        st.pics ? h('div', { class: 'sp-pics n' + st.pics.length }, st.pics.map((p, k) => picture(p, st.pics.length > 3 || /^Look at pictures/.test(st.text) || sec.name.startsWith('Part 2 · Coll') ? letters[k] : null))) : null,
        st.prompts ? h('div', { class: 'sp-mind' }, h('div', { class: 'sp-mind-c' }, ((st.text.match(/[^.?!]*\?\s*$/) || [st.text])[0]).trim()), st.prompts.map(x => h('div', { class: 'sp-mind-p' }, x))) : null);
    };

    const intro = k => {
      const sec = t.sections[k];
      put(
        h('a', { href: '#/speaking?exam=' + t.exam, class: 'small' }, '← All speaking tests'),
        h('div', { class: 'muted', style: { margin: '14px 0 4px', fontWeight: 600 } }, `${EXAM[t.exam]} · Speaking · ${t.title}`),
        h('h1', { class: 'h2', style: { marginBottom: '16px' } }, sec.name),
        h('div', { class: 'card' }, h('p', { style: { marginTop: 0 } }, sec.note), h('p', { class: 'muted small', style: { marginBottom: 0 } }, `About ${fmt(sectionSecs(sec))} of speaking · ${sec.steps.length} ${sec.steps.length === 1 ? 'task' : 'questions / tasks'} · recorded`)),
        h('div', { class: 'row', style: { marginTop: '18px', gap: '10px' } }, h('button', { class: 'btn lg', onclick: () => start(k) }, '🎙 Start'),
          k > 0 || results.length ? h('button', { class: 'btn plain', onclick: () => finish() }, 'Finish the test here') : null),
        h('div', { class: 'sp-progress' }, t.sections.map((s, j) => h('span', { class: j < k ? 'done' : j === k ? 'on' : '' }, s.name.split(' · ')[0] + (t.sections.filter(x => x.name.split(' · ')[0] === s.name.split(' · ')[0]).length > 1 ? ' ' + s.name.split(' · ')[1].split(' ')[0] : '')))));
    };

    const start = async k => {
      const sec = t.sections[k];
      if (!window.MediaRecorder || !navigator.mediaDevices) { toast('This browser can’t record audio. Try Chrome or Safari.'); return; }
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
      catch (e) { toast('No access to the microphone. Allow it in the browser’s address bar and try again.'); return; }
      stopped = false;
      const mime = pickMime(), chunks = [];
      rec = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : undefined);
      rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
      const t0 = Date.now();
      rec.onstop = () => {
        if (stream) stream.getTracks().forEach(x => x.stop()); stream = null; clearInterval(timer);
        if (!chunks.length) return;
        const blob = new Blob(chunks, { type: rec.mimeType || mime || 'audio/webm' });
        const r = { k, section: sec.name, blob, url: URL.createObjectURL(blob), secs: Math.round((Date.now() - t0) / 1000), ai: null };
        const old = results.findIndex(x => x.k === k); if (old >= 0) results.splice(old, 1, r); else results.push(r);
        if (!stopped) after(k);
      };
      rec.start(1000);
      let i = 0, left = sec.steps[0].secs;
      const clock = h('b', { class: 'sp-clock' }), bar = h('i'), body = h('div');
      const nextBtn = h('button', { class: 'btn plain' }, 'Next →');
      const showStep = () => { clear(body).append(stepView(sec, sec.steps[i], i)); left = sec.steps[i].secs; nextBtn.textContent = i === sec.steps.length - 1 ? 'Finish this part' : 'Next →'; };
      const advance = () => { if (i < sec.steps.length - 1) { i++; showStep(); } else { clearInterval(timer); rec.stop(); } };
      nextBtn.onclick = advance;
      put(
        h('div', { class: 'row sp-top' }, h('span', { class: 'sp-rec' }, '● REC'), h('b', { class: 'grow' }, sec.name), clock),
        h('div', { class: 'bar sp-bar' }, bar),
        body,
        h('div', { class: 'row', style: { marginTop: '20px', gap: '10px' } }, nextBtn));
      showStep();
      const tick = () => {
        left -= 1; const st = sec.steps[i];
        clock.textContent = fmt(Math.max(0, left)); clock.classList.toggle('over', left <= 5);
        bar.style.width = (100 - Math.max(0, left) / st.secs * 100) + '%';
        if (left <= 0) advance();
      };
      clock.textContent = fmt(left); timer = setInterval(tick, 1000);
    };

    const aiBox = r => {
      const box = h('div', { class: 'sp-ai' });
      const sec = t.sections[r.k];
      const draw = () => {
        clear(box);
        if (r.ai) { box.append(aiResult(r.ai)); return; }
        const btn = h('button', { class: 'btn' }, '✨ AI feedback on this part');
        const st = h('span', { class: 'muted small' });
        btn.onclick = async () => {
          if (r.secs < 15) { toast('This recording is too short for feedback.'); return; }
          if (r.secs > 250) { toast('AI feedback works for up to about 4 minutes of speech.'); return; }
          btn.disabled = true; st.textContent = 'Listening and marking… (up to a minute)';
          try {
            const audio = await blobToB64(r.blob);
            const prompt = sec.steps.map(x => (x.label ? x.label + ': ' : '') + x.text + (x.ideas ? ' (ideas: ' + x.ideas.join(', ') + ')' : '') + (x.prompts ? ' (prompts: ' + x.prompts.join('; ') + ')' : '') + (x.pics ? ' [pictures: ' + x.pics.map(p => p.cap).join('; ') + ']' : '') + ` [${x.secs} s]`).join('\n');
            const res = await CLOUD.fn('lexicon-ai', { task: 'speaking', exam: t.exam, part: sec.name, prompt, seconds: r.secs, mime: r.blob.type, audio });
            r.ai = res.speaking; draw();
          } catch (e) { st.textContent = ''; btn.disabled = false; toast(e.status === 404 ? 'AI isn’t set up yet.' : e.message); }
        };
        box.append(h('div', { class: 'row', style: { gap: '10px', flexWrap: 'wrap' } }, btn, st));
      };
      draw();
      return box;
    };
    const aiResult = a => h('div', { class: 'sp-ai-res' },
      h('div', { class: 'sp-scores' }, [['grammar', 'Grammatical resource'], ['vocabulary', 'Lexical resource'], ['discourse', 'Discourse management']].map(([k, n]) =>
        h('div', { class: 'wr-bar' }, h('div', { class: 'row' }, h('b', { class: 'grow' }, n), h('b', {}, `${a.scores[k].band}/5`)), h('div', { class: 'bar' }, h('i', { style: { width: (a.scores[k].band / 5 * 100) + '%' } })), a.scores[k].why ? h('div', { class: 'muted small' }, a.scores[k].why) : null))),
      h('p', { class: 'muted small' }, `${a.words} words in ${fmt(a.seconds)} · ${a.wpm} words per minute · filler words: ${a.fillers}. Pronunciation and interaction: ask your teacher.`),
      a.task ? h('p', {}, h('b', {}, 'Task: '), a.task) : null,
      a.summary ? h('p', {}, a.summary) : null,
      a.priorities.length ? h('div', {}, h('b', {}, 'Next time'), h('ol', {}, a.priorities.map(x => h('li', {}, x)))) : null,
      a.errors.length ? h('div', {}, h('b', {}, 'Corrections'), h('table', { class: 'wr-table' }, h('tbody', {}, a.errors.map(e => h('tr', {}, h('td', {}, h('s', {}, e.quote)), h('td', {}, h('b', {}, e.fix)), h('td', { class: 'muted small' }, e.why)))))) : null,
      a.phrases.length ? h('div', { style: { marginTop: '12px' } }, h('b', {}, 'Say it better'), h('table', { class: 'wr-table' }, h('tbody', {}, a.phrases.map(v => h('tr', {}, h('td', {}, v.instead), h('td', {}, h('b', {}, v.try))))))) : null,
      a.example ? h('details', { style: { marginTop: '12px' } }, h('summary', {}, 'A model answer at the top band'), h('p', { class: 'wr-model' }, a.example)) : null,
      h('details', { style: { marginTop: '8px' } }, h('summary', {}, 'What the AI heard (transcript)'), h('p', { class: 'muted' }, a.transcript)));

    const after = k => {
      const r = results.find(x => x.k === k), sec = t.sections[k], last = k === t.sections.length - 1;
      put(
        h('div', { class: 'muted', style: { margin: '6px 0 4px', fontWeight: 600 } }, `${EXAM[t.exam]} · Speaking · ${t.title}`),
        h('h1', { class: 'h2', style: { marginBottom: '16px' } }, sec.name + ' · done'),
        h('div', { class: 'card' }, h('audio', { controls: true, src: r.url, style: { width: '100%' } }), h('div', { class: 'muted small', style: { marginTop: '6px' } }, `${fmt(r.secs)} recorded`), aiBox(r)),
        h('div', { class: 'row', style: { marginTop: '18px', gap: '10px', flexWrap: 'wrap' } },
          h('button', { class: 'btn lg', onclick: () => (last ? finish() : intro(k + 1)) }, last ? 'Finish the test' : `Next: ${t.sections[k + 1].name} →`),
          h('button', { class: 'btn plain', onclick: () => intro(k) }, 'Redo this part')));
    };

    const finish = () => {
      stopAll();
      const S = St(); S.sp = S.sp || {}; S.sp[t.id] = Date.now(); save();
      const tg = h('input', { type: 'text', placeholder: '@teacher_username', style: { flex: '1', minWidth: '180px' }, 'aria-label': 'Teacher’s Telegram' });
      tg.value = (St().settings && St().settings.teacherTg) || '';
      if (!tg.value && teacherTg) teacherTg().then(v => { if (v && !tg.value) tg.value = v; }).catch(() => {});
      const tgUrl = () => { const v = tg.value.trim(); if (!v) return ''; if (/^https?:\/\//i.test(v)) return v; return 'https://t.me/' + v.replace(/^@/, '').replace(/^t\.me\//, ''); };
      const files = () => results.map(r => new File([r.blob], `${t.id}-${r.section.replace(/[^A-Za-z0-9]+/g, '-').toLowerCase()}.${extOf(r.blob.type)}`, { type: r.blob.type }));
      const canShare = () => { try { return navigator.canShare && results.length && navigator.canShare({ files: files() }); } catch (e) { return false; } };
      const remember = () => { const S2 = St(); S2.settings.teacherTg = tg.value.trim(); save(); };
      const shareBtn = h('button', { class: 'btn lg', onclick: async () => {
        remember();
        if (canShare()) { try { await navigator.share({ files: files(), title: `Speaking · ${t.title}`, text: `${EXAM[t.exam]} speaking practice: ${t.title}` }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
        files().forEach((f, i) => setTimeout(() => { const a = h('a', { href: URL.createObjectURL(f), download: f.name }); document.body.append(a); a.click(); a.remove(); }, i * 400));
        const u = tgUrl(); if (u) setTimeout(() => window.open(u, '_blank', 'noopener'), results.length * 400 + 300);
        toast(u ? 'Files downloaded: attach them in the Telegram chat that opens.' : 'Files downloaded. Send them to your teacher.');
      } }, canShare() ? '📤 Send to my teacher (Telegram)' : '⬇ Download recordings + open Telegram');
      put(
        h('div', { class: 'muted', style: { margin: '6px 0 4px', fontWeight: 600 } }, `${EXAM[t.exam]} · Speaking · ${t.title}`),
        h('h1', { class: 'h2', style: { marginBottom: '16px' } }, 'Test finished'),
        ...(results.length ? results.sort((a, b) => a.k - b.k) : []).map(r => h('div', { class: 'card', style: { marginBottom: '14px' } }, h('b', {}, r.section), h('audio', { controls: true, src: r.url, style: { width: '100%', marginTop: '8px' } }), aiBox(r))),
        results.length ? null : h('p', { class: 'muted' }, 'Nothing was recorded.'),
        results.length ? h('div', { class: 'card' }, h('h3', { class: 'h3' }, 'Send it to your teacher'),
          h('p', { class: 'muted small' }, canShare() ? 'Choose Telegram in the menu that opens, then your teacher’s chat.' : 'The recordings are saved to your Downloads, then your teacher’s Telegram chat opens: drag the files into it.'),
          h('div', { class: 'row', style: { gap: '10px', flexWrap: 'wrap', marginBottom: '12px' } }, tg),
          shareBtn,
          h('p', { class: 'muted small', style: { marginBottom: 0 } }, 'The recordings stay only on this device until you send them: leaving this page deletes them.')) : null,
        h('div', { class: 'row', style: { marginTop: '18px', gap: '10px' } }, h('a', { class: 'btn plain', href: '#/speaking?exam=' + t.exam }, 'All speaking tests')));
    };

    intro(0);
    return shell('#/exams', h('section', { class: 'section', style: { paddingTop: '36px' } }, page));
  };

  return { views, TESTS };
};
