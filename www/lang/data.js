'use strict';
/* Language Lab: the course material. Every language teaches the same eight units, so the English side is written once here and each
   language file gives the matching words and phrases in the same order (twelve words and five phrases per unit). */
const LangData = (() => {
  const split = s => s.split(';').map(x => x.trim());
  const UNITS = [
    { id: 'greet', title: 'Greetings', words: split('hello;goodbye;good morning;good night;welcome;please;thank you;you are welcome;sorry;excuse me;yes;no'), phrases: split('How are you?;I am fine, thank you;My name is Anna;Nice to meet you;See you tomorrow') },
    { id: 'basics', title: 'The basics', words: split('I;you;he;she;we;they;and;but;with;big;small;good'), phrases: split('I am a student;She is my friend;We are happy;Do you speak English?;I do not understand') },
    { id: 'numbers', title: 'Numbers', words: split('one;two;three;four;five;six;seven;eight;nine;ten;twenty;one hundred'), phrases: split('I have two brothers;I want three apples;There are four people;I am twenty years old;I have one cat') },
    { id: 'food', title: 'Food and drink', words: split('water;bread;milk;coffee;tea;apple;rice;meat;fish;egg;cheese;soup'), phrases: split('I want water;I like coffee;The bread is good;We eat rice;Do you want tea?') },
    { id: 'family', title: 'Family and people', words: split('mother;father;sister;brother;daughter;son;friend;man;woman;child;family;baby'), phrases: split('My mother is nice;My father works a lot;I love my family;The woman has a child;He is my brother') },
    { id: 'places', title: 'Places and travel', words: split('house;city;school;hotel;airport;train station;street;restaurant;store;hospital;beach;bathroom'), phrases: split('Where is the bathroom?;I am going to school;The hotel is near;I live in a big city;How do I get to the station?') },
    { id: 'verbs', title: 'Everyday verbs', words: split('to eat;to drink;to go;to want;to have;to see;to speak;to love;to read;to write;to sleep;to work'), phrases: split('I eat bread;She drinks water;We go to the beach;I love to read;He sleeps a lot') },
    { id: 'time', title: 'Time and colors', words: split('today;tomorrow;yesterday;now;day;night;week;red;blue;green;white;black'), phrases: split('I work today;Tomorrow I sleep a lot;The house is white;The sky is blue;At night I read') },
  ];
  const langs = {};
  // a language file passes the words and phrases of every unit as ';'-separated lists; Japanese also gives the reading after a '|'
  function add(l) {
    const units = UNITS.map(u => {
      const w = split(l.words[u.id] || ''), p = split(l.phrases[u.id] || '');
      if (w.length !== u.words.length || p.length !== u.phrases.length) throw new Error(`Language Lab: ${l.id}/${u.id} has ${w.length} words and ${p.length} phrases`);
      const entry = (t, en) => { const [text, roman] = t.split('|'); return { t: text.trim(), en, r: roman ? roman.trim() : '' }; };
      return { id: u.id, title: u.title, words: w.map((t, i) => entry(t, u.words[i])), phrases: p.map((t, i) => entry(t, u.phrases[i])), size: 4 };
    });
    for (const x of l.extra || []) units.push({ id: x.id, title: x.title, words: x.words.map(([t, en]) => ({ t, en, r: '' })), phrases: [], size: x.size || 5 });
    langs[l.id] = { id: l.id, name: l.name, native: l.native, tts: l.tts, articles: l.articles || [], roman: !!l.roman, note: l.note || '', units };
  }
  return { UNITS, langs, add, list: () => Object.values(langs) };
})();
if (typeof module !== 'undefined') module.exports = LangData;
