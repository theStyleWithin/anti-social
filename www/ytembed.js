'use strict';
/* YouTube links in posts: a card you can play right in the timeline. Nothing is contacted until you say so: the first time, you are asked,
   because a video (and its picture) load from YouTube's servers. It uses YouTube's privacy-enhanced player (youtube-nocookie.com).
   Whatever ads the video carries come from YouTube inside its own player, and this app does not try to block or change them. */
const YT = (() => {
  const HOSTS = /^(?:www\.|m\.|music\.)?(?:youtube\.com|youtube-nocookie\.com)$/i, ID = /^[\w-]{11}$/;
  const secs = s => { if (!s) return 0; if (/^\d+$/.test(s)) return +s; const m = String(s).match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i); return m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0; };
  // the video in a link, or null
  function parse(url) {
    let u; try { u = new URL(url); } catch { return null; } let id = '';
    if (/^(?:www\.)?youtu\.be$/i.test(u.hostname)) id = u.pathname.slice(1).split('/')[0];
    else if (HOSTS.test(u.hostname)) { if (u.pathname === '/watch') id = u.searchParams.get('v') || ''; else { const m = u.pathname.match(/^\/(?:shorts|live|embed|v)\/([\w-]{11})/); if (m) id = m[1]; } }
    if (!ID.test(id)) return null; return { id, start: secs(u.searchParams.get('t') || u.searchParams.get('start')), url: `https://www.youtube.com/watch?v=${id}`, short: /\/shorts\//.test(u.pathname) };
  }
  const links = text => [...new Set(String(text || '').match(/https?:\/\/[^\s]+/g) || [])].map(u => u.replace(/[).,;!?]+$/, '')).map(parse).filter(Boolean).filter((v, i, a) => a.findIndex(x => x.id === v.id) === i).slice(0, 3);
  const mode = () => { try { const m = localStorage.getItem('as.yt'); return m === 'always' || m === 'never' ? m : 'ask'; } catch { return 'ask'; } };
  const setMode = m => { try { localStorage.setItem('as.yt', m); } catch { /* not remembered */ } };
  // the privacy-enhanced player first; "Try the standard player" switches to youtube.com if that one will not play where you are
const embedUrl = (v, std) => `https://www.youtube${std ? '' : '-nocookie'}.com/embed/${v.id}?autoplay=1&rel=0&modestbranding=1&playsinline=1&origin=${encodeURIComponent(ORIGIN)}${v.start ? '&start=' + v.start : ''}`;
  const ORIGIN = /^https?:/.test(location.origin) ? location.origin : 'https://anti-social.app';
  let playing = null;   // only one video plays at a time
  function consent() {
    return new Promise(res => { const close = modal(h('div', {}, h('div', { class: 'mh' }, h('button', { class: 'back', 'aria-label': 'Close', onclick: () => { close(); res(false); } }, icon('x')), h('b', {}, 'Play videos here?')),
      h('div', { class: 'mp-pad' }, h('p', {}, 'Anti-Social is offline by default. To play a YouTube video in the timeline it has to connect to YouTube, which then sees your internet address and that you opened the video. Nothing else from the app is sent.'), h('p', { class: 'fine' }, 'It uses YouTube\'s privacy-enhanced player. Ads that come with a video are part of YouTube\'s own player and are not changed by this app. You can switch this off in Settings, or just use "Open on YouTube".'),
        h('div', { class: 'btnrow' }, h('button', { class: 'btn primary', onclick: () => { setMode('always'); close(); res(true); } }, 'Always play here'), h('button', { class: 'btn', onclick: () => { close(); res(true); } }, 'Just this time'), h('button', { class: 'btn', onclick: () => { close(); res(false); } }, 'Not now'))))); });
  }
  function card(v) {
    const box = h('div', { class: 'yt', 'data-id': v.id }); let loaded = false;
    const open = h('a', { class: 'yt-open', href: v.url, target: '_blank', rel: 'noopener noreferrer' }, 'Open on YouTube');
    const placeholder = (thumb) => { box.replaceChildren(h('button', { class: 'yt-card' + (v.short ? ' short' : ''), type: 'button', 'aria-label': 'Play the YouTube video here', onclick: play },
      thumb ? h('img', { src: `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer', onerror: e => { e.target.remove(); } }) : null,
      h('span', { class: 'yt-play' }, icon('play')), h('span', { class: 'yt-tag' }, thumb ? 'YouTube' : 'YouTube video · tap to play here')), h('div', { class: 'yt-bar' }, open)); };
    async function play(e, std) {
      if (e) e.stopPropagation(); if (mode() === 'never') { window.open(v.url, '_blank', 'noopener'); return; }
      if (mode() === 'ask' && !(await consent())) return;
      if (playing && playing !== box) playing.__stop(); playing = box;
      const frame = h('iframe', { src: embedUrl(v, std), title: 'YouTube video', allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen', allowfullscreen: 'true', referrerpolicy: 'strict-origin-when-cross-origin', loading: 'eager' });
      box.replaceChildren(h('div', { class: 'yt-player' + (v.short ? ' short' : '') }, frame), h('div', { class: 'yt-bar' }, h('button', { class: 'btn', type: 'button', onclick: ev => { ev.stopPropagation(); box.__stop(); } }, 'Close video'), h('span', { class: 'yt-help' }, std ? 'Not playing? ' : 'Not playing? ', std ? null : h('button', { class: 'yt-link', type: 'button', onclick: ev => { ev.stopPropagation(); loaded = false; play(null, true); } }, 'Try the standard player'), std ? null : ' or ', open))); loaded = true;
    }
    box.__stop = () => { if (!loaded) return; loaded = false; if (playing === box) playing = null; placeholder(mode() === 'always'); };
    placeholder(mode() === 'always'); box.addEventListener('click', e => e.stopPropagation()); return box;
  }
  const cards = text => { const vs = links(text); return vs.length ? h('div', { class: 'yt-list' }, vs.map(card)) : null; };
  function settingsSection() {
    const m = mode(), opt = (v, label, tip) => h('label', { class: 'check' }, h('input', { type: 'radio', name: 'ytmode', checked: m === v, onchange: () => { setMode(v); render(true); } }), ' ', h('span', {}, label, h('small', { class: 'muted', style: 'display:block' }, tip)));
    return h('section', {}, h('h3', {}, 'YouTube links'), h('p', {}, 'Posts with a YouTube link show a card that plays the video right in the timeline.'),
      h('div', { class: 'pu-opts' }, opt('ask', 'Ask me first', 'Nothing is contacted until you tap play and agree.'), opt('always', 'Always show previews and play here', 'Shows the video picture from YouTube and plays on a tap. YouTube sees your internet address.'), opt('never', 'Never, just show the link', 'Stays fully offline. Tapping opens YouTube in your browser.')));
  }
  return { parse, links, card, cards, settingsSection, mode };
})();
if (typeof module !== 'undefined') module.exports = YT;
