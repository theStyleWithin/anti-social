#include "editor.h"
#include <algorithm>
#include <math.h>

namespace {
using namespace theme;
struct Key { std::string label; char ch; int span; int kind; };   // kind: 0 char, 1 shift, 2 space, 3 backspace, 4 enter, 5 done
std::vector<std::vector<Key>> layout() {
  std::vector<std::vector<Key>> rows;
  for (const char* r : {"1234567890", "qwertyuiop", "asdfghjkl'", "zxcvbnm,.?"}) { std::vector<Key> row; for (const char* p = r; *p; p++) row.push_back({std::string(1, *p), *p, 1, 0}); rows.push_back(row); }
  rows.push_back({{"\xE2\x87\xA7", 0, 2, 1}, {"space", ' ', 3, 2}, {"Del", 0, 1, 3}, {"Enter", '\n', 2, 4}, {"Done", 0, 2, 5}});
  return rows;
}
char shifted(char c) { if (c >= 'a' && c <= 'z') return (char)(c - 32); switch (c) { case '1': return '!'; case '2': return '@'; case '3': return '#'; case '4': return '$'; case '5': return '%'; case '6': return '^'; case '7': return '&'; case '8': return '*'; case '9': return '('; case '0': return ')'; case '\'': return '"'; case ',': return ';'; case '.': return ':'; case '?': return '/'; } return c; }
enum { ID_CANCEL = 2, ID_SAVE = 3, ID_KEY = 1000 };

class Editor : public Screen {
  std::string ttl, buf; size_t cur; bool shift = false, navMode = false, finished = false; int kr = 1, kc = 0; double blink = 0; size_t maxLen; double toastT = 0; std::string toast; int per = 48;
  std::function<void(const std::string&, bool)> cb; std::vector<std::vector<Key>> keys = layout(); Hits hits;
  int colOf(int r, int idx) const { int c = 0; for (int i = 0; i < idx; i++) c += keys[r][i].span; return c; }
  int idxAt(int r, int col) const { int c = 0; for (size_t i = 0; i < keys[r].size(); i++) { c += keys[r][i].span; if (col < c) return (int)i; } return (int)keys[r].size() - 1; }
  void finish(bool save) { if (finished) return; finished = true; cb(buf, save); done = true; }
  void insert(const std::string& s) { if (buf.size() + s.size() > maxLen) { toast = "That is the length limit."; toastT = 1.5; return; } buf.insert(cur, s); cur += s.size(); }
  void backspace() { if (cur == 0) return; size_t n = 1; while (cur - n > 0 && ((unsigned char)buf[cur - n] & 0xC0) == 0x80) n++; buf.erase(cur - n, n); cur -= n; }
  void press(const Key& k) {
    switch (k.kind) {
      case 0: { char c = shift ? shifted(k.ch) : k.ch; insert(std::string(1, c)); shift = false; break; }
      case 1: shift = !shift; break; case 2: insert(" "); break; case 3: backspace(); break; case 4: insert("\n"); break; case 5: finish(true); break;
    }
  }
  // The text is wrapped by characters (every glyph is 8 pixels wide). starts[] holds where each shown line begins.
  std::vector<size_t> starts() const {
    std::vector<size_t> s(1, 0); int lc = 0;
    for (size_t q = 0; q < buf.size(); q++) { if (buf[q] == '\n') { s.push_back(q + 1); lc = 0; continue; } if (lc >= per) { s.push_back(q); lc = 0; } lc++; }
    return s;
  }
  void layoutText(std::vector<std::string>& lines, int& cl, int& cc) const {
    std::vector<size_t> s = starts(); lines.clear(); cl = 0;
    for (size_t i = 0; i < s.size(); i++) { size_t e = i + 1 < s.size() ? s[i + 1] : buf.size(); std::string l = buf.substr(s[i], e - s[i]); if (!l.empty() && l.back() == '\n') l.pop_back(); lines.push_back(l); if (s[i] <= cur) cl = (int)i; }
    cc = (int)(cur - s[cl]);
  }
  void moveLine(int d) {
    std::vector<size_t> s = starts(); int cl = 0; for (size_t i = 0; i < s.size(); i++) if (s[i] <= cur) cl = (int)i; int cc = (int)(cur - s[cl]);
    int tl = cl + d; if (tl < 0 || tl >= (int)s.size()) return;
    size_t e = tl + 1 < (int)s.size() ? s[tl + 1] : buf.size() + 1, len = e - s[tl]; if (tl + 1 < (int)s.size() && buf[e - 1] == '\n') len--;
    cur = std::min(s[tl] + std::min<size_t>((size_t)cc, len), buf.size());
  }
  void drawOsk(gfx::Fb& fb, Rect a, int screenIdx) {
    int kw = std::max(14, a.w / 10), kh = std::max(14, std::min(a.h / 5 - 2, 40)), x0 = a.x + (a.w - kw * 10) / 2, y0 = a.y + (a.h - 5 * (kh + 2)) / 2;
    for (int r = 0; r < (int)keys.size(); r++) { int col = 0; for (int i = 0; i < (int)keys[r].size(); i++) {
      const Key& k = keys[r][i]; Rect kr_(x0 + col * kw, y0 + r * (kh + 2), k.span * kw - 3, kh); bool on = !navMode && r == kr && i == kc; bool active = k.kind == 1 && shift;
      std::string lab = k.kind == 0 ? std::string(1, shift ? shifted(k.ch) : k.ch) : k.label;
      drawButton(fb, kr_, lab, on, active ? accentDim : panel); hits.add(screenIdx, kr_, ID_KEY + r * 100 + i); col += k.span; } }
  }
  void drawText(gfx::Fb& fb, Rect a, Env&) {
    gfx::rect(fb, a.x, a.y, a.w, a.h, panel); per = std::max(8, (a.w - 8) / 8);
    std::vector<std::string> lines; int cl, cc; layoutText(lines, cl, cc);
    int rows = std::max(1, (a.h - 20) / 16), first = std::max(0, std::min(cl - rows + 1, (int)lines.size() - rows)); if (cl < first) first = cl; if (cl >= first + rows) first = cl - rows + 1;
    for (int i = 0; i < rows && first + i < (int)lines.size(); i++) gfx::text(fb, a.x + 4, a.y + 3 + i * 16, lines[first + i], text);
    if (fmod(blink, 1.0) < 0.6) gfx::rect(fb, a.x + 4 + cc * 8, a.y + 3 + (cl - first) * 16, 2, 15, accent);
    gfx::text(fb, a.x + 4, a.y + a.h - 17, std::to_string(buf.size()) + (buf.size() == 1 ? " character" : " characters") + (navMode ? "  (cursor mode)" : shift ? "  (shift)" : ""), muted);
  }
  void drawActionButtons(gfx::Fb& fb, Rect r, int screenIdx) { Rect c(r.x + 4, r.y + 3, 80, r.h - 6), s(r.x + r.w - 84, r.y + 3, 80, r.h - 6); drawButton(fb, c, "Cancel"); drawButton(fb, s, "Save", false, accentDim); hits.add(screenIdx, c, ID_CANCEL); hits.add(screenIdx, s, ID_SAVE); }
 public:
  Editor(const std::string& t, const std::string& init, std::function<void(const std::string&, bool)> c, size_t m) : ttl(t), buf(init), cur(init.size()), maxLen(m), cb(c) {}
  std::string title() const override { return ttl; }
  std::string hint() const override { return navMode ? "D-pad Move cursor  Y Keyboard  START Save  SELECT Cancel" : "A Type  B Delete  X Space  Y Shift  L/R Move  START Save"; }
  void update(const Input& in, Env&, double dt) override {
    blink += dt; if (toastT > 0) toastT -= dt;
    int id = hits.tapped(in);
    if (id == ID_CANCEL) { finish(false); return; }
    if (id == ID_SAVE) { finish(true); return; }
    if (id >= ID_KEY) { int r = (id - ID_KEY) / 100, i = (id - ID_KEY) % 100; if (r < (int)keys.size() && i < (int)keys[r].size()) { kr = r; kc = i; navMode = false; press(keys[r][i]); } }
    if (in.pressed[B_START]) { finish(true); return; }
    if (in.pressed[B_SELECT]) { finish(false); return; }
    if (in.pressed[B_Y] && !navMode) shift = !shift;
    if (in.repeat[B_L]) { if (cur > 0) { cur--; while (cur > 0 && ((unsigned char)buf[cur] & 0xC0) == 0x80) cur--; } }
    if (in.repeat[B_R]) { if (cur < buf.size()) { cur++; while (cur < buf.size() && ((unsigned char)buf[cur] & 0xC0) == 0x80) cur++; } }
    if (in.pressed[B_X] && !navMode) insert(" ");
    if (in.repeat[B_B]) backspace();
    if (navMode) { if (in.repeat[B_LEFT] && cur > 0) cur--; if (in.repeat[B_RIGHT] && cur < buf.size()) cur++; if (in.pressed[B_UP]) moveLine(-1); if (in.pressed[B_DOWN]) moveLine(1); }
    else {
      int col = colOf(kr, kc);
      if (in.repeat[B_LEFT]) kc = (kc + (int)keys[kr].size() - 1) % (int)keys[kr].size();
      if (in.repeat[B_RIGHT]) kc = (kc + 1) % (int)keys[kr].size();
      if (in.pressed[B_UP]) { kr = (kr + (int)keys.size() - 1) % (int)keys.size(); kc = idxAt(kr, col); }
      if (in.pressed[B_DOWN]) { kr = (kr + 1) % (int)keys.size(); kc = idxAt(kr, col); }
    }
    if (in.pressed[B_A] && !navMode) press(keys[kr][kc]);
  }
  void draw(gfx::Fb& fb, Env& env) override {
    hits.clear(); drawHeader(fb, ttl, ""); Rect c = contentArea(fb);
    if (env.dual) drawText(fb, c, env);
    else {
      int oskH = std::min(c.h * 55 / 100, 5 * 40 + 12); Rect t(c.x, c.y, c.w, c.h - oskH), k(c.x, c.y + c.h - oskH, c.w, oskH);
      drawText(fb, Rect(t.x, t.y + 26, t.w, t.h - 26), env); drawActionButtons(fb, Rect(t.x, t.y, t.w, 26), 0); drawOsk(fb, k, 0);
    }
    drawFooter(fb, hint()); if (toastT > 0) drawToast(fb, toast);
  }
  void drawSub(gfx::Fb& fb, Env&) override {
    gfx::clear(fb, bg); drawHeader(fb, "Keyboard", ""); Rect c = contentArea(fb, false);
    drawActionButtons(fb, Rect(c.x, c.y, c.w, 30), 1); drawOsk(fb, Rect(c.x, c.y + 32, c.w, c.h - 34), 1);
  }
};
}  // namespace

Screen* makeEditor(const std::string& title, const std::string& initial, std::function<void(const std::string&, bool)> onDone, size_t maxLen) { return new Editor(title, initial, onDone, maxLen); }
