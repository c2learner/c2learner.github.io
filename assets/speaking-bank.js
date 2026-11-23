/* Brightword · Speaking roulette — the topic bank.
   All motions, questions and tasks are original, written for Brightword in the format of the Cambridge exams
   (C1 Advanced: 4 speaking parts; C2 Proficiency: 3 speaking parts). Level 1 = easy, 2 = medium, 3 = hard
   (relative to the exam). Hard debates are "devil's advocate" motions: the speaker must defend them even when
   they believe the opposite. Photos for the picture tasks are pinned from Wikimedia Commons (free licences). */
window.LexiconSpeakingBank = (function () {
  'use strict';
  const THEMES = {
    tech: 'Technology', edu: 'Education', work: 'Work & careers', society: 'Society', env: 'Environment',
    health: 'Health & sport', culture: 'Culture & arts', media: 'Media', travel: 'Travel', science: 'Science',
    ethics: 'Ethics', money: 'Money', life: 'Lifestyle', fun: 'Just for fun',
  };

  /* ================================================================ debates: [theme, motion] by level */
  const DEBATES = {
    cae: {
      1: [
        ['edu', 'This house would ban homework for students under 16.'],
        ['tech', 'This house believes that smartphones should be banned in schools.'],
        ['life', 'This house believes that city life is better than country life.'],
        ['travel', 'This house would rather travel alone than with friends.'],
        ['work', 'This house believes that a four-day working week should be the norm.'],
        ['health', 'This house would ban junk food advertising aimed at children.'],
        ['media', 'This house believes that reality TV does more harm than good.'],
        ['env', 'This house would ban single-use plastic completely.'],
        ['edu', 'This house believes that school uniforms should be compulsory.'],
        ['money', 'This house believes that children should be paid for doing household chores.'],
        ['culture', 'This house believes that books are always better than their film adaptations.'],
        ['fun', 'This house believes that summer is better than winter.'],
        ['tech', 'This house believes that video games are good for young people.'],
        ['society', 'This house would lower the voting age to 16.'],
        ['life', 'This house believes that it is better to rent a home than to buy one.'],
        ['health', 'This house believes that professional athletes are paid too much.'],
        ['fun', 'This house believes that breakfast is the most important meal of the day.'],
      ],
      2: [
        ['edu', 'This house believes that university education should be free for everyone.'],
        ['tech', 'This house believes that social media has made us lonelier.'],
        ['work', 'This house believes that working from home is better than working in an office.'],
        ['env', 'This house would make public transport free in all major cities.'],
        ['health', 'This house would tax sugary drinks heavily.'],
        ['media', 'This house believes that celebrities have a duty to be role models.'],
        ['society', 'This house believes that zoos should be closed.'],
        ['culture', 'This house believes that museums should return objects taken from other countries.'],
        ['science', 'This house believes that space exploration is a waste of money.'],
        ['money', 'This house would replace cash entirely with digital payments.'],
        ['travel', 'This house believes that mass tourism does more harm than good to popular destinations.'],
        ['edu', 'This house believes that exams are not a fair way to measure ability.'],
        ['work', 'This house believes that money is the best motivator at work.'],
        ['tech', 'This house believes that children under 13 should not own a smartphone.'],
        ['ethics', 'This house believes that it is sometimes right to break the law.'],
        ['life', 'This house believes that people should retire at 50 if they can afford to.'],
        ['media', 'This house believes that streaming services have killed the cinema.'],
      ],
      3: [
        ['edu', 'This house would abolish all grades and marks in schools.'],
        ['tech', 'This house believes that the internet has made people less intelligent.'],
        ['life', 'This house believes that ambition is overrated.'],
        ['fun', 'This house believes that being bored is good for you.'],
        ['society', 'This house believes that honesty is not always the best policy.'],
        ['work', 'This house would ban all overtime work by law.'],
        ['env', 'This house would give every citizen a strict yearly limit on flights.'],
        ['health', 'This house believes that sport should not be compulsory at school.'],
        ['media', 'This house believes that people should stop following the news.'],
        ['money', 'This house would ban tipping in restaurants.'],
        ['culture', 'This house believes that graffiti is as valuable as gallery art.'],
        ['science', 'This house believes that animals should have the same rights as humans.'],
        ['travel', 'This house believes that holidays abroad are a waste of time and money.'],
        ['fun', 'This house believes that cats make better pets than dogs.'],
        ['ethics', 'This house believes that white lies make the world a better place.'],
        ['edu', 'This house believes that teenagers should be allowed to choose all of their school subjects.'],
      ],
    },
    cpe: {
      1: [
        ['tech', 'This house believes that artificial intelligence will create more jobs than it destroys.'],
        ['edu', 'This house would abolish private schools.'],
        ['work', 'This house believes that a university degree is no longer worth the cost.'],
        ['env', 'This house believes that individual action cannot solve climate change.'],
        ['society', 'This house would introduce a universal basic income.'],
        ['health', 'This house would make organ donation opt-out by default.'],
        ['media', 'This house believes that influencers should be regulated like advertisers.'],
        ['culture', 'This house believes that public money should not fund the arts.'],
        ['travel', 'This house would charge tourists a fee to enter historic city centres.'],
        ['money', 'This house believes that billionaires should not exist.'],
        ['science', 'This house believes that nuclear power is the answer to the energy crisis.'],
        ['life', 'This house believes that the pursuit of happiness makes people unhappy.'],
        ['edu', 'This house believes that learning foreign languages will soon be pointless.'],
        ['tech', 'This house would ban facial recognition in public spaces.'],
        ['work', 'This house believes that remote work is killing company culture.'],
        ['ethics', 'This house believes that eating meat will one day be seen as immoral.'],
        ['society', 'This house would make voting compulsory.'],
        ['media', 'This house believes that online anonymity does more harm than good.'],
        ['health', 'This house believes that mental health days should be a legal right for every employee.'],
        ['culture', 'This house believes that the dominance of English threatens the world’s languages.'],
      ],
      2: [
        ['ethics', 'This house believes that having fewer children is the most responsible choice a person can make for the planet.'],
        ['tech', 'This house would grant legal rights to sufficiently advanced AI systems.'],
        ['society', 'This house believes that meritocracy is a myth.'],
        ['edu', 'This house would make philosophy a compulsory school subject from the age of seven.'],
        ['science', 'This house would allow genetic editing of human embryos to prevent disease.'],
        ['media', 'This house believes that the decline of local newspapers is a threat to democracy.'],
        ['money', 'This house would tax all inheritance at 100%.'],
        ['work', 'This house believes that the gig economy exploits workers more than it empowers them.'],
        ['culture', 'This house believes that art created by AI is real art.'],
        ['env', 'This house would give rivers and forests legal rights, so that they can be defended in court.'],
        ['health', 'This house believes that the state has no business telling people what to eat.'],
        ['travel', 'This house believes that cheap flights are a luxury the planet cannot afford.'],
        ['life', 'This house regrets the rise of dating apps.'],
        ['culture', 'This house would remove statues of controversial historical figures from public squares.'],
        ['tech', 'This house believes that privacy is dead and we should stop pretending otherwise.'],
        ['society', 'This house would ban private cars from city centres.'],
        ['edu', 'This house would choose university students by lottery from all qualified applicants.'],
        ['ethics', 'This house would allow people to be paid for donating a kidney.'],
        ['media', 'This house believes that public shaming on social media has gone too far.'],
        ['science', 'This house believes that humanity should make settling on Mars a priority.'],
      ],
      3: [
        ['life', 'This house believes that ignorance is bliss.'],
        ['society', 'This house believes that progress is an illusion.'],
        ['society', 'This house believes that most decisions should be left to experts rather than voters.'],
        ['ethics', 'This house would abolish all prisons.'],
        ['work', 'This house believes that procrastination is a virtue.'],
        ['env', 'This house believes that the Earth would be better off without humans.'],
        ['society', 'This house believes that children should be raised by the community rather than by their parents.'],
        ['edu', 'This house would stop teaching history in schools.'],
        ['tech', 'This house would replace all judges with algorithms.'],
        ['work', 'This house believes that work should be abolished entirely.'],
        ['culture', 'This house believes that literature has nothing left to teach us.'],
        ['ethics', 'This house believes that politeness is a form of dishonesty.'],
        ['life', 'This house believes that the past was better than the present.'],
        ['society', 'This house would allow people to sell their votes.'],
        ['science', 'This house believes that free will is an illusion, so nobody deserves blame or praise.'],
        ['money', 'This house believes that money can buy happiness.'],
        ['media', 'This house would ban all advertising.'],
        ['ethics', 'This house believes that it is better to be feared than loved.'],
        ['science', 'This house would erase painful memories if the technology existed.'],
        ['fun', 'This house believes that winning is everything.'],
        ['culture', 'This house believes that classical music is a dead art form.'],
      ],
    },
  };

  /* ================================================================ free discussion: [theme, question, follow-ups...] */
  const DISCUSS = {
    cae: {
      1: [
        ['life', 'What makes a place feel like home?', 'Is it the people or the place itself?', 'Could you feel at home in another country?', 'What would you miss most if you moved?'],
        ['fun', 'If you could master any skill overnight, what would it be?', 'Why that skill rather than another?', 'Would it still feel rewarding if it cost you no effort?'],
        ['travel', 'What is the best trip you have ever taken, and what made it special?', 'Do you prefer planned trips or spontaneous ones?', 'Where would you never go on holiday, and why?'],
        ['tech', 'Could you live without your phone for a week?', 'What would be the hardest part?', 'What might you gain from it?'],
        ['work', 'What does your dream job look like?', 'Would you take it if it paid half your current salary?', 'How important is it to love what you do?'],
        ['health', 'What do you do to switch off after a stressful day?', 'Has this changed over the years?', 'Is it harder to relax today than it was for your parents?'],
        ['culture', 'Which film or series would you recommend to everyone?', 'What makes a story stay with you?', 'Do you ever watch things again?'],
        ['edu', 'Which teacher has influenced you most, and how?', 'What makes a teacher unforgettable?', 'Can you learn as well from an app as from a person?'],
        ['fun', 'Which invention would you uninvent if you could?', 'What would daily life look like without it?', 'Who would be happiest about the change?'],
        ['money', 'What is the best thing you have ever spent money on?', 'And the worst?', 'Are experiences better value than things?'],
      ],
      2: [
        ['society', 'Are people today more or less polite than in the past?', 'Where do you notice it most?', 'Does technology play a role?', 'Does politeness matter in the first place?'],
        ['tech', 'Should we trust AI to make decisions about our health?', 'What decisions would you never hand over to a machine?', 'Who should be responsible when AI makes a mistake?'],
        ['env', 'What would make people in your city change their habits to protect the environment?', 'Do fines or rewards work better?', 'Whose responsibility is it most: governments, companies or individuals?'],
        ['work', 'Is it a good idea to stay in one company for your whole career?', 'What are the risks of changing jobs too often?', 'How has the idea of a career changed in the last 30 years?'],
        ['media', 'How do you decide whether a news story is true?', 'Have you ever been fooled by fake news?', 'Should social networks remove false information?'],
        ['edu', 'Should schools teach practical life skills such as cooking and managing money?', 'What would you drop from the timetable to make room?', 'Who should teach these skills: schools or parents?'],
        ['life', 'Is it better to have a few close friends or a large circle of acquaintances?', 'How do friendships change as we get older?', 'Can you be real friends with someone you have only met online?'],
        ['health', 'Why do so many people find it hard to stick to healthy habits?', 'What actually works?', 'Should employers encourage staff to be healthier?'],
        ['culture', 'Do traditional festivals still matter in the modern world?', 'Which tradition would you keep forever?', 'Is it a problem when traditions become commercial?'],
        ['travel', 'Does travelling really broaden the mind?', 'Can you learn about a culture in a two-week holiday?', 'Is armchair travel through films and books just as valuable?'],
      ],
      3: [
        ['ethics', 'Is it ever acceptable to read someone else’s private messages?', 'Does it make a difference if they are your child?', 'Where is the line between care and control?'],
        ['society', 'Is it fair that some jobs that society depends on are so badly paid?', 'Which jobs deserve better pay?', 'Who should decide how much a job is worth?'],
        ['science', 'Should scientists be free to research anything they like?', 'Are there areas of research that should be banned?', 'Who should decide?'],
        ['tech', 'Will people still need to learn to write by hand in 20 years?', 'What else might disappear from schools?', 'Is anything lost when skills disappear?'],
        ['life', 'Is it possible to be too ambitious?', 'What price do very successful people pay?', 'Is success something you can measure?'],
        ['media', 'Do we have a right to know about the private lives of public figures?', 'Does it depend on who they are?', 'Has social media changed what counts as private?'],
        ['work', 'Will robots ever replace teachers, doctors or judges?', 'Which human qualities are hardest to replace?', 'Would you trust a robot doctor?'],
        ['money', 'Does having more choice make us happier?', 'Have you ever regretted a choice because there were too many options?', 'How do you make difficult decisions?'],
        ['env', 'Should governments limit how much meat people can buy?', 'Would such a law ever be accepted?', 'What other measures might work better?'],
        ['culture', 'Is it important for a country to protect its own language from foreign words?', 'How has your language changed in your lifetime?', 'Is language change a loss or a sign of life?'],
      ],
    },
    cpe: {
      1: [
        ['life', 'Is nostalgia a healthy emotion or a trap?', 'What are you nostalgic about?', 'Why do we tend to remember the past as better than it was?'],
        ['work', 'To what extent does your job define who you are?', 'How do you answer the question “What do you do?”', 'Would you work if you didn’t need the money?'],
        ['culture', 'What makes a work of art “great” rather than merely popular?', 'Can something be both?', 'Who has the authority to decide?'],
        ['tech', 'Has technology given us more free time or simply more to do?', 'Where has it saved you time?', 'Where has it stolen it?'],
        ['edu', 'Is there such a thing as a natural talent, or is it all practice?', 'What do you think you have a gift for?', 'What follows for the way we educate children?'],
        ['travel', 'Is the age of exploration over now that every corner of the map has been photographed?', 'What is left to discover?', 'Does travel still change people?'],
        ['society', 'What do you think future historians will find most baffling about how we live today?', 'Which of our habits will look cruel or absurd?', 'Which will they admire?'],
        ['health', 'Are we becoming obsessed with self-improvement?', 'Where is the line between self-care and self-obsession?', 'What does “living well” mean to you?'],
        ['media', 'Do algorithms know us better than we know ourselves?', 'Have you ever been surprised by a recommendation?', 'Should we be worried?'],
        ['money', 'Is it possible to be both very rich and entirely ethical?', 'What responsibilities come with wealth?', 'Is philanthropy a fair substitute for taxes?'],
      ],
      2: [
        ['ethics', 'Should we judge historical figures by the moral standards of today?', 'Can someone be both a hero and a villain?', 'How should we teach the darker parts of a nation’s past?'],
        ['science', 'If you could know the exact date of your death, would you want to?', 'How might it change the way you live?', 'What other knowledge might be better left unknown?'],
        ['society', 'Are we living through a crisis of trust — in institutions, experts and each other?', 'What has caused it?', 'How can trust be rebuilt once it is lost?'],
        ['tech', 'Should there be limits on how human-like machines are allowed to become?', 'Would you want a robot companion in old age?', 'Can a relationship with an AI ever be meaningful?'],
        ['culture', 'Does an artist’s private behaviour affect the value of their work?', 'Can you separate the art from the artist?', 'Have you ever stopped enjoying something for that reason?'],
        ['edu', 'Has the obsession with grades and rankings undermined real learning?', 'What did you learn that no exam ever measured?', 'What would an ideal education system reward?'],
        ['env', 'Is economic growth compatible with protecting the planet?', 'Could people accept living with less?', 'Who should bear the cost of the transition?'],
        ['work', 'Will the idea of a nine-to-five job look as outdated as factory whistles in 50 years?', 'What will replace it?', 'Who will win and who will lose?'],
        ['life', 'Is solitude a luxury, a necessity or a danger?', 'How much time alone do you need?', 'Why do some people find it frightening?'],
        ['media', 'Is satire still possible when reality seems more absurd than fiction?', 'What role does humour play in politics?', 'Are there subjects that should never be joked about?'],
      ],
      3: [
        ['ethics', 'Is it morally better to be kind or to be honest when the two conflict?', 'Can you think of a time you had to choose?', 'Would a world of total honesty be better or worse?'],
        ['science', 'If we could upload a human mind to a computer, would that copy still be you?', 'What makes a person the same person over time?', 'Would you choose digital immortality?'],
        ['society', 'Should a society value equality of opportunity or equality of outcome?', 'Is perfect equality of opportunity even possible?', 'What role should luck play in how rewards are shared?'],
        ['culture', 'Does language shape the way we think, or merely reflect it?', 'Do you feel like a different person in English?', 'What words in your language have no English equivalent?'],
        ['life', 'Is a meaningful life the same as a happy one?', 'Could a life be meaningful but miserable?', 'Where does meaning come from?'],
        ['tech', 'Who should own the data we produce: us, the companies or nobody?', 'Would you sell your personal data for a fair price?', 'What would a fair price be?'],
        ['ethics', 'Do we have greater moral duties to people close to us than to strangers far away?', 'Is charity a duty or a choice?', 'How far should our circle of concern extend — to animals, future generations, AI?'],
        ['edu', 'Is wisdom something that can be taught?', 'Who is the wisest person you know, and why?', 'Does wisdom always come with age?'],
        ['society', 'Is it possible to remain neutral in the face of injustice?', 'When does silence become complicity?', 'What do ordinary people owe to causes they believe in?'],
        ['science', 'Should we try to bring extinct species back to life?', 'What could go wrong?', 'Is it about science or about our guilt?'],
      ],
    },
  };

  /* ================================================================ C1 Advanced */
  const CAE = {
    /* Part 1 · Interview: [theme, question] */
    p1: {
      1: [
        ['life', 'Where are you from, and what do you like most about living there?'], ['edu', 'What are you studying or working on at the moment?'],
        ['fun', 'How do you usually spend your weekends?'], ['travel', 'Where did you go on your last holiday?'],
        ['tech', 'Which app do you use most, and why?'], ['health', 'Do you do any sport or exercise regularly?'],
        ['culture', 'What kind of music do you listen to when you want to relax?'], ['life', 'Are you a morning person or an evening person?'],
        ['edu', 'Why are you learning English?'], ['fun', 'What would your perfect day off look like?'],
        ['work', 'What job would you like to be doing in five years’ time?'], ['life', 'Who do you spend most of your free time with?'],
        ['culture', 'Have you read a good book recently?'], ['money', 'Do you prefer shopping online or in shops?'],
        ['travel', 'Is there a place in your country that every tourist should visit?'],
      ],
      2: [
        ['tech', 'How has technology changed the way you keep in touch with friends?'], ['edu', 'What has been the most useful thing you have learnt outside school?'],
        ['work', 'Would you rather work for a big company or a small one? Why?'], ['life', 'How important is it for you to plan ahead?'],
        ['travel', 'Do you think it is better to visit a few places in depth or many places quickly?'], ['health', 'What do you think is the key to a healthy lifestyle?'],
        ['culture', 'Is there a tradition in your country that you particularly enjoy?'], ['media', 'Where do you usually get your news from?'],
        ['money', 'Are you good at saving money?'], ['fun', 'If you could learn a new hobby, what would it be?'],
        ['society', 'What do you like about your generation?'], ['env', 'What do you personally do to help the environment?'],
        ['life', 'What is something you have changed your mind about recently?'], ['edu', 'What is the best way to learn new vocabulary, in your experience?'],
        ['work', 'What skills do you think will be most valuable in the future?'],
      ],
      3: [
        ['society', 'In what ways is your hometown different from how it was when you were a child?'], ['tech', 'Do you think you spend too much time online?'],
        ['life', 'What is the best piece of advice you have ever been given?'], ['work', 'How do you stay motivated when a task is boring?'],
        ['edu', 'What would you change about the education system in your country?'], ['culture', 'Do you think people in your country read less than they used to?'],
        ['media', 'Do you think people trust the media less than they used to?'], ['life', 'What achievement are you most proud of?'],
        ['travel', 'How has tourism affected the place where you live?'], ['money', 'Do you think it is important to have a lot of money to be happy?'],
        ['health', 'Do you think people are under more stress today than in the past?'], ['society', 'What qualities do you value most in a friend?'],
        ['fun', 'If you could live in any period of history, which would you choose?'], ['env', 'Do you think your city is a good place for young people to live?'],
        ['tech', 'Is there any technology you refuse to use?'],
      ],
    },
    /* Part 2 · Long turn: three pictures, compare two (1 min); partner answers the follow-up (30 s) */
    p2: [
      { lvl: 1, theme: 'edu', q: 'They show people learning in different situations. Compare two of the pictures and say what the people might be learning, and how difficult it might be for them.', follow: 'Which situation do you think would be the most enjoyable? Why?', pics: [['music lesson', 'A violin lesson'], ['cooking class', 'An adult cooking class'], ['driving lesson', 'A driving lesson']] },
      { lvl: 1, theme: 'life', q: 'They show people spending their free time in different places. Compare two of the pictures and say why the people might have chosen to spend their time there, and how they might be feeling.', follow: 'Which place would you choose to spend a free afternoon? Why?', pics: [['people relaxing city park grass', 'A city park'], ['hikers mountain trail', 'Hikers on a mountain trail'], ['shopping mall interior people', 'A shopping centre']] },
      { lvl: 1, theme: 'tech', q: 'They show people communicating in different ways. Compare two of the pictures and say why the people might have chosen to communicate in this way, and how effective it might be.', follow: 'Which way of communicating do you prefer? Why?', pics: [['video conference laptop meeting', 'A video call'], ['handwritten letter envelope', 'A handwritten letter'], ['friends talking cafe table', 'A café terrace']] },
      { lvl: 2, theme: 'society', q: 'They show people helping others. Compare two of the pictures and say why the people might be doing this, and how much difference it might make.', follow: 'Which kind of help do you think is the most valuable? Why?', pics: [['volunteers planting trees', 'Volunteers planting trees'], ['volunteers serving food bank', 'Volunteers at a food bank'], ['volunteer reading children library', 'A volunteer reading with children']] },
      { lvl: 2, theme: 'work', q: 'They show people working under pressure. Compare two of the pictures and say what pressures the people might be facing, and how they might be dealing with them.', follow: 'Which job do you think is the most stressful? Why?', pics: [['surgeons operating theatre', 'Surgeons in an operating theatre'], ['chef cooking restaurant kitchen', 'A chef in a busy kitchen'], ['firefighters at work fire', 'Firefighters at work']] },
      { lvl: 2, theme: 'travel', q: 'They show people travelling in different ways. Compare two of the pictures and say why the people might have chosen to travel like this, and what problems they might have.', follow: 'Which way of travelling would you find the most relaxing? Why?', pics: [['train passengers window journey', 'A long train journey'], ['hitchhiking', 'Hitchhiking'], ['bicycle touring', 'A cycling tour']] },
      { lvl: 2, theme: 'health', q: 'They show people doing sport. Compare two of the pictures and say what the people might get out of the activity, and how much commitment it might need.', follow: 'Which activity would you most like to try? Why?', pics: [['rock climbing indoor wall', 'Indoor climbing'], ['marathon runners street race', 'A marathon'], ['yoga class', 'A yoga class']] },
      { lvl: 2, theme: 'culture', q: 'They show people enjoying different kinds of performance. Compare two of the pictures and say why the audience might have chosen this kind of event, and how memorable the experience might be.', follow: 'Which performance would you most like to see? Why?', pics: [['street musician busking crowd', 'A street musician'], ['open air rock concert crowd', 'An open-air concert'], ['theatre stage actors performance', 'A theatre performance']] },
      { lvl: 3, theme: 'env', q: 'They show different attempts to protect the environment. Compare two of the pictures and say how effective these efforts might be, and why some people might not take part.', follow: 'Which of these efforts do you think will have the greatest long-term effect? Why?', pics: [['commuters cycling bike lane city', 'Cycling to work'], ['recycling bins street', 'Recycling bins'], ['farmers market vegetables stall', 'A farmers’ market']] },
      { lvl: 3, theme: 'media', q: 'They show people taking in information in different ways. Compare two of the pictures and say how reliable the information might be, and how the people might be affected by it.', follow: 'Which source of information do you trust most? Why?', pics: [['man reading newspaper', 'Reading a newspaper'], ['teenager using smartphone', 'Using a smartphone'], ['television news studio', 'A television news studio']] },
      { lvl: 3, theme: 'society', q: 'They show people celebrating. Compare two of the pictures and say why these celebrations might be important to the people, and how they might remember them later.', follow: 'Which celebration do you think means the most to the people involved? Why?', pics: [['graduation ceremony', 'A graduation'], ['wedding guests dancing', 'A wedding party'], ['street festival parade crowd', 'A street festival']] },
      { lvl: 3, theme: 'work', q: 'They show people making important decisions. Compare two of the pictures and say what the people might be deciding, and what the consequences of a wrong decision might be.', follow: 'Which decision do you think is the hardest to make? Why?', pics: [['business meeting', 'A board meeting'], ['referee football match decision', 'A referee'], ['couple looking at house for sale', 'Moving house']] },
    ],
    /* Part 3 · Collaborative task: [theme, question, five prompts, decision] — 2 min discussion + 1 min decision */
    p3: {
      1: [
        ['life', 'Here are some things people think make a town a good place to live. Talk to each other about why these things might make a town a good place to live.', ['parks and green spaces', 'good public transport', 'job opportunities', 'cafés and restaurants', 'friendly neighbours'], 'Now decide which two would matter most to young people.'],
        ['edu', 'Here are some ways students can prepare for an important exam. Talk to each other about how useful these ways of preparing might be.', ['studying with friends', 'doing past papers', 'taking a private course', 'watching online videos', 'getting enough sleep'], 'Now decide which way would help most in the week before the exam.'],
        ['travel', 'Here are some things people think about when planning a holiday. Talk to each other about how important these things might be.', ['cost', 'weather', 'food', 'things to do', 'how far away it is'], 'Now decide which is the most important for a family holiday.'],
        ['health', 'Here are some ways people try to stay healthy. Talk to each other about how easy it might be to keep up these habits.', ['eating less sugar', 'walking every day', 'going to bed earlier', 'drinking more water', 'joining a gym'], 'Now decide which habit is the hardest to keep.'],
        ['work', 'Here are some things that can make a job satisfying. Talk to each other about how important these things might be.', ['a good salary', 'friendly colleagues', 'flexible hours', 'chances to learn', 'a short commute'], 'Now decide which two matter most to someone starting their career.'],
        ['tech', 'Here are some ways technology helps us in daily life. Talk to each other about how these technologies have changed our lives.', ['online banking', 'map apps', 'video calls', 'online shopping', 'translation apps'], 'Now decide which one you would find it hardest to live without.'],
        ['culture', 'Here are some ways a city could attract more young people to cultural events. Talk to each other about how successful these ideas might be.', ['free museum entry', 'outdoor concerts', 'student discounts', 'events in English', 'late-night openings'], 'Now decide which idea the city should try first.'],
      ],
      2: [
        ['env', 'Here are some ways cities could reduce pollution. Talk to each other about how effective these measures might be.', ['banning cars in the centre', 'planting more trees', 'free public transport', 'charging for parking', 'more cycle lanes'], 'Now decide which measure would be the most popular with residents.'],
        ['society', 'Here are some ways people could get to know their neighbours better. Talk to each other about how successful these ideas might be.', ['street parties', 'a local social network', 'a community garden', 'sharing tools', 'sports clubs'], 'Now decide which idea would bring the most people together.'],
        ['media', 'Here are some ways advertising influences people. Talk to each other about how these kinds of advertising might affect people.', ['celebrity endorsements', 'adverts on social media', 'billboards', 'product placement in films', 'influencer reviews'], 'Now decide which kind is the most persuasive.'],
        ['edu', 'Here are some subjects that some people think should be taught at school. Talk to each other about why these subjects might be useful for young people.', ['personal finance', 'first aid', 'coding', 'public speaking', 'mental health'], 'Now decide which subject should be added to the timetable first.'],
        ['work', 'Here are some ways companies try to keep their employees happy. Talk to each other about how effective these might be.', ['working from home', 'free lunches', 'extra holiday', 'training courses', 'team-building trips'], 'Now decide which would make employees most loyal to the company.'],
        ['health', 'Here are some ways of dealing with stress. Talk to each other about how helpful they might be.', ['talking to friends', 'doing exercise', 'spending time in nature', 'switching off your phone', 'getting professional help'], 'Now decide which would be the best advice for a student.'],
        ['money', 'Here are some things young people often spend money on. Talk to each other about whether these are worth the money.', ['the latest phone', 'designer clothes', 'travel', 'eating out', 'streaming subscriptions'], 'Now decide which is the best investment for a young person.'],
      ],
      3: [
        ['society', 'Here are some factors that can influence the kind of person we become. Talk to each other about how much influence these factors might have.', ['family', 'friends', 'school', 'social media', 'the place we grow up'], 'Now decide which factor has the greatest influence.'],
        ['tech', 'Here are some areas where artificial intelligence is starting to be used. Talk to each other about the advantages and risks of using AI in these areas.', ['medicine', 'education', 'driving', 'hiring staff', 'the arts'], 'Now decide in which area AI should be used with the greatest caution.'],
        ['env', 'Here are some sacrifices people might make to protect the environment. Talk to each other about how willing people might be to make them.', ['giving up flying', 'eating less meat', 'buying second-hand clothes', 'living in a smaller home', 'paying higher taxes'], 'Now decide which sacrifice would make the biggest difference.'],
        ['ethics', 'Here are some situations in which people might tell a lie. Talk to each other about whether it is acceptable to lie in these situations.', ['to protect a friend', 'in a job interview', 'about a gift you dislike', 'to a child about something scary', 'to avoid an argument'], 'Now decide in which situation lying is most acceptable.'],
        ['culture', 'Here are some things that could be done to protect a country’s traditions. Talk to each other about how effective these might be.', ['teaching traditions at school', 'funding local festivals', 'protecting old buildings', 'supporting local crafts', 'TV programmes about history'], 'Now decide which would do most to keep traditions alive.'],
        ['work', 'Here are some qualities that are important for a good leader. Talk to each other about why these qualities might be important.', ['honesty', 'confidence', 'the ability to listen', 'experience', 'creativity'], 'Now decide which quality is the most difficult to learn.'],
      ],
    },
    /* Part 4 · Discussion: [theme, question] */
    p4: {
      1: [
        ['life', 'Do you think people spend enough time with their families nowadays?'], ['edu', 'Is it better to study alone or with other people?'],
        ['travel', 'Why do you think some people never want to travel?'], ['health', 'Should schools do more to encourage children to exercise?'],
        ['tech', 'Do you think children should learn to use technology from a very early age?'], ['work', 'Is it better to have a job you love or a job that pays well?'],
        ['culture', 'Why do you think some films become popular all over the world?'], ['money', 'Should children get pocket money?'],
        ['env', 'Do you think people in your country care about the environment?'], ['fun', 'Why are hobbies important?'],
        ['society', 'What are the advantages of living in a big city?'], ['media', 'Do you think people believe everything they read online?'],
      ],
      2: [
        ['society', 'Some people say that neighbours don’t know each other any more. Why might this be?'], ['edu', 'Should university be for everyone?'],
        ['work', 'How might the way people work change in the next twenty years?'], ['tech', 'Do you think social media brings people closer together or pushes them apart?'],
        ['env', 'Who should be responsible for protecting the environment: governments, companies or individuals?'], ['media', 'Should there be stricter rules about what can be advertised to children?'],
        ['health', 'Why do you think so many people find it difficult to relax?'], ['culture', 'How important is it to protect old buildings in cities?'],
        ['travel', 'What are the advantages and disadvantages of mass tourism for local people?'], ['money', 'Do you think people buy too many things they don’t need?'],
        ['life', 'Is it better to make important decisions quickly or slowly?'], ['society', 'How can young people be encouraged to take part in their community?'],
      ],
      3: [
        ['society', 'Some people say that we are losing the ability to have face-to-face conversations. Do you agree?'], ['tech', 'Should there be limits on how much personal information companies can collect?'],
        ['ethics', 'Is it ever right for the government to restrict people’s freedom for the good of society?'], ['work', 'Do you think people will still want to work if machines can do most jobs?'],
        ['edu', 'Is creativity something that can be taught?'], ['env', 'Would people accept a lower standard of living to save the planet?'],
        ['media', 'How has the constant flow of news affected the way people think?'], ['culture', 'Does globalisation make the world more interesting or more boring?'],
        ['life', 'Why do some people find it so hard to admit they are wrong?'], ['money', 'Does money change people?'],
        ['science', 'Should we be worried about how fast science and technology are developing?'], ['health', 'Should healthy people pay less for health insurance?'],
      ],
    },
  };

  /* ================================================================ C2 Proficiency */
  const CPE = {
    /* Part 1 · Interview: [theme, question] */
    p1: {
      1: [
        ['life', 'What do you enjoy most about the area where you live?'], ['edu', 'What do you find most challenging about learning English?'],
        ['work', 'What do you hope to be doing professionally in a few years’ time?'], ['fun', 'How do you usually unwind at the end of the week?'],
        ['travel', 'Is there anywhere you have always wanted to visit?'], ['tech', 'How much does technology feature in your daily routine?'],
        ['culture', 'What kind of books or films do you find yourself drawn to?'], ['life', 'Do you consider yourself an organised person?'],
        ['health', 'What do you do to keep fit?'], ['society', 'How would your friends describe you?'],
        ['edu', 'What did you enjoy most about your school days?'], ['life', 'What is a typical weekday like for you?'],
        ['money', 'Are you more of a saver or a spender?'], ['culture', 'Is there a piece of music that means a lot to you?'],
        ['travel', 'How do you prefer to spend your holidays?'],
      ],
      2: [
        ['society', 'How has the place where you grew up changed in recent years?'], ['tech', 'Is there a piece of technology you couldn’t do without?'],
        ['life', 'What is the most valuable lesson you have learnt so far in life?'], ['work', 'What would make you leave a job you otherwise enjoyed?'],
        ['edu', 'If you could study a completely new subject, what would it be?'], ['culture', 'Which tradition from your culture would you most like foreigners to experience?'],
        ['media', 'How do you keep up with what is happening in the world?'], ['life', 'Are you someone who likes routine or variety?'],
        ['travel', 'What is the most unusual place you have ever been to?'], ['health', 'How do you cope with pressure?'],
        ['fun', 'What did you want to be when you were a child?'], ['money', 'What would you do if you suddenly came into a large sum of money?'],
        ['society', 'Who has had the greatest influence on the way you think?'], ['env', 'Have you changed any habits for environmental reasons?'],
        ['edu', 'Do you think you learn more from success or from failure?'],
      ],
      3: [
        ['life', 'What, in your view, is the secret of a fulfilling life?'], ['society', 'Is there an idea that you held strongly in the past but have since abandoned?'],
        ['tech', 'In what ways do you think technology has changed the way you think?'], ['work', 'Do you believe that hard work always pays off?'],
        ['culture', 'Is there a book that changed the way you see the world?'], ['ethics', 'What would you never compromise on?'],
        ['life', 'If you could give your younger self one piece of advice, what would it be?'], ['edu', 'Is there anything you think you will never fully understand?'],
        ['media', 'Do you think it is possible to stay well informed without becoming anxious?'], ['society', 'What do you think your generation will be remembered for?'],
        ['fun', 'If you could have dinner with anyone, living or dead, who would it be and why?'], ['money', 'Do you think people are judged too much by what they earn?'],
        ['travel', 'Has travelling ever changed your opinion about something important?'], ['science', 'Which scientific question would you most like to see answered in your lifetime?'],
        ['life', 'Is there a risk you regret not taking?'],
      ],
    },
    /* Part 2 · Collaborative task: q1 about one or two pictures (1 min), q2 decision task about all of them (3 min) */
    p2: [
      { lvl: 1, theme: 'work', q1: 'Look at pictures A and B. Talk together about what aspects of these jobs the people might find most rewarding.', q2: 'Now look at all the pictures. Imagine that a careers fair is planning a poster called “Work that matters”. Talk together about what each picture says about the value of work, and then decide which picture should be used for the poster.', pics: [['scientist working laboratory', 'A scientist in a laboratory'], ['farmer driving tractor field', 'A farmer'], ['nurse caring patient hospital', 'A nurse with a patient'], ['carpenter workshop wood', 'A carpenter']] },
      { lvl: 1, theme: 'env', q1: 'Look at pictures A and B. Talk together about how these places might make people feel.', q2: 'Now look at all the pictures. Imagine that a city is designing a campaign about the future of urban life. Talk together about what each picture suggests about city living, and then decide which picture best represents the city of the future.', pics: [['skyscraper under construction cranes', 'A skyscraper being built'], ['solar panel farm field', 'A solar farm'], ['rooftop garden city', 'A rooftop garden'], ['traffic jam motorway', 'A traffic jam']] },
      { lvl: 1, theme: 'life', q1: 'Look at pictures A and B. Talk together about what the relationship between the people might be.', q2: 'Now look at all the pictures. Imagine that a magazine is publishing an article about the importance of human connection. Talk together about what each picture shows about relationships, and then decide which picture should go on the cover.', pics: [['grandmother grandson', 'A grandmother and grandchild'], ['friends hiking together', 'Friends hiking'], ['colleagues celebrating office', 'Dancing at a celebration'], ['elderly men playing chess park', 'Playing chess in the park']] },
      { lvl: 2, theme: 'media', q1: 'Look at pictures A and B. Talk together about how much influence the people in the pictures might have on public opinion.', q2: 'Now look at all the pictures. Imagine that a university is running a course on the power of the media. Talk together about the role of the media in each situation, and then decide which picture would be most suitable for the course website.', pics: [['press conference journalists cameras', 'A press conference'], ['television news studio', 'A news studio'], ['teenager using smartphone', 'Scrolling on a phone'], ['man reading newspaper', 'Reading a newspaper']] },
      { lvl: 2, theme: 'tech', q1: 'Look at pictures A and B. Talk together about how technology has changed what the people are doing.', q2: 'Now look at all the pictures. Imagine that a museum is preparing an exhibition called “Technology and us”. Talk together about the advantages and drawbacks of technology shown in each picture, and then decide which picture should be used to advertise the exhibition.', pics: [['industrial robots', 'Robots in a factory'], ['virtual reality headset person', 'Virtual reality'], ['self checkout supermarket', 'A self-service checkout'], ['child tablet learning', 'Children with tablets']] },
      { lvl: 2, theme: 'health', q1: 'Look at pictures A and B. Talk together about what motivates the people to do this activity.', q2: 'Now look at all the pictures. Imagine that a health organisation is planning a campaign to get people more active. Talk together about how appealing each activity might be to different people, and then decide which picture would persuade the most people to become more active.', pics: [['marathon runners street race', 'A marathon'], ['yoga class', 'A yoga class'], ['people dancing salsa class', 'A dance class'], ['wild swimming lake people', 'Swimming in a lake']] },
      { lvl: 2, theme: 'culture', q1: 'Look at pictures A and B. Talk together about what the people might be gaining from the experience.', q2: 'Now look at all the pictures. Imagine that a city council is deciding how to spend its culture budget. Talk together about the value of each kind of culture to the community, and then decide which should receive the most funding.', pics: [['art museum visitors gallery', 'A museum'], ['street musician busking crowd', 'A street musician'], ['public library reading room', 'A public library'], ['theatre stage actors performance', 'A theatre']] },
      { lvl: 3, theme: 'society', q1: 'Look at pictures A and B. Talk together about what challenges the people might be facing.', q2: 'Now look at all the pictures. Imagine that a charity is producing a report on what holds communities together. Talk together about what each picture shows about community life, and then decide which picture best captures the idea of community.', pics: [['volunteers serving food bank', 'A food bank'], ['street festival parade crowd', 'A street festival'], ['community garden volunteers', 'A community garden'], ['town hall meeting residents', 'A public meeting']] },
      { lvl: 3, theme: 'ethics', q1: 'Look at pictures A and B. Talk together about what responsibilities the people in these situations might have.', q2: 'Now look at all the pictures. Imagine that a philosophy podcast is choosing an image for an episode on moral responsibility. Talk together about the moral questions raised by each picture, and then decide which picture raises the most interesting questions.', pics: [['surgeons operating theatre', 'Surgeons operating'], ['judge courtroom gavel', 'A courtroom'], ['business meeting', 'A board meeting'], ['firefighters at work fire', 'Firefighters at work']] },
      { lvl: 3, theme: 'env', q1: 'Look at pictures A and B. Talk together about the impact these activities might have on the environment.', q2: 'Now look at all the pictures. Imagine that an environmental group is publishing a book on humanity’s footprint on the planet. Talk together about what each picture says about our relationship with nature, and then decide which picture should go on the cover.', pics: [['cargo ship containers port', 'A container port'], ['deforestation logging forest', 'Logging'], ['wind turbines landscape', 'Wind turbines'], ['commuters cycling bike lane city', 'Cycling to work']] },
      { lvl: 3, theme: 'travel', q1: 'Look at pictures A and B. Talk together about how the local people might feel about these visitors.', q2: 'Now look at all the pictures. Imagine that a travel magazine is publishing a special issue on responsible tourism. Talk together about the benefits and costs of each kind of travel, and then decide which picture best represents responsible tourism.', pics: [['tourists crowd historic square', 'A crowded historic square'], ['cruise ship port city', 'A cruise ship'], ['hikers mountain trail', 'Hikers in the mountains'], ['hitchhiking', 'A backpacker']] },
      { lvl: 3, theme: 'edu', q1: 'Look at pictures A and B. Talk together about what kind of learning might be taking place.', q2: 'Now look at all the pictures. Imagine that a ministry of education is preparing a report on the future of learning. Talk together about what each picture suggests about how people learn best, and then decide which picture should open the report.', pics: [['lecture hall university students', 'A university lecture'], ['child tablet learning', 'Learning with tablets'], ['apprentice mechanic workshop', 'An apprentice'], ['music lesson', 'A music lesson']] },
    ],
    /* Part 3 · Long turn (2 min) on a card with three prompts, then discussion: [theme, question, prompts, discussion] */
    p3: {
      1: [
        ['work', 'What makes a job worth doing?', ['money', 'personal satisfaction', 'status'], ['Is job satisfaction a luxury only some people can afford?', 'Should schools prepare students for jobs or for life?']],
        ['tech', 'How has technology changed the way we form relationships?', ['friendship', 'romance', 'family life'], ['Can online friendships be as deep as real-life ones?', 'Are we more connected or more isolated than ever?']],
        ['edu', 'What is the purpose of education?', ['personal development', 'employment', 'citizenship'], ['Should education ever be compulsory beyond the age of 16?', 'What do schools fail to teach?']],
        ['travel', 'Why do people travel?', ['escape', 'curiosity', 'status'], ['Has social media changed the reasons people travel?', 'Is staying at home ever the more interesting choice?']],
        ['health', 'What does it mean to live a healthy life?', ['diet', 'mental wellbeing', 'balance'], ['Is health a personal responsibility or a social one?', 'Has the wellness industry made us healthier?']],
        ['culture', 'Why is it important to preserve traditions?', ['identity', 'continuity', 'tourism'], ['Should a tradition be kept if many people find it offensive?', 'Can new traditions be invented?']],
        ['money', 'What role should money play in our lives?', ['security', 'freedom', 'happiness'], ['Is it wrong to want to be rich?', 'Should financial education begin in primary school?']],
        ['life', 'What makes a good friend?', ['loyalty', 'honesty', 'shared interests'], ['Do friendships last as long as they used to?', 'Is it possible to have too many friends?']],
        ['media', 'How do the media shape the way we see the world?', ['news', 'entertainment', 'advertising'], ['Is completely objective journalism possible?', 'Should the media be held responsible for public fear?']],
        ['env', 'What can individuals do to protect the environment?', ['consumption', 'transport', 'political action'], ['Is it fair to put pressure on individuals rather than industries?', 'Will future generations judge us harshly?']],
      ],
      2: [
        ['society', 'How important is it to feel part of a community?', ['belonging', 'support', 'obligation'], ['Are modern cities lonely places?', 'Can online communities replace local ones?']],
        ['science', 'Should there be limits on scientific research?', ['ethics', 'safety', 'funding'], ['Who should decide what scientists are allowed to study?', 'Has science ever gone too far?']],
        ['culture', 'Why do people value art?', ['beauty', 'expression', 'investment'], ['Should governments fund art that most people don’t like?', 'Is AI-generated art a threat to artists?']],
        ['work', 'How is the nature of work changing?', ['automation', 'flexibility', 'job security'], ['Will people have more or less leisure time in the future?', 'Is the idea of a career for life dead?']],
        ['ethics', 'To what extent should we be responsible for future generations?', ['the environment', 'public debt', 'cultural heritage'], ['Is it realistic to expect people to make sacrifices for people not yet born?', 'What will future generations thank us for?']],
        ['media', 'What is the impact of celebrity culture?', ['young people', 'consumer habits', 'values'], ['Why are people fascinated by the lives of the famous?', 'Does fame bring more freedom or less?']],
        ['edu', 'How important is it to learn from failure?', ['resilience', 'creativity', 'self-knowledge'], ['Do schools punish mistakes too harshly?', 'Is the fear of failure growing?']],
        ['life', 'What influences the choices we make?', ['family', 'peers', 'circumstances'], ['How free are we really to choose our own path?', 'Do we make better decisions with age?']],
        ['tech', 'How far should we trust machines to make decisions for us?', ['convenience', 'accuracy', 'accountability'], ['Should a machine ever decide whether someone gets a job or a loan?', 'Are humans really better decision-makers?']],
        ['society', 'What makes a city a good place to live?', ['infrastructure', 'culture', 'people'], ['Should cities be designed for cars or for people?', 'Will people want to live in cities in fifty years?']],
      ],
      3: [
        ['ethics', 'Is it possible to live a truly ethical life in the modern world?', ['consumer choices', 'work', 'personal relationships'], ['Does it matter more what we do or what we intend?', 'Is moral perfection even desirable?']],
        ['society', 'How far should individual freedom be limited for the common good?', ['public health', 'security', 'the environment'], ['Who should decide where the line is drawn?', 'Have we become too willing to give up freedoms?']],
        ['science', 'Is technological progress always desirable?', ['quality of life', 'inequality', 'unintended consequences'], ['Can we ever stop a technology once it has been invented?', 'Is the idea of progress itself questionable?']],
        ['culture', 'What does it mean to belong to a culture?', ['language', 'customs', 'shared memory'], ['Is it possible to belong to more than one culture?', 'Is cultural identity becoming less important?']],
        ['life', 'What is the value of solitude?', ['creativity', 'self-knowledge', 'rest'], ['Why are many people uncomfortable being alone?', 'Has constant connectivity made solitude impossible?']],
        ['edu', 'What is the difference between knowledge and wisdom?', ['experience', 'education', 'age'], ['Can a society be knowledgeable but unwise?', 'Who are the wise people of our age?']],
        ['media', 'Has the internet strengthened or weakened democracy?', ['access to information', 'polarisation', 'participation'], ['Should social networks be treated as publishers?', 'Can democracy survive a world without shared facts?']],
        ['money', 'Is inequality an inevitable feature of society?', ['talent', 'opportunity', 'inheritance'], ['How much inequality is acceptable?', 'Should there be a maximum wage?']],
        ['tech', 'What will it mean to be human in an age of intelligent machines?', ['creativity', 'emotion', 'work'], ['Is there any human ability machines will never match?', 'Should we fear or welcome superintelligence?']],
        ['ethics', 'Should we always tell the truth?', ['relationships', 'politics', 'medicine'], ['Is a lie by omission still a lie?', 'Can a society function on total transparency?']],
      ],
    },
  };

  /* ================================================================ photos, pinned from Wikimedia Commons: query → [path, author, licence, thumb?] */
  const PHOTOS = {
    "music lesson": ["a/ab/PikiWiki_Israel_12707_Piano_Lesson_in_Kfar_saba.JPG", "ד.קפלן", "Public domain", 1],
    "cooking class": ["2/24/Cooking_spaghetti_at_a_culinary_class_in_Baozhong_Junior_High_School_20130426.jpg", "褒忠國中 雲端網", "CC BY 2.0", 1],
    "driving lesson": ["6/67/Renault_FR1_TE%2C_driving_lesson%2C_Szczecin%2C_2022.jpg", "Szczecinolog", "CC BY-SA 4.0", 1],
    "people relaxing city park grass": ["f/fd/Relaxing_on_the_grass_-_geograph.org.uk_-_6222748.jpg", "Anthony O'Neil", "CC BY-SA 2.0", 1],
    "hikers mountain trail": ["8/83/Mountain_hiking.jpg", "Gorillawalkingsafaris", "CC BY-SA 4.0", 1],
    "shopping mall interior people": ["a/a0/Shoreline_shopping_mall_interior_on_opening_day_%28crowds%29.jpg", "Christian Camenzuli", "CC BY-SA 4.0", 1],
    "video conference laptop meeting": ["a/a2/Woman_smiling_and_using_laptop_during_video_call_in_cozy_wooden_room.jpg", "Shixart1985", "CC BY 2.0", 1],
    "handwritten letter envelope": ["8/8d/Handwritten_letter_by_Wilbur_Underhill_Jr._-_Envelope.jpg", "Wilbur Underhill Jr.", "Public domain", 1],
    "friends talking cafe table": ["e/ec/Arthur_Avenue_41_-_terrace_of_Noya_Cafe.jpg", "Joe Mabel", "CC BY-SA 4.0", 1],
    "volunteers planting trees": ["6/68/Volunteers_planting_%2855066598042%29.jpg", "Joshua Tree National Park", "Public domain", 1],
    "volunteers serving food bank": ["2/21/Food_bank_volunteers_150312-N-NB544-032.jpg", "Petty Officer 3rd Class Kyle Carlstrom", "Public domain", 1],
    "volunteer reading children library": ["4/4c/Ramstein_Library_hosts_Juneteenth_book_reading_%288489593%29.jpg", "U.S. Air Force / Senior Airman Thomas Karol", "Public domain", 1],
    "surgeons operating theatre": ["b/b5/Laparoscopic_operating_theatre.jpg", "Dr. Jayesh Amin", "CC BY-SA 3.0", 1],
    "chef cooking restaurant kitchen": ["c/ce/Chef_cooking_Mysore_masala_dosa_in_Mysuru%2C_July_2013.jpg", "Sunnya343", "CC BY-SA 4.0", 1],
    "firefighters at work fire": ["7/7b/Firefighter%2C_Ashton_Bay%2C_March_2017.jpg", "StevenTerblanche", "CC BY-SA 4.0", 1],
    "train passengers window journey": ["9/96/Aug2024._Train_from_Prachuap_Khiri_Khan_to_Chumphon%2C_Thailand_02.jpg", "Ridiculopathy", "CC0", 1],
    "hitchhiking": ["b/b0/Hitchhiking_in_Krak%C3%B3w.jpg", "Skelanard", "CC BY-SA 4.0", 1],
    "bicycle touring": ["e/e5/08_Slovenia_rural_landscape_-_bicycle_expedition_with_panniers.jpg", "Marek Ślusarczyk (Tupungato)", "CC BY 3.0", 1],
    "rock climbing indoor wall": ["9/97/Climber_practices_skills_on_indoor_wall_during_event_at_climbing_center.jpg", "Shixart1985", "CC BY 2.0", 1],
    "marathon runners street race": ["f/f0/Marathon_runners_near_the_end_of_the_race_-_geograph.org.uk_-_6142899.jpg", "Stephen Craven", "CC BY-SA 2.0", 1],
    "yoga class": ["f/fc/Yoga_class_in_Kilimarathukavu.jpg", "Achusp123", "CC BY-SA 4.0", 1],
    "street musician busking crowd": ["8/8a/Busker_playing_to_a_crowd_at_Beach_Busk_2022.jpg", "Gweduni", "CC BY-SA 4.0", 1],
    "open air rock concert crowd": ["f/fc/Le_Vibrazioni_-_Foglianise_2022.jpg", "Editor04082022", "CC BY-SA 4.0", 1],
    "theatre stage actors performance": ["7/7d/Lyric_Theatre_Sydney_-_Wicked_2023_-_front_stage_2.jpg", "Chris.sherlock2", "CC BY-SA 4.0", 1],
    "commuters cycling bike lane city": ["c/ce/A_bike_courier_and_bike_commuter_in_a_pilot_bus-bike_lane_in_Mexico_City.jpg", "Fabián Heredia Montiel", "CC BY 4.0", 1],
    "recycling bins street": ["9/99/Recycling_bins_Drammen.jpg", "Peulle", "CC0", 1],
    "farmers market vegetables stall": ["b/b9/Farmers_Market_Hertford.jpg", "RobThinks", "CC BY-SA 4.0", 1],
    "man reading newspaper": ["3/36/Man_reading_a_newspaper.jpg", "Michael Slaten", "CC BY-SA 4.0", 1],
    "teenager using smartphone": ["f/f8/Woman_watching_her_phone_on_a_bus.jpg", "W.carter", "CC BY-SA 4.0", 1],
    "television news studio": ["0/0e/News_studio_of_3_Central_Square%2C_8_July_2022.jpg", "Seth Whales", "CC BY-SA 4.0", 1],
    "graduation ceremony": ["a/ab/AnnapolisGraduation.jpg", "U.S. Navy / Daniel J. McLain", "Public domain", 1],
    "wedding guests dancing": ["5/5d/Music_and_dance_at_a_traditional_wedding_party_in_Uganda_03.jpg", "Douglaseru", "CC BY-SA 4.0", 1],
    "street festival parade crowd": ["d/d3/Crowds_during_the_Honolulu_Festival_parade._%285651437452%29.jpg", "Daniel Ramirez", "CC BY 2.0", 1],
    "business meeting": ["f/fd/Yappa_Office_The_Round_Table_%283348629201%29.jpg", "Tomer Gabel", "CC BY-SA 2.0", 1],
    "referee football match decision": ["6/63/Baldomero_Toledo_checks_VAR_-_Seattle_Sounders_vs._Sporting_Kansas_City.jpg", "SounderBruce", "CC BY-SA 4.0", 1],
    "couple looking at house for sale": ["0/03/Movers_carrying_a_shelving_unit_into_a_moving_truck_in_Christchurch.jpg", "Nabin Pradhan", "CC0", 1],
    "scientist working laboratory": ["6/63/Scientist_Working_in_a_Laboratory%28GN09041%29.jpg", "State Government Photographer", "CC0", 1],
    "farmer driving tractor field": ["d/d1/Farmer_Driving_Tractor_in_Field_%2848750760342%29.jpg", "United Soybean Board", "CC BY 2.0", 1],
    "nurse caring patient hospital": ["1/10/ICU_nurse_cares_for_infant.jpg", "Bill Branson", "Public domain", 1],
    "carpenter workshop wood": ["9/99/Carpenter_in_his_workshop_2.jpg", "A7med3ssam9", "CC BY-SA 4.0", 1],
    "skyscraper under construction cranes": ["c/cd/Skyscraper_Construction_in_Frankfurt%2C_Germany.jpg", "Spinarak", "CC0", 1],
    "solar panel farm field": ["6/69/Solar_panel_farm_%2813313377243%29.jpg", "Dave Lauretti", "CC BY 2.0", 1],
    "rooftop garden city": ["9/9f/Rooftop_Garden.jpg", "K.Venkataramana", "CC BY-SA 4.0", 1],
    "traffic jam motorway": ["a/af/Traffic_Jam_on_the_M62_-_geograph.org.uk_-_7390393.jpg", "Chris Heaton", "CC BY-SA 2.0", 1],
    "grandmother grandson": ["d/d4/Grandmother_and_grandson_1.jpg", "Marie-Sophie Mejan", "CC BY 4.0", 1],
    "friends hiking together": ["b/bc/Hikers_with_packs.jpg", "Kafziel", "CC BY-SA 3.0", 1],
    "colleagues celebrating office": ["a/a6/Music_and_dance_at_a_traditional_wedding_party_in_Uganda_02.jpg", "Douglaseru", "CC BY-SA 4.0", 1],
    "elderly men playing chess park": ["a/a1/Playing_chess_TR_%28OSCAL19_trip%29.jpg", "albinfo", "CC0", 1],
    "press conference journalists cameras": ["1/1d/PRESS_CONFERENCE_2016-07-18_%2828285301552%29.jpg", "EU2016 SK", "CC0", 1],
    "industrial robots": ["5/5e/KUKA_Industrial_Robots_IR.jpg", "Mixabest", "CC BY-SA 3.0", 1],
    "virtual reality headset person": ["8/84/InclusiveGameLab_Person-Playing-Virtual-Reality_9_CC-BY-SA.jpg", "InclusiveGameLab", "CC BY-SA 4.0", 1],
    "self checkout supermarket": ["a/a6/Self-checkout_aisles_at_Publix.jpg", "Nielsoncaetanosalmeron", "CC BY 4.0", 1],
    "child tablet learning": ["b/b5/Kids_with_Education_Tablet_Computers.jpg", "Intel Free Press", "CC BY-SA 2.0", 1],
    "people dancing salsa class": ["9/95/Couples_partake_in_hips_and_salsa_120208-F-SF570-014.jpg", "Tech. Sgt. Michael Keller", "Public domain", 1],
    "wild swimming lake people": ["7/78/Swimming_in_Lake_Loveland_2_%2811655363603%29.jpg", "USFWS Mountain-Prairie", "CC BY 2.0", 0],
    "art museum visitors gallery": ["e/ea/HK_Museum_of_Art_TST_Visitors_7.JPG", "Kinan168", "CC BY-SA 3.0", 1],
    "public library reading room": ["a/a8/LOC_Main_Reading_Room_Highsmith.jpg", "Carol M. Highsmith", "Public domain", 1],
    "community garden volunteers": ["5/59/Parkdale_Community_garden_volunteer_day.JPG", "Oceanflynn", "CC BY-SA 4.0", 1],
    "town hall meeting residents": ["d/db/FEMA_-_37482_-_Residents_at_a_FEMA_Town_Hall_meeting_in_Texas.jpg", "Patsy Lynch", "Public domain", 1],
    "judge courtroom gavel": ["2/2f/Courtroom_One_Gavel_-_Flickr_-_Joe_Gratz.jpg", "Joe Gratz", "CC0", 1],
    "cargo ship containers port": ["c/c8/MAERSK_HANOI_Container_Ship_%28Port_Koper_SIKOP%2C_2023%29.jpg", "Petar Milošević", "CC BY-SA 4.0", 1],
    "deforestation logging forest": ["e/ed/Deforestation_in_the_Toolangi_State_Forest.jpg", "Crustmania", "CC BY 2.0", 1],
    "wind turbines landscape": ["3/3d/Landscape_with_wind_turbines_-_geograph.org.uk_-_4916861.jpg", "Bill Harrison", "CC BY-SA 2.0", 1],
    "tourists crowd historic square": ["c/c7/Venice_-_Piazza_San_Marco_%282937726687%29.jpg", "Roger Wollstadt", "CC BY-SA 2.0", 0],
    "cruise ship port city": ["d/de/Cruise_ship_Norwegian_Pearl_in_the_port_of_Alicante_%282026%29.jpg", "Paul Colin Hennig", "CC BY-SA 4.0", 1],
    "lecture hall university students": ["4/4c/Students_of_Tamale_Technical_University_in_a_lecture_hall.jpg", "Stephany5757", "CC BY-SA 4.0", 1],
    "apprentice mechanic workshop": ["d/d7/Mechanic_works_on_car_engine_performing_routine_maintenance_and_inspections_on_vehicle_parts.jpg", "Shixart1985", "CC BY 2.0", 1]
  };
  const photo = q => {
    const p = PHOTOS[q]; if (!p) return null;
    const [path, author, licence, thumb] = p; const file = path.split('/').pop();
    const src = thumb ? 'https://thumb.wikimedia.org/wikipedia/commons/thumb/' + path + '/960px-' + file : 'https://upload.wikimedia.org/wikipedia/commons/' + path;
    return { src, page: 'https://commons.wikimedia.org/wiki/File:' + file, author, licence };
  };

  /* ================================================================ build flat lists of cards */
  const cards = [];
  let n = 0;
  const id = (p) => p + '-' + (++n);
  for (const exam of ['cae', 'cpe']) {
    for (const lvl of [1, 2, 3]) {
      for (const [theme, motion] of DEBATES[exam][lvl]) cards.push({ id: id(exam + '-deb'), exam, mode: 'debate', lvl, theme, title: motion, devil: lvl === 3 });
      for (const [theme, q, ...follow] of DISCUSS[exam][lvl]) cards.push({ id: id(exam + '-dis'), exam, mode: 'discuss', lvl, theme, title: q, follow });
    }
  }
  for (const lvl of [1, 2, 3]) {
    for (const [theme, q] of CAE.p1[lvl]) cards.push({ id: id('cae-p1'), exam: 'cae', mode: 'p1', lvl, theme, title: q });
    for (const [theme, q, prompts, decide] of CAE.p3[lvl]) cards.push({ id: id('cae-p3'), exam: 'cae', mode: 'p3', lvl, theme, title: q, prompts, decide });
    for (const [theme, q] of CAE.p4[lvl]) cards.push({ id: id('cae-p4'), exam: 'cae', mode: 'p4', lvl, theme, title: q });
    for (const [theme, q] of CPE.p1[lvl]) cards.push({ id: id('cpe-p1'), exam: 'cpe', mode: 'p1', lvl, theme, title: q });
    for (const [theme, q, prompts, discuss] of CPE.p3[lvl]) cards.push({ id: id('cpe-p3'), exam: 'cpe', mode: 'p3', lvl, theme, title: q, prompts, discuss });
  }
  for (const t of CAE.p2) cards.push({ id: id('cae-p2'), exam: 'cae', mode: 'p2', lvl: t.lvl, theme: t.theme, title: t.q.split('.')[0] + '.', q: t.q, follow: t.follow, pics: t.pics });
  for (const t of CPE.p2) cards.push({ id: id('cpe-p2'), exam: 'cpe', mode: 'p2', lvl: t.lvl, theme: t.theme, title: t.q2.split('. ')[1] + '.', q1: t.q1, q2: t.q2, pics: t.pics });

  return { THEMES, cards, photo };
})();
