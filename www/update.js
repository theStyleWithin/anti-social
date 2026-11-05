'use strict';
/* Updates: a Settings section. Nothing is contacted until the person taps "Check for updates" (or turns on the automatic check).
   Android and the desktop apps can download the new version and open its installer; anywhere else it links to the release page. */
const Upd = (() => {
  const U = UpdCore, lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } }, lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* private window */ } };
  const native = () => window.AntiSocialUpd || null;
  const hint = () => { const n = native(); return n && n.info ? n.info : { os: '' }; };
  const auto = () => lsGet('as.upd.auto') === '1';
  let state = { s: 'idle' }, last = null; // idle | checking | none | found | err | busy | done

  async function latest() {
    const r = await fetch(`https://api.github.com/repos/${U.REPO}/releases/latest`, { headers: { Accept: 'application/vnd.github+json' }, cache: 'no-store' });
    if (!r.ok) throw new Error(r.status === 403 || r.status === 429 ? 'GitHub is limiting requests right now. Try again in a little while.' : `GitHub answered ${r.status}.`);
    return U.parseRelease(await r.json(), hint());
  }
  async function check(quiet) {
    state = { s: 'checking' }; repaint();
    try { last = await latest(); lsSet('as.upd.at', String(Date.now())); state = last && last.newer ? { s: 'found' } : { s: 'none' }; }
    catch (e) { state = { s: 'err', msg: quiet ? '' : (e && e.message && !/fetch|network/i.test(e.message) ? e.message : 'Could not reach GitHub. Check your connection.') }; }
    repaint(); return state;
  }
  async function install() {
    const n = native(), a = last && last.asset; if (!n || !n.download || !a || !U.trustedUrl(a.url)) { window.open(last ? last.page : `https://github.com/${U.REPO}/releases/latest`, '_blank', 'noopener'); return; }
    state = { s: 'busy' }; repaint();
    try { const msg = await n.download(a.url, a.name, a.sha256); state = { s: 'done', msg: msg || 'Downloaded.' }; } catch (e) { state = { s: 'err', msg: (e && e.message) || 'The download did not work.' }; }
    repaint();
  }
  const repaint = () => { const el = document.querySelector('.upd'); if (el) el.replaceWith(body()); };
  function body() {
    const rel = last, a = rel && rel.asset, can = !!(native() && native().download && a);
    const kids = [h('p', { class: 'fine' }, `You have version ${U.APP_VERSION}.`)];
    if (state.s === 'checking') kids.push(h('p', {}, 'Checking GitHub…'));
    else if (state.s === 'busy') kids.push(h('p', {}, `Downloading ${rel.version}… this can take a minute.`));
    else if (state.s === 'none') kids.push(h('p', {}, 'You are up to date.'));
    else if (state.s === 'err' && state.msg) kids.push(h('p', { class: 'err', role: 'alert' }, state.msg));
    else if (state.s === 'done') kids.push(h('p', { role: 'status' }, state.msg));
    if (rel && rel.newer && state.s !== 'checking') {
      kids.push(h('p', {}, h('b', {}, `Version ${rel.version} is available.`)));
      if (rel.notes) kids.push(h('details', {}, h('summary', {}, 'What is new'), h('pre', { class: 'upd-notes' }, rel.notes)));
      kids.push(h('div', { class: 'btnrow' }, can && state.s !== 'done' ? h('button', { class: 'btn primary', type: 'button', disabled: state.s === 'busy', onclick: install }, `Download and install ${rel.version}`) : null, h('a', { class: 'btn', href: rel.page, target: '_blank', rel: 'noopener noreferrer' }, 'View the release')));
      if (can) kids.push(h('p', { class: 'fine' }, 'The new version takes over when you close this app and open it again.'));
    }
    if (!rel || state.s === 'idle' || state.s === 'none' || state.s === 'err') kids.push(h('div', { class: 'btnrow' }, h('button', { class: 'btn' + (rel && rel.newer ? '' : ' primary'), type: 'button', disabled: state.s === 'checking', onclick: () => check(false) }, 'Check for updates'), h('a', { class: 'btn', href: `https://github.com/${U.REPO}/releases`, target: '_blank', rel: 'noopener noreferrer' }, 'Open the releases page')));
    return h('div', { class: 'upd' }, kids);
  }
  function settingsSection() {
    return h('section', {}, h('h3', {}, 'Updates'),
      h('p', {}, 'New versions are published on GitHub. Checking contacts GitHub only when you ask (or if you turn on the automatic check below), and shares nothing from the app.'), body(),
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: auto(), onchange: e => { lsSet('as.upd.auto', e.target.checked ? '1' : '0'); } }), ' ', h('span', {}, 'Check automatically once a day when I open the app')));
  }
  // the optional automatic check: at most once a day, and it only says something when there is a new version
  function startup() {
    if (!auto()) return; const at = +lsGet('as.upd.at') || 0; if (Date.now() - at < 864e5) return;
    setTimeout(async () => { const s = await check(true); if (s.s === 'found' && last) toast(`Anti-Social ${last.version} is available. See Settings > Updates.`); }, 4000);
  }
  return { settingsSection, check, startup };
})();
if (typeof module !== 'undefined') module.exports = Upd;
