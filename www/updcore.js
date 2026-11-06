'use strict';
/* Updates: pure logic (no network, no page). Compares versions and picks the right download from a GitHub release. */
const UpdCore = (() => {
  const APP_VERSION = '0.27.2', REPO = 'theStyleWithin/anti-social';
  const nums = v => String(v || '').replace(/^v/i, '').split(/[.\-+]/).slice(0, 3).map(n => parseInt(n, 10) || 0);
  const compare = (a, b) => { const x = nums(a), y = nums(b); for (let i = 0; i < 3; i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d < 0 ? -1 : 1; } return 0; };
  // hint: {os: 'android'|'windows'|'linux'|'mac'|'', portable, appimage}
  function pickAsset(assets, hint) {
    const a = (assets || []).filter(x => x && x.name && x.browser_download_url), has = (re) => a.find(x => re.test(x.name));
    const os = hint && hint.os;
    if (os === 'android') return has(/-android\.apk$/i) || null;
    if (os === 'windows') return (hint.portable ? has(/-portable\.exe$/i) : has(/^Anti-Social-Setup-.*\.exe$/i)) || has(/\.exe$/i) || null;
    if (os === 'linux') return (hint.appimage ? has(/\.AppImage$/i) : has(/\.deb$/i)) || has(/\.AppImage$/i) || null;
    return null;
  }
  // what the page needs from the GitHub "latest release" answer
  function parseRelease(r, hint, current = APP_VERSION) {
    if (!r || !r.tag_name) return null;
    const asset = pickAsset(r.assets, hint), digest = asset && /^sha256:([0-9a-f]{64})$/i.test(asset.digest || '') ? asset.digest.slice(7).toLowerCase() : '';
    return { version: String(r.tag_name).replace(/^v/i, ''), newer: compare(current, r.tag_name) < 0, notes: String(r.body || '').slice(0, 4000), page: r.html_url || `https://github.com/${REPO}/releases/latest`, asset: asset ? { name: asset.name, url: asset.browser_download_url, size: asset.size || 0, sha256: digest } : null };
  }
  // downloads are only ever taken from this project's own release files
  const trustedUrl = u => { try { const x = new URL(u); return x.protocol === 'https:' && x.hostname === 'github.com' && x.pathname.startsWith(`/${REPO}/releases/download/`); } catch { return false; } };
  return { APP_VERSION, REPO, compare, pickAsset, parseRelease, trustedUrl };
})();
if (typeof module !== 'undefined') module.exports = UpdCore;
