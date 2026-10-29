#include "screens.h"
#include "calc.h"
#include <algorithm>

namespace {
using namespace theme;
struct K { const char* label; const char* key; int span; };
const K kKeys[5][4] = {{{"C", "C", 1}, {"+/-", "+/-", 1}, {"%", "%", 1}, {"\xC3\xB7", "/", 1}},
                       {{"7", "7", 1}, {"8", "8", 1}, {"9", "9", 1}, {"\xC3\x97", "*", 1}},
                       {{"4", "4", 1}, {"5", "5", 1}, {"6", "6", 1}, {"\xE2\x88\x92", "-", 1}},
                       {{"1", "1", 1}, {"2", "2", 1}, {"3", "3", 1}, {"+", "+", 1}},
                       {{"0", "0", 2}, {"", "", 0}, {".", ".", 1}, {"=", "=", 1}}};
enum { ID_BACK = 1, ID_DEL = 2, ID_KEY = 100 };
class Calculator : public Screen {
  CalcEngine calc; int r = 1, c = 0; Hits hits; std::vector<std::string> tape;
  static int startCol(int row, int idx) { int col = 0; for (int i = 0; i < idx; i++) col += kKeys[row][i].span; return col; }
  static int idxFor(int row, int col) { int x = 0; for (int i = 0; i < 4; i++) { if (kKeys[row][i].span == 0) continue; if (col < x + kKeys[row][i].span) return i; x += kKeys[row][i].span; } return 3; }
  void press(const std::string& k) {
    std::string before = calc.pending() + " " + calc.entry; bool eq = k == "="; double was = 0; (void)was;
    calc.press(k);
    if (eq && calc.error.empty() && before.size() > 2 && before[0] != ' ') { tape.push_back(before + " = " + calc.entry); if (tape.size() > 12) tape.erase(tape.begin()); }
  }
  void drawKeys(gfx::Fb& fb, Rect a, int screenIdx) {
    int gap = 3, kw = (a.w - 5 * gap) / 4, kh = std::min(40, (a.h - 6 * gap) / 5), x0 = a.x + (a.w - (kw * 4 + gap * 3)) / 2, y0 = a.y + (a.h - (kh * 5 + gap * 4)) / 2;
    for (int row = 0; row < 5; row++) { int col = 0; for (int i = 0; i < 4; i++) { const K& k = kKeys[row][i]; if (!k.span) continue;
      Rect kr(x0 + col * (kw + gap), y0 + row * (kh + gap), k.span * kw + (k.span - 1) * gap, kh); bool on = row == r && i == c; bool op = i == 3 || (row == 0 && i < 3);
      drawButton(fb, kr, k.label, on, op ? accentDim : panel); hits.add(screenIdx, kr, ID_KEY + row * 4 + i); col += k.span; } }
  }
  void drawDisplay(gfx::Fb& fb, Rect a, bool withTape) {
    drawPanel(fb, a); gfx::text(fb, a.x + 10, a.y + 6, calc.pending(), muted);
    std::string d = calc.display(); int scale = gfx::textWidth(d, 3) <= a.w - 24 && a.h >= 90 ? 3 : gfx::textWidth(d, 2) <= a.w - 24 ? 2 : 1;
    gfx::textRight(fb, a.x + a.w - 12, a.y + a.h - 16 * scale - 8, d, calc.error.empty() ? text : bad, scale);
    if (withTape) { Rect t(a.x, a.y + a.h + 6, a.w, 0); (void)t; }
  }
 public:
  Calculator(Env&) {}
  std::string title() const override { return "Calculator"; }
  std::string hint() const override { return "A Press  X Equals  B Delete digit  Y Clear  START Back"; }
  void update(const Input& in, Env&, double) override {
    int id = hits.tapped(in);
    if (id == ID_BACK || in.pressed[B_START]) { done = true; return; }
    if (id == ID_DEL) { press("<"); return; }
    if (id >= ID_KEY) { int row = (id - ID_KEY) / 4, i = (id - ID_KEY) % 4; r = row; c = i; press(kKeys[row][i].key); }
    int col = startCol(r, c);
    if (in.repeat[B_LEFT]) col = (col + 3) % 4; if (in.repeat[B_RIGHT]) col = (col + 1) % 4;
    if (in.pressed[B_UP]) r = (r + 4) % 5; if (in.pressed[B_DOWN]) r = (r + 1) % 5;
    c = idxFor(r, col);
    if (in.pressed[B_A]) press(kKeys[r][c].key);
    if (in.repeat[B_B]) press("<"); if (in.pressed[B_Y]) press("C"); if (in.pressed[B_X]) press("=");
  }
  void draw(gfx::Fb& fb, Env& env) override {
    hits.clear(); drawHeader(fb, "Calculator", ""); Rect c0 = contentArea(fb);
    if (env.dual) {
      drawDisplay(fb, Rect(10, c0.y + 8, fb.w - 20, 70), false);
      int y = c0.y + 90; gfx::text(fb, 12, y, "Tape", muted); y += 20;
      for (size_t i = tape.size(); i-- > 0 && y < fb.h - barHeight(fb) - 16;) { gfx::textRight(fb, fb.w - 14, y, gfx::fit(tape[i], fb.w - 28), text); y += 17; }
      if (tape.empty()) gfx::textRight(fb, fb.w - 14, y, "Finished sums show up here.", muted);
    } else {
      int dh = std::min(80, c0.h * 28 / 100); drawDisplay(fb, Rect(10, c0.y + 6, fb.w - 20, dh), false); drawKeys(fb, Rect(0, c0.y + dh + 12, fb.w, c0.h - dh - 14), 0);
    }
    drawFooter(fb, hint());
  }
  void drawSub(gfx::Fb& fb, Env&) override {
    gfx::clear(fb, bg); drawHeader(fb, "Keypad", ""); Rect c = contentArea(fb, false);
    drawKeys(fb, Rect(c.x, c.y + 4, c.w, c.h - 48), 1);
    int by = fb.h - 38; drawButton(fb, Rect(8, by, 90, 32), "Back"); hits.add(1, Rect(8, by, 90, 32), ID_BACK);
    drawButton(fb, Rect(fb.w - 98, by, 90, 32), "Delete"); hits.add(1, Rect(fb.w - 98, by, 90, 32), ID_DEL);
  }
};
}  // namespace
Screen* makeCalculator(Env& env) { return new Calculator(env); }
