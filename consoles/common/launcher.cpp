// The home screen. One screen (Switch): the app grid. Two screens (3DS, Wii U): info on top, the touchable grid on the touch screen.
#include "screens.h"
#include "store.h"
#include <stdio.h>
#include <algorithm>

namespace {
using namespace theme;
struct Entry { const char* name; const char* glyph; const char* blurb; Screen* (*make)(Env&); gfx::Color tint; };
const Entry kApps[] = {
  {"Timeline", "\xE2\x97\x86", "Post things. Nobody will see them.", makeTimeline, gfx::rgba(139, 92, 246)},
  {"Notes", "\xE2\x99\xAA", "Write anything down, any length.", makeNotes, gfx::rgba(52, 211, 153)},
  {"Calculator", "=", "Add things up. The tape is kept.", makeCalculator, gfx::rgba(56, 189, 248)},
  {"Clock", "\xE2\x97\x8F", "Clock, stopwatch and timer.", makeClock, gfx::rgba(251, 191, 36)},
  {"Matrix", "0", "Green rain. Nothing else.", makeMatrix, gfx::rgba(61, 255, 114)},
  {"About", "?", "Who made this, and why.", makeAbout, gfx::rgba(244, 114, 182)}};
const int kCount = 6, kCols = 3, kRows = 2, ID_TILE = 100;

class Launcher : public Screen {
  int sel = 0; Screen* child = nullptr; double t = 0; Hits hits; int posts = 0, notes = 0; bool counted = false;
  void count(Env& env) {
    std::string d; posts = 0; if (store::read(env.dataDir + "posts.dat", d)) for (char c : d) if (c == '\n') posts++;
    notes = 0; for (auto& n : store::list(env.dataDir + "notes/")) if (n.size() > 4 && n.compare(n.size() - 4, 4, ".txt") == 0) notes++;
    counted = true;
  }
  // tile rectangles for a grid laid out inside r
  static Rect tileRect(Rect r, int i, int gap) {
    int w = (r.w - gap * (kCols - 1)) / kCols, h = (r.h - gap * (kRows - 1)) / kRows;
    return Rect(r.x + (i % kCols) * (w + gap), r.y + (i / kCols) * (h + gap), w, h);
  }
  void tile(gfx::Fb& fb, Rect r, const Entry& e, bool on) {
    gfx::Color base = gfx::mix(gfx::rgba(24, 24, 33), e.tint, on ? 90 : 40);
    gfx::rrect(fb, r.x, r.y, r.w, r.h, 10, base);
    gfx::rrect(fb, r.x + 3, r.y + 3, r.w - 6, r.h / 2 - 2, 8, gfx::rgba(255, 255, 255, on ? 52 : 30));       // the glass sheen
    gfx::rframe(fb, r.x, r.y, r.w, r.h, 10, on ? gfx::rgba(255, 255, 255) : gfx::mix(gfx::rgba(48, 48, 62), e.tint, 80));
    int ic = std::min(34, r.h / 2 - 4), iy = r.y + std::max(6, (r.h - ic - 28) / 2);
    gfx::rrect(fb, r.x + r.w / 2 - ic / 2, iy, ic, ic, 10, gfx::mix(base, e.tint, 120)); gfx::textCenter(fb, r.x + r.w / 2, iy + (ic - 16) / 2 + 1, e.glyph, gfx::rgba(255, 255, 255), 1);
    gfx::textCenter(fb, r.x + r.w / 2, r.y + r.h - 24, gfx::fit(e.name, r.w - 8), gfx::rgba(255, 255, 255));
  }
  void grid(gfx::Fb& fb, Rect area, int screen) {
    for (int i = 0; i < kCount; i++) { Rect r = tileRect(area, i, 10); tile(fb, r, kApps[i], i == sel); hits.add(screen, r, ID_TILE + i); }
  }
  void info(gfx::Fb& fb, Rect c) {
    const Entry& e = kApps[sel];
    int pw = std::min(c.w - 24, 440), px = (fb.w - pw) / 2, py = c.y + 14, ph = std::min(c.h - 28, 170);
    drawPanel(fb, Rect(px, py, pw, ph), true);
    gfx::Color base = gfx::mix(panel, e.tint, 90); int ic = 52;
    gfx::rrect(fb, px + 16, py + 16, ic, ic, 14, gfx::mix(base, e.tint, 130)); gfx::rrect(fb, px + 19, py + 19, ic - 6, ic / 2 - 3, 10, gfx::rgba(255, 255, 255, 50));
    gfx::textCenter(fb, px + 16 + ic / 2, py + 16 + ic / 2 - 8, e.glyph, gfx::rgba(255, 255, 255), 1);
    gfx::text(fb, px + 16 + ic + 14, py + 20, e.name, text, 1); gfx::text(fb, px + 16 + ic + 14, py + 40, "Nobody is watching.", muted);
    int y = py + 16 + ic + 14; for (auto& l : gfx::wrap(e.blurb, pw - 32)) { gfx::text(fb, px + 16, y, l, text); y += 18; }
    char b[96]; snprintf(b, sizeof b, "%d post%s, %d note%s, 0 followers", posts, posts == 1 ? "" : "s", notes, notes == 1 ? "" : "s");
    gfx::text(fb, px + 16, py + ph - 26, gfx::fit(b, pw - 32), muted);
  }
 public:
  Launcher(Env&) {}
  ~Launcher() { delete child; }
  std::string title() const override { return child ? child->title() : "Anti-Social"; }
  void update(const Input& in, Env& env, double dt) override {
    t += dt; if (!counted) count(env);
    if (child) { child->update(in, env, dt); if (child->done) { delete child; child = nullptr; count(env); } return; }
    int col = sel % kCols, row = sel / kCols;
    if (in.repeat[B_LEFT]) col = (col + kCols - 1) % kCols; if (in.repeat[B_RIGHT]) col = (col + 1) % kCols;
    if (in.repeat[B_UP] || in.repeat[B_DOWN]) row = (row + 1) % kRows;
    sel = row * kCols + col;
    int h = hits.tapped(in); if (h >= ID_TILE && h < ID_TILE + kCount) { sel = h - ID_TILE; child = kApps[sel].make(env); return; }
    if (in.pressed[B_A]) child = kApps[sel].make(env);
  }
  void draw(gfx::Fb& fb, Env& env) override {
    if (child) { gfx::clear(fb, bg); child->draw(fb, env); return; }
    hits.clear(); gfx::clear(fb, bg); drawHeader(fb, "anti-social", env.epoch ? clockText(env.epoch, false, false) : "");
    Rect c = contentArea(fb);
    if (env.dual) { info(fb, c); }
    else {
      gfx::textCenter(fb, fb.w / 2, c.y + 8, "Nobody is here.", muted);
      int gw = std::min(c.w - 40, 520), gh = std::min(c.h - 40, 250); grid(fb, Rect((fb.w - gw) / 2, c.y + 32 + (c.h - 32 - gh) / 2, gw, gh), 0);
    }
    drawFooter(fb, env.dual ? "D-pad Choose  A Open  or touch an app  HOME Exit" : "D-pad Choose  A Open  Touch to open  HOME Exit");
  }
  void drawSub(gfx::Fb& fb, Env& env) override {
    if (child) { gfx::clear(fb, bg); child->drawSub(fb, env); return; }
    gfx::clear(fb, bg); drawHeader(fb, "Touch an app", ""); Rect c = contentArea(fb, false);
    grid(fb, inset(c, 10), 1);
  }
};
}  // namespace
Screen* makeLauncher(Env& env) { return new Launcher(env); }
