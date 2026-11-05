// The desktop-style shell for big screens (Switch, Wii U TV): a rail of apps on the left, the open app in the middle, and
// side panels on the right, the same three-column idea as the desktop app. Apps are the same screens the small consoles use,
// drawn into the middle column, so everything works with buttons and (on the Switch) the touch screen.
#include "screens.h"
#include "store.h"
#include <stdio.h>
#include <algorithm>

namespace {
using namespace theme;
struct Entry { const char* name; const char* glyph; Screen* (*make)(Env&); gfx::Color tint; };
const Entry kApps[] = {
  {"Timeline", "\xE2\x97\x86", makeTimeline, gfx::rgba(139, 92, 246)}, {"Notes", "\xE2\x99\xAA", makeNotes, gfx::rgba(52, 211, 153)},
  {"Diary", "D", makeDiary, gfx::rgba(244, 114, 182)}, {"Calendar", "C", makeCalendar, gfx::rgba(56, 189, 248)},
  {"Groceries", "G", makeGroceries, gfx::rgba(132, 204, 22)}, {"Chores", "#", makeChores, gfx::rgba(251, 146, 60)},
  {"Calculator", "=", makeCalculator, gfx::rgba(56, 189, 248)}, {"Clock", "\xE2\x97\x8F", makeClock, gfx::rgba(251, 191, 36)},
  {"Matrix", "0", makeMatrix, gfx::rgba(61, 255, 114)}, {"Settings", "*", makeSettings, gfx::rgba(148, 163, 184)}, {"About", "?", makeAbout, gfx::rgba(244, 114, 182)}};
const int kCount = (int)(sizeof kApps / sizeof *kApps);
enum { ID_RAIL = 1000, ID_TILE = 2000 };

class Desk : public Screen {
  static const int kRail = 252, kSide = 380;
  int sel = 0, focus = 1;                    // focus: 0 = the rail, 1 = the open app
  Screen* app = nullptr; bool home = false;  // home: no app open, show the app grid
  Hits hits, homeHits; gfx::Fb mid; double t = 0, cd = 0; int posts = 0, notes = 0;
  void open(Env& env, int i) { delete app; sel = i; app = kApps[i].make(env); home = false; focus = 1; }
  void count(Env& env) {
    std::string d; posts = 0; if (store::read(env.dataDir + "posts.dat", d)) for (char c : d) if (c == '\n') posts++;
    notes = 0; for (auto& n : store::list(env.dataDir + "notes/")) if (n.size() > 4 && n.compare(n.size() - 4, 4, ".txt") == 0) notes++;
  }
  void blit(gfx::Fb& dst, const gfx::Fb& src, int x0) { for (int y = 0; y < src.h && y < dst.h; y++) { const uint32_t* s = &src.px[(size_t)y * src.w]; uint32_t* d = dst.row(y) + x0; for (int x = 0; x < src.w && x0 + x < dst.w; x++) d[x] = s[x]; } }
  void railItem(gfx::Fb& fb, int i, Rect r) {
    bool on = i == sel && !home; const Entry& e = kApps[i];
    if (on) { gfx::rrect(fb, r.x, r.y, r.w, r.h, 10, focus == 0 ? accent : accentDim); } else if (focus == 0 && i == sel) gfx::rframe(fb, r.x, r.y, r.w, r.h, 10, accent);
    int ic = 26; gfx::rrect(fb, r.x + 10, r.y + (r.h - ic) / 2, ic, ic, 8, gfx::mix(panel, e.tint, 150)); gfx::textCenter(fb, r.x + 10 + ic / 2, r.y + (r.h - 16) / 2, e.glyph, rgba(255, 255, 255));
    gfx::text(fb, r.x + 46, r.y + (r.h - 16) / 2, e.name, on ? rgba(255, 255, 255) : text);
  }
  void rail(gfx::Fb& fb) {
    gfx::rect(fb, 0, 0, kRail, fb.h, panel); gfx::rect(fb, kRail - 1, 0, 1, fb.h, line);
    gfx::text(fb, 20, 18, "anti-social", accent, 2);
    int y = 62, h = 38; for (int i = 0; i < kCount; i++) { Rect r(10, y, kRail - 20, h - 4); railItem(fb, i, r); hits.add(0, r, ID_RAIL + i); y += h; }
    Rect me(10, fb.h - 74, kRail - 20, 60); gfx::rrect(fb, me.x, me.y, me.w, me.h, 10, bg); gfx::rframe(fb, me.x, me.y, me.w, me.h, 10, line);
    gfx::rrect(fb, me.x + 10, me.y + 12, 36, 36, 18, accentDim); gfx::textCenter(fb, me.x + 28, me.y + 20, "Y", rgba(255, 255, 255));
    gfx::text(fb, me.x + 56, me.y + 12, "You", text); gfx::text(fb, me.x + 56, me.y + 32, "0 followers", muted);
  }
  void card(gfx::Fb& fb, Rect r, const std::string& title) { gfx::rrect(fb, r.x, r.y, r.w, r.h, 14, bg); gfx::rframe(fb, r.x, r.y, r.w, r.h, 14, line); gfx::text(fb, r.x + 16, r.y + 12, title, text, 1); }
  void side(gfx::Fb& fb, Env& env, int x) {
    int w = kSide - 28; x += 14; int y = 14;
    Rect c1(x, y, w, 118); card(fb, c1, "Now"); gfx::text(fb, x + 16, y + 40, env.epoch ? clockText(env.epoch, use24h(), false) : "--:--", accent, 2); gfx::text(fb, x + 16, y + 82, env.epoch ? dateText(env.epoch) : "", muted); y += 130;
    char b[96]; snprintf(b, sizeof b, "%d post%s, %d note%s", posts, posts == 1 ? "" : "s", notes, notes == 1 ? "" : "s");
    Rect c2(x, y, w, 112); card(fb, c2, "Your audience"); gfx::text(fb, x + 16, y + 38, "0", good, 2); gfx::text(fb, x + 56, y + 46, "views on everything", muted); gfx::text(fb, x + 16, y + 82, b, muted); y += 124;
    Rect c3(x, y, w, 100); card(fb, c3, "What is happening"); gfx::text(fb, x + 16, y + 40, "Nothing is trending.", muted); gfx::text(fb, x + 16, y + 62, "Nobody is talking about it.", muted); y += 112;
    Rect c4(x, y, w, 100); card(fb, c4, "Who to follow"); gfx::text(fb, x + 16, y + 40, "Nobody.", muted); gfx::text(fb, x + 16, y + 62, "Nobody is here.", muted); y += 112;
    Rect c5(x, y, w, std::max(60, fb.h - y - 14)); card(fb, c5, "Tip"); for (auto& l : gfx::wrap("SELECT: jump to the apps list.  A: open.  B: back out.", w - 32)) { y += 22; gfx::text(fb, x + 16, y + 24, l, muted); }
  }
  void homeGrid(gfx::Fb& f, int screenIdx, Rect a) {
    int cols = a.w >= 560 ? 4 : 3, rows = (kCount + cols - 1) / cols, gap = 10, w = (a.w - gap * (cols + 1)) / cols, h = std::min(120, (a.h - gap * (rows + 1)) / rows);
    for (int i = 0; i < kCount; i++) {
      Rect r(a.x + gap + (i % cols) * (w + gap), a.y + gap + (i / cols) * (h + gap), w, h); const Entry& e = kApps[i]; bool on = i == sel;
      gfx::Color base = gfx::mix(panel, e.tint, on ? 90 : 40); gfx::rrect(f, r.x, r.y, r.w, r.h, 14, base); gfx::rrect(f, r.x + 3, r.y + 3, r.w - 6, r.h / 2 - 2, 12, rgba(255, 255, 255, on ? 52 : 28));
      gfx::rframe(f, r.x, r.y, r.w, r.h, 14, on ? rgba(255, 255, 255) : gfx::mix(line, e.tint, 80)); int ic = 34; gfx::rrect(f, r.x + r.w / 2 - ic / 2, r.y + 18, ic, ic, 10, gfx::mix(base, e.tint, 130));
      gfx::textCenter(f, r.x + r.w / 2, r.y + 18 + (ic - 16) / 2, e.glyph, rgba(255, 255, 255)); gfx::textCenter(f, r.x + r.w / 2, r.y + r.h - 28, gfx::fit(e.name, r.w - 8), rgba(255, 255, 255)); homeHits.add(screenIdx, r, ID_TILE + i);
    }
  }
  void homeMid(gfx::Fb& f, Env& env) {
    gfx::clear(f, bg); drawHeader(f, "Home", env.epoch ? clockText(env.epoch, use24h(), false) : ""); Rect c = contentArea(f);
    gfx::textCenter(f, f.w / 2, c.y + 14, "Nobody is here. Pick an app.", muted); homeGrid(f, 0, Rect(c.x, c.y + 40, c.w, c.h - 40)); drawFooter(f, "D-pad Choose  A Open  SELECT Apps list");
  }
 public:
  Desk(Env& env) : mid(1280 - kRail - kSide, 720) { count(env); open(env, 0); }
  ~Desk() { delete app; }
  std::string title() const override { return app ? app->title() : "Anti-Social"; }
  void update(const Input& in, Env& env, double dt) override {
    t += dt; cd -= dt; if (cd <= 0) { count(env); cd = 3; }
    Input c = in; int id = hits.tapped(in);                       // the rail: the screen's own pixels
    if (id >= ID_RAIL && id < ID_RAIL + kCount) { open(env, id - ID_RAIL); return; }
    if (in.tap && in.tapScreen == 0) { if (in.tapX >= kRail && in.tapX < kRail + mid.w) c.tapX = in.tapX - kRail; else c.tap = false; }   // the middle column: its own pixels
    int tile = homeHits.tapped(c); if (home && tile >= ID_TILE && tile < ID_TILE + kCount) { open(env, tile - ID_TILE); return; }
    if (in.pressed[B_SELECT] && app && !app->done) { focus = focus ? 0 : 1; }
    if (focus == 0 || home) {
      if (in.repeat[B_UP]) sel = (sel + kCount - 1) % kCount; if (in.repeat[B_DOWN]) sel = (sel + 1) % kCount;
      if (home) { if (in.repeat[B_LEFT]) sel = (sel + kCount - 1) % kCount; if (in.repeat[B_RIGHT]) sel = (sel + 1) % kCount; }
      if (in.pressed[B_A] || (focus == 0 && in.pressed[B_RIGHT])) { open(env, sel); }
      return;
    }
    if (app) {
      if (in.pressed[B_SELECT]) return;
      app->update(c, env, dt); if (app->done) { delete app; app = nullptr; home = true; }
    }
  }
  void draw(gfx::Fb& fb, Env& env) override {
    hits.clear(); homeHits.clear(); gfx::clear(fb, bg); rail(fb);
    if (app) { gfx::clear(mid, bg); app->draw(mid, env); } else homeMid(mid, env);
    blit(fb, mid, kRail); side(fb, env, kRail + mid.w);
  }
  void drawSub(gfx::Fb& fb, Env& env) override {
    if (app) { app->drawSub(fb, env); return; }
    homeHits.clear(); gfx::clear(fb, bg); drawHeader(fb, "Touch an app", ""); Rect c = contentArea(fb, false); homeGrid(fb, 1, inset(c, 4));
  }
};
}  // namespace
Screen* makeDesk(Env& env) { return new Desk(env); }
