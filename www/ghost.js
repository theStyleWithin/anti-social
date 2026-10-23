'use strict';
/* Populated mode: a procedurally generated crowd, in the spirit of No Man's Sky.

   One seed makes the whole world. Nobody is stored: every person, post, picture and number is
   calculated on the spot from (seed, index), so the same seed always gives the same people and
   the crowd can go on forever. Nothing here reads input or has any way to act, so a generated
   account can never reply, like, follow or message anyone. They are scenery. */
const Ghost = (() => {
  const POP = 400;                 // accounts that appear in the home timeline
  const WORLD = 4294967296;        // accounts that exist in total (reachable through Discover)
  const HOUR = 3600000;

  /* ---------- seeded randomness ---------- */
  function hash32(str) {
    let h = 2166136261 >>> 0;
    for (let k = 0; k < str.length; k++) { h ^= str.charCodeAt(k); h = Math.imul(h, 16777619); }
    h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
    return h >>> 0;
  }
  function mulberry32(a) {
    return () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rng = (seed, ...keys) => mulberry32(hash32(seed + '|' + keys.join('|')));
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  /* ---------- names ---------- */
  const ONSET = ['b', 'br', 'c', 'ch', 'd', 'dr', 'f', 'g', 'gr', 'h', 'j', 'k', 'kl', 'l', 'm', 'n', 'p', 'pr', 'r', 's', 'sh', 'st', 't', 'tr', 'v', 'w', 'z', 'm', 'l', 'n', 'r', 's', 't'];
  const VOWEL = ['a', 'e', 'i', 'o', 'u', 'a', 'e', 'i', 'o', 'ai', 'ea', 'ia', 'ou'];
  const END = ['', '', 'n', 'l', 's', 'a', 'y', 'el', 'ia', 'o', 'er', 'ie', 'a', 'in'];
  const SUF = ['son', 'man', 'berg', 'well', 'ford', 'ley', 'ton', 'field', 'wood', 'stein', 'ova', 'ez', 'ini', 'ski', 'ham', 'worth', 'ridge', 'by', 'dale', 'lin'];
  function firstName(r) {
    const s = pick(r, ONSET) + pick(r, VOWEL) + (r() < 0.55 ? pick(r, ONSET) + pick(r, VOWEL) : '') + pick(r, END);
    return cap(s.length > 9 ? s.slice(0, 9) : s);
  }
  function lastName(r) {
    return cap(pick(r, ONSET) + pick(r, VOWEL) + pick(r, ['', 'n', 'r', 'l', 'm']) + pick(r, SUF));
  }
  const HANDLE_TAILS = ['irl', 'real', 'daily', 'maybe', 'online', 'hq', 'xo', 'tho'];

  /* ---------- profile text ---------- */
  const ROLES = ['Designer', 'Nurse', 'Teacher', 'Barista', 'Welder', 'Student', 'Night-shift worker', 'Plant parent', 'Amateur baker', 'Retired gamer', 'Dog person', 'Cat person', 'Sourdough survivor', 'Part-time philosopher', 'Full-time napper', 'Carpenter', 'Librarian', 'Mechanic', 'Illustrator', 'Developer', 'Chef', 'Cyclist', 'Gardener'];
  const LIKES = ['coffee', 'vinyl', 'hiking', 'bad puns', 'board games', 'thrifting', 'trains', 'tea', 'birdwatching', 'pixel art', 'synths', 'baking', 'road trips', 'film photography', 'houseplants', 'crosswords', 'long walks', 'cooking', 'retro games', 'sketching', 'thunderstorms', 'cheap noodles'];
  const TAILS = ['Opinions my own.', 'Here for the memes.', 'Not a morning person.', 'Ask me about my cat.', 'Probably napping.', 'Sleep is my hobby.', 'Mostly harmless.', 'Send snacks.', 'Currently tired.', 'Be kind.', 'Dad jokes on request.', 'Yes, I am online too much.'];

  /* ---------- post text ---------- */
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const FOODS = ['pasta', 'tacos', 'soup', 'pancakes', 'curry', 'toast', 'dumplings', 'a very large salad', 'leftover rice', 'grilled cheese', 'noodles', 'a questionable casserole', 'homemade pizza', 'cereal'];
  const DRINKS = ['coffee', 'tea', 'hot chocolate', 'sparkling water', 'iced coffee', 'a smoothie', 'ginger tea', 'oat milk latte'];
  const PETS = ['dog', 'cat', 'rabbit', 'parrot', 'goldfish', 'hamster', 'tortoise', 'cat (again)'];
  const WEATHER = ['rainy', 'sunny', 'foggy', 'windy', 'snowing', 'oddly warm', 'grey', 'perfectly cloudy'];
  const ADJ = ['surprisingly good', 'a little burnt', 'fine, honestly', 'better than expected', 'a disaster', 'actually great', 'suspiciously tasty', 'good enough'];
  const FEELINGS = ['Tired', 'Hopeful', 'Cozy', 'Confused', 'Content', 'Hungry', 'Sleepy', 'Fine', 'Restless', 'Peaceful'];
  const ACTIVITIES = ['a puzzle', 'a really long book', 'laundry', 'a new recipe', 'a sketch', 'a jigsaw', 'my taxes', 'a long run', 'the whole season', 'cleaning the fridge', 'repotting the plants', 'a 1000-piece puzzle'];
  const HABITS = ['stretching', 'journaling', 'drinking water', 'waking up early', 'learning guitar', 'no snacks', 'walking after dinner', 'reading before bed'];
  const THOUGHTS = [
    'a bookmark is just a tiny blanket for a page',
    'every stair is a tiny hill you conquered',
    'we all have a spoon drawer and no idea why',
    'socks are shoes for your shoes',
    'the best part of a sandwich is the first bite and the last bite',
    'nobody has ever finished a ball of yarn gracefully',
    'a pillow is just a hug you rent for the night',
    'microwaves make one sound and it is always too loud',
    'every kitchen has one cup everyone fights over',
    'umbrellas only break when it matters',
  ];
  const OPINIONS = [
    'soup is a drink with commitment issues',
    'the middle seat should come with armrest rights',
    'cereal is better when it is slightly soggy',
    'every house needs one chair that is only for clothes',
    'tomorrow is a great day to start things you will start next week',
    'pancakes are just flat cake and nobody should pretend otherwise',
    'rainy days are underrated',
    'a good nap beats a bad plan',
    'the last chip in the bag is the best chip',
    'leftovers taste better the next day, fight me gently',
  ];
  const TIMES = ['this morning', 'at 3am', 'on the way home', 'during lunch', 'before breakfast', 'last night', 'over the weekend', 'just now', 'twice today', 'for the third time this week'];
  const PLACES = ['the corner cafe', 'the library', 'the park', 'the laundromat', 'the farmers market', 'the bus stop', 'my balcony', 'the back garden', 'the used bookstore', 'the lake'];
  const OBJECTS = ['my favorite mug', 'a very good pen', 'the left sock', 'a tiny screwdriver', 'the good scissors', 'my reading glasses', 'a sturdy umbrella', 'the one comfy chair', 'a half-finished candle', 'the spare charger'];
  const SOUNDS = ['rain on the window', 'a distant train', 'the neighbor practicing trumpet', 'birds arguing', 'the fridge humming', 'a kettle about to boil', 'wind in the trees', 'someone laughing downstairs'];
  const COMPLAINTS = ['the wifi', 'my alarm', 'the printer', 'the group chat', 'the weather app', 'my left shoe', 'the bus schedule', 'this one stubborn jar lid'];
  const TOPICS = ['gardening', 'cooking', 'coffee', 'rainy days', 'puzzles', 'cats', 'dogs', 'sourdough', 'thrifting', 'houseplants', 'road trips', 'vinyl', 'pixel art', 'hiking', 'tea', 'naps', 'baking', 'sunsets', 'board games', 'retro games'];
  const TAGS = ['mood', 'cozy', 'food', 'sunday', 'plants', 'coffee', 'rain', 'weekend', 'nap', 'snacks', 'puzzle', 'monday'];
  const TEMPLATES = [
    r => `${pick(r, DAYS)}s are just ${pick(r, DAYS)}s with extra steps.`,
    r => `Made ${pick(r, FOODS)} for dinner and honestly? ${cap(pick(r, ADJ))}.`,
    r => `My ${pick(r, PETS)} just stared at me for ${2 + Math.floor(r() * 18)} minutes. I still don't know what I did.`,
    r => `Shower thought: ${pick(r, THOUGHTS)}.`,
    r => `Unpopular opinion: ${pick(r, OPINIONS)}.`,
    r => `Currently: ${pick(r, DRINKS)}, ${pick(r, WEATHER)} outside, zero plans.`,
    r => `Just finished ${pick(r, ACTIVITIES)}. ${pick(r, FEELINGS)}.`,
    r => `Day ${2 + Math.floor(r() * 120)} of ${pick(r, HABITS)}: still ${pick(r, ['going', 'trying', 'here', 'standing', 'somehow alive'])}.`,
    r => `${pick(r, FEELINGS)}. That's the whole post.`,
    r => `It's ${pick(r, WEATHER)} and I have decided to do nothing about it.`,
    r => `Does anyone else ${pick(r, ['put the milk in first', 'talk to their plants', 'rehearse conversations in the shower', 'keep 40 tabs open', 'save recipes they never cook', 'say thank you to the bus driver'])}? Asking for me.`,
    r => `Small win today: ${pick(r, ['found my keys on the first try', 'the printer worked', 'made it to the bus on time', 'a stranger held the door', 'my plant grew a new leaf', 'finished the whole cup of tea while it was still hot'])}.`,
    r => `Hot take: ${pick(r, OPINIONS)}. #${pick(r, TAGS)}`,
    r => `${cap(pick(r, DRINKS))} first. Then the world.`,
    r => `Reminder to drink some water and unclench your jaw.`,
    r => `Spent ${1 + Math.floor(r() * 4)} hours on ${pick(r, TOPICS)} today and zero regrets.`,
    r => `I would like a ${pick(r, ['quiet weekend', 'second breakfast', 'nap with no alarm', 'sunny window seat', 'plate of fries'])} please. That's it. That's the list.`,
    r => `Anyone have thoughts on ${pick(r, TOPICS)}? Looking for a new rabbit hole.`,
    r => `My ${pick(r, PETS)} knocked a cup off the table again. ${pick(r, ['No remorse.', 'Eye contact the whole time.', 'Fair play.', 'I admire the commitment.'])}`,
    r => `${pick(r, DAYS)} energy: ${pick(r, ['a blanket and no emails', 'soup', 'comfortable pants', 'the third snooze', 'staring out the window'])}.`,
    r => `Learned today that ${pick(r, ['bananas are berries', 'honey never spoils', 'octopuses have three hearts', 'a day on Venus is longer than its year', 'wombats make cube-shaped poop'])}. Information I did not need and will never forget.`,
    r => `Looking at the ${pick(r, WEATHER)} sky and feeling ${pick(r, FEELINGS).toLowerCase()}. #${pick(r, TAGS)}`,
    r => `Tried ${pick(r, TOPICS)} for the first time. ${cap(pick(r, ADJ))}.`,
    r => `${pick(r, FEELINGS)}, caffeinated, and ready to ${pick(r, ['pretend to be productive', 'reorganize one drawer', 'take a walk', 'water the plants', 'do one (1) chore'])}.`,
    r => `mood: ${pick(r, ['soup', 'blanket', 'nap', 'window seat', 'warm socks', 'playlist on shuffle'])}`,
    r => `Anyway, ${pick(r, TOPICS)} is good and you should try it.`,
    r => `The ${pick(r, ['bus', 'train', 'elevator', 'queue', 'waiting room'])} was ${pick(r, ['empty', 'full', 'silent', 'weirdly cheerful'])} today and I loved it.`,
    r => `Found ${pick(r, OBJECTS)} ${pick(r, TIMES)}. Today is a good day.`,
    r => `Spent ${pick(r, TIMES)} at ${pick(r, PLACES)} just listening to ${pick(r, SOUNDS)}.`,
    r => `Lost ${pick(r, OBJECTS)} again. Searching ${pick(r, PLACES)} ${pick(r, TIMES)}.`,
    r => `Not to be dramatic but ${pick(r, COMPLAINTS)} is testing me ${pick(r, TIMES)}.`,
    r => `Walked to ${pick(r, PLACES)} ${pick(r, TIMES)}. ${pick(r, ['Highly recommend.', 'Would walk again.', 'Ten out of ten.', 'Nobody else was there.', 'Slightly too windy.'])}`,
    r => `${cap(pick(r, SOUNDS))} is the soundtrack to my ${pick(r, DAYS)}.`,
    r => `Today I learned to ${pick(r, ['fold a fitted sheet', 'make decent rice', 'whistle properly', 'say no politely', 'sharpen a knife', 'rest without guilt', 'fix a wobbly table', 'bake bread without a recipe'])}. ${pick(r, ['Took long enough.', 'Feels like a superpower.', 'Never again.', 'Surprisingly satisfying.'])}`,
    r => `If ${pick(r, COMPLAINTS)} acts up ${pick(r, TIMES)} one more time I am moving to ${pick(r, ['the woods', 'a lighthouse', 'a cabin', 'another timezone'])}.`,
    r => `Rating ${pick(r, DRINKS)} ${pick(r, TIMES)}: ${1 + Math.floor(r() * 5)}/5. ${pick(r, ['Would sip again.', 'Needs more commitment.', 'Fine, honestly.', 'Unreasonably warm.'])}`,
    r => `${pick(r, DAYS)} update: ${pick(r, FOODS)}, ${pick(r, WEATHER)} sky, ${pick(r, FEELINGS).toLowerCase()} vibes.`,
    r => `The ${pick(r, PETS)} has claimed ${pick(r, OBJECTS)} and we do not speak of it.`,
    r => `${pick(r, FEELINGS)} about ${pick(r, TOPICS)}. Send recommendations.`,
    r => `Three things I love: ${pick(r, TOPICS)}, ${pick(r, DRINKS)}, and ${pick(r, SOUNDS)}.`,
    r => `Plans for ${pick(r, DAYS)}: ${pick(r, ['nothing', 'a very long nap', 'one errand', 'reading', 'cooking something ambitious', 'staring at clouds'])}. Wish me luck.`,
    r => `Confession: I ${pick(r, ['reread the same chapter', 'rewatch the same show', 'order the same meal', 'replay the same playlist', 'take the same walk'])} every ${pick(r, DAYS)}. No regrets.`,
    r => `Anyone else's ${pick(r, PETS)} ${pick(r, ['judge them silently', 'wake them up before the alarm', 'steal their seat the second they stand up', 'supervise every meal'])}?`,
    r => `Reminder: ${pick(r, ['you do not have to answer that message right now', 'drink some water', 'stretch your shoulders', 'a short walk counts', 'rest is productive', 'you can start again tomorrow', 'snacks are allowed'])}.`,
    r => `New favorite thing: ${pick(r, SOUNDS)} while I ${pick(r, ['drink ' + 'tea', 'fold laundry', 'water the plants', 'stare at the ceiling', 'do absolutely nothing'])}.`,
  ];

  /* ---------- people ---------- */
  function timing(seed, i) {
    const r = rng(seed, 't', i);
    const period = (2 + r() * 34) * HOUR;
    return { period, phase: r() * period };
  }

  function person(seed, i) {
    const r = rng(seed, 'p', i);
    const first = firstName(r), last = lastName(r);
    const f = first.toLowerCase(), l = last.toLowerCase();
    const variants = [f + l, f + '_' + l, f + (10 + Math.floor(r() * 90)), f + '_' + pick(r, HANDLE_TAILS), 'the' + f, f + l[0] + (1 + Math.floor(r() * 99))];
    const handle = pick(r, variants).slice(0, 15).replace(/[^a-z0-9_]/g, '');
    const h1 = Math.floor(r() * 360), h2 = (h1 + 30 + Math.floor(r() * 90)) % 360;
    const likes = [pick(r, LIKES), pick(r, LIKES)];
    const bio = `${pick(r, ROLES)}. Into ${likes[0]}${likes[1] !== likes[0] ? ' and ' + likes[1] : ''}. ${pick(r, TAILS)}`;
    const year = 2018 + Math.floor(r() * 8.7);
    const month = Math.floor(r() * (year === 2026 ? 9 : 12));
    return {
      id: `${seed}.${i}`, seed, index: i,
      name: `${first} ${last}`, handle, bio,
      color: `hsl(${h1} 62% 44%)`,
      banner: `linear-gradient(135deg, hsl(${h1} 60% 42%), hsl(${h2} 66% 52%))`,
      followers: Math.floor(Math.pow(10, 1 + r() * 3.6)),
      following: 30 + Math.floor(r() * 900),
      joined: new Date(Date.UTC(year, month, 1)).toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' }),
      baseline: 40 + Math.floor(r() * 2400),
    };
  }

  /* ---------- posts ---------- */
  function image(seed, i, m) {
    const r = rng(seed, 'img', i, m);
    const h1 = Math.floor(r() * 360), h2 = (h1 + 40 + Math.floor(r() * 80)) % 360;
    const sun = r() < 0.7 ? `<circle cx="${150 + Math.floor(r() * 500)}" cy="${90 + Math.floor(r() * 110)}" r="${30 + Math.floor(r() * 40)}" fill="hsl(${(h1 + 180) % 360} 85% 82%)" opacity=".9"/>` : '';
    const hill = (y, hue, o) => `<path d="M0 500 L0 ${y} Q ${200 + Math.floor(r() * 120)} ${y - 80 - Math.floor(r() * 60)} 400 ${y} T 800 ${y - 20} L800 500 Z" fill="hsl(${hue} 45% ${o}%)"/>`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${h1} 70% 62%)"/><stop offset="1" stop-color="hsl(${h2} 75% 78%)"/></linearGradient></defs><rect width="800" height="500" fill="url(#g)"/>${sun}${hill(330, h1, 38)}${hill(400, h2, 28)}</svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  const PREFIX = ['Honestly, ', 'Okay so ', 'Update: ', 'Quick one: ', 'Not sure why but ', 'Fun fact: ', 'Real talk: ', 'Small thing: '];
  const SUFFIX = [' Anyway.', ' That is all.', ' Thanks for coming to my talk.', ' Carry on.', ' Just saying.', ' Weird flex, but okay.', ' Make of that what you will.', ' Goodnight.', ' Have a nice one.', ' Back to it.'];
  function decorate(r, text) {
    const a = r(), b = r();
    if (a < 0.22 && !/^[a-z#]/.test(text) && !/^(I\b|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/.test(text)) text = pick(r, PREFIX) + text.charAt(0).toLowerCase() + text.slice(1);
    if (b < 0.3 && text.length < 110 && /[.!?]$/.test(text)) text += pick(r, SUFFIX);
    return text;
  }

  function post(seed, i, m) {
    const r = rng(seed, 'q', i, m);
    const { period, phase } = timing(seed, i);
    const likes = Math.floor(Math.pow(10, r() * 2.6));
    return {
      id: `g:${seed}.${i}.${m}`, seed, i, m,
      ts: Math.round(phase + m * period),
      text: decorate(r, pick(r, TEMPLATES)(r)),
      image: r() < 0.16 ? image(seed, i, m) : null,
      likes, reposts: Math.floor(likes * r() * 0.2), views: Math.floor(likes * (8 + r() * 40)),
    };
  }

  // Newest posts from the first POP accounts, merged by time. Pure function of (seed, now, count).
  function feed(seed, now, count) {
    let windowH = Math.max(2, (count * 1.6 * 19) / POP);
    for (let tries = 0; tries < 8; tries++) {
      const out = [];
      const since = now - windowH * HOUR;
      for (let i = 0; i < POP; i++) {
        const { period, phase } = timing(seed, i);
        for (let m = Math.floor((now - phase) / period); phase + m * period >= since; m--) out.push({ i, m, ts: Math.round(phase + m * period) });
      }
      if (out.length >= count || tries === 7) {
        out.sort((a, b) => b.ts - a.ts || a.i - b.i);
        return out.slice(0, count).map(p => post(seed, p.i, p.m));
      }
      windowH *= 2;
    }
    return [];
  }

  // One account's latest posts, newest first.
  function profilePosts(seed, i, now, count) {
    const { period, phase } = timing(seed, i);
    const m0 = Math.floor((now - phase) / period);
    return Array.from({ length: count }, (_, k) => post(seed, i, m0 - k));
  }

  /* ---------- the rest of the world ---------- */
  function suggestions(seed, now, n) {
    const day = Math.floor(now / (24 * HOUR));
    const r = rng(seed, 'who', day);
    const out = [];
    while (out.length < n) { const i = Math.floor(r() * POP); if (!out.includes(i)) out.push(i); }
    return out.map(i => person(seed, i));
  }
  function trending(seed, now, n) {
    const hour = Math.floor(now / HOUR);
    const r = rng(seed, 'trend', hour);
    const topics = [];
    while (topics.length < n) { const t = pick(r, TOPICS); if (!topics.includes(t)) topics.push(t); }
    return topics.map((t, k) => ({ topic: t, posts: Math.floor((n - k) * (800 + r() * 9000)), tag: k % 2 ? null : pick(r, TAGS) }));
  }
  const discover = () => Math.floor(Math.random() * WORLD);

  /* ---------- ids ---------- */
  function parsePostId(id) {
    const m = /^g:([\w-]{1,16})\.(\d+)\.(-?\d+)$/.exec(id || '');
    return m ? { seed: m[1], i: Number(m[2]), m: Number(m[3]) } : null;
  }
  function parsePersonRef(ref) {
    const m = /^([\w-]{1,16})\.(\d+)$/.exec(ref || '');
    return m ? { seed: m[1], i: Number(m[2]) } : null;
  }
  const newSeed = () => Array.from(crypto.getRandomValues(new Uint8Array(4)), b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  const cleanSeed = s => (s || '').trim().replace(/[^\w-]/g, '').slice(0, 16);

  return { POP, WORLD, person, post, feed, profilePosts, suggestions, trending, discover, parsePostId, parsePersonRef, newSeed, cleanSeed, rng, hash32 };
})();
if (typeof module !== 'undefined') module.exports = Ghost;
