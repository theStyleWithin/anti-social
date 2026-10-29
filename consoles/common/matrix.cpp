#include "screens.h"
#include <stdlib.h>
#include <math.h>
#include <algorithm>

namespace {
using namespace theme;
const gfx::Color kInk[] = {gfx::rgba(61, 255, 114), gfx::rgba(53, 224, 255), gfx::rgba(255, 74, 74), gfx::rgba(255, 176, 0), gfx::rgba(232, 232, 232), gfx::rgba(181, 123, 255)};
const char* kInkName[] = {"Green", "Cyan", "Red", "Amber", "White", "Purple"};
enum { ID_INK = 10, ID_FASTER = 20, ID_SLOWER = 21, ID_PAUSE = 22, ID_BACK = 99 };
class Matrix : public Screen {
  struct Cell { char ch; float b; bool head; };
  struct Col { std::vector<Cell> cells; float y, speed; };
  std::vector<Col> cols; int rows = 0, ink = 0; float speed = 1; bool paused = false; double info = 0; unsigned seed = 12345; Hits hits; bool overlayHint = true;
  unsigned rnd() { seed = seed * 1664525u + 1013904223u; return seed >> 8; }
  float frand() { return (rnd() % 10000) / 10000.0f; }
  void reset(Col& c, bool first) { c.y = first ? -frand() * rows * 1.5f : -frand() * 4; c.speed = 5 + frand() * 9; }
  void ensure(int w, int h) { int n = w / 8, r = h / 16 + 1; if ((int)cols.size() == n && rows == r) return; rows = r; cols.assign(n, Col()); for (auto& c : cols) { c.cells.assign(rows, Cell{'0', 0, false}); for (auto& k : c.cells) k.ch = '0' + rnd() % 2; reset(c, true); } }
  void act(int id) {
    if (id == ID_INK) ink = (ink + 1) % 6; else if (id >= ID_INK && id < ID_INK + 6) ink = id - ID_INK;
    else if (id == ID_FASTER) speed = std::min(3.0f, speed + 0.2f); else if (id == ID_SLOWER) speed = std::max(0.2f, speed - 0.2f); else if (id == ID_PAUSE) paused = !paused;
    info = 1.5;
  }
 public:
  Matrix(Env& env) { seed ^= (unsigned)(env.now * 1000) + (unsigned)env.epoch; }
  std::string title() const override { return "Matrix Viewer"; }
  std::string hint() const override { return "A Colour  Up/Down Speed  X Pause  B Back"; }
  void update(const Input& in, Env&, double dt) override {
    int id = hits.tapped(in); if (id == ID_BACK || in.pressed[B_B]) { done = true; return; } if (id >= 0) act(id);
    if (in.pressed[B_A]) act(ID_INK); if (in.repeat[B_UP]) act(ID_FASTER); if (in.repeat[B_DOWN]) act(ID_SLOWER); if (in.pressed[B_X]) act(ID_PAUSE);
    if (in.tap && in.tapScreen == 0 && id < 0) act(ID_INK);
    if (info > 0) info -= dt;
    if (paused || cols.empty()) return;
    for (auto& c : cols) {
      for (auto& k : c.cells) { if (k.b > 0) { k.b -= (float)dt / 1.8f; if (k.b < 0) k.b = 0; if (k.b > 0.1f && frand() < dt * 0.25) k.ch = '0' + rnd() % 2; } }
      float from = c.y; c.y += c.speed * speed * (float)dt;
      for (int r = (int)floorf(from) + 1; r <= (int)floorf(c.y); r++) if (r >= 0 && r < rows) { c.cells[r].ch = '0' + rnd() % 2; c.cells[r].b = 1; if (r > 0) c.cells[r - 1].head = false; c.cells[r].head = true; }
      if (c.y - 1 > rows) reset(c, false);
    }
  }
  void draw(gfx::Fb& fb, Env& env) override {
    hits.clear(); ensure(fb.w, fb.h); gfx::clear(fb, gfx::rgba(0, 0, 0)); gfx::Color base = kInk[ink];
    for (size_t x = 0; x < cols.size(); x++) for (int r = 0; r < rows; r++) { const Cell& k = cols[x].cells[r]; if (k.b < 0.03f) continue;
      gfx::Color c = k.head && k.b > 0.96f ? gfx::mix(base, gfx::rgba(255, 255, 255), 180) : gfx::mix(gfx::rgba(0, 0, 0), base, (int)(40 + k.b * 215));
      gfx::text(fb, (int)x * 8, r * 16, std::string(1, k.ch), c); }
    if (info > 0 || !env.dual) { std::string s = std::string(kInkName[ink]) + "  speed " + std::to_string((int)(speed * 10) / 10) + "." + std::to_string((int)(speed * 10) % 10) + (paused ? "  paused" : "") + (env.dual ? "" : "   (tap: colour)"); gfx::rrect(fb, 6, fb.h - 22, (int)s.size() * 8 + 12, 18, 5, gfx::rgba(0, 0, 0, 200)); gfx::text(fb, 12, fb.h - 21, s, kInk[ink]); }
  }
  void drawSub(gfx::Fb& fb, Env&) override {
    gfx::clear(fb, bg); drawHeader(fb, "Matrix Viewer", ""); Rect c = contentArea(fb, false);
    int sw = (c.w - 8 - 5 * 4) / 6; for (int i = 0; i < 6; i++) { Rect r(c.x + 4 + i * (sw + 4), c.y + 6, sw, 40); gfx::rrect(fb, r.x, r.y, r.w, r.h, 6, kInk[i]); if (i == ink) gfx::rframe(fb, r.x - 1, r.y - 1, r.w + 2, r.h + 2, 7, text); hits.add(1, r, ID_INK + i); }
    gfx::textCenter(fb, fb.w / 2, c.y + 56, kInkName[ink], muted);
    int bw = (c.w - 8 - 8) / 3; drawButton(fb, Rect(c.x + 4, c.y + 84, bw, 40), "Slower"); hits.add(1, Rect(c.x + 4, c.y + 84, bw, 40), ID_SLOWER);
    drawButton(fb, Rect(c.x + 8 + bw, c.y + 84, bw, 40), paused ? "Play" : "Pause", paused); hits.add(1, Rect(c.x + 8 + bw, c.y + 84, bw, 40), ID_PAUSE);
    drawButton(fb, Rect(c.x + 12 + 2 * bw, c.y + 84, bw, 40), "Faster"); hits.add(1, Rect(c.x + 12 + 2 * bw, c.y + 84, bw, 40), ID_FASTER);
    gfx::textCenter(fb, fb.w / 2, c.y + 134, "Just something to look at.", muted);
    int by = fb.h - 38; drawButton(fb, Rect(8, by, 90, 32), "Back"); hits.add(1, Rect(8, by, 90, 32), ID_BACK);
  }
};
}  // namespace
Screen* makeMatrix(Env& env) { return new Matrix(env); }
