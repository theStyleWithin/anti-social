#include "screens.h"
#include <math.h>
#include <stdio.h>
#include <algorithm>

namespace {
using namespace theme;
const gfx::Color kInk[] = {gfx::rgba(61, 255, 114), gfx::rgba(255, 176, 0), gfx::rgba(255, 74, 74), gfx::rgba(53, 224, 255), gfx::rgba(232, 232, 232), gfx::rgba(255, 95, 178)};
enum { ID_TAB = 10, ID_H24 = 20, ID_INK = 21, ID_SW_GO = 30, ID_SW_LAP = 31, ID_SW_RESET = 32, ID_T_M1 = 40, ID_T_P1 = 41, ID_T_M10 = 42, ID_T_P10 = 43, ID_T_GO = 44, ID_T_RESET = 45, ID_BACK = 99 };
class Clock : public Screen {
  int tab = 0, ink = 0; bool h24 = false; Hits hits;
  double swRun = 0, swStart = 0, swBase = 0; bool swOn = false; std::vector<double> laps;
  double tLeft = 300, tSet = 300, tEnd = 0; bool tOn = false, rang = false; double flash = 0;
  void act(int id, Env& env) {
    switch (id) {
      case ID_TAB: case ID_TAB + 1: case ID_TAB + 2: tab = id - ID_TAB; break;
      case ID_H24: h24 = !h24; break; case ID_INK: ink = (ink + 1) % 6; break;
      case ID_SW_GO: if (swOn) { swBase += env.now - swStart; swOn = false; } else { swStart = env.now; swOn = true; } break;
      case ID_SW_LAP: if (swOn) { laps.push_back(swBase + env.now - swStart); if (laps.size() > 8) laps.erase(laps.begin()); } break;
      case ID_SW_RESET: swOn = false; swBase = 0; laps.clear(); break;
      case ID_T_M1: case ID_T_P1: case ID_T_M10: case ID_T_P10: if (!tOn) { double d = id == ID_T_M1 ? -60 : id == ID_T_P1 ? 60 : id == ID_T_M10 ? -10 : 10; tSet = std::max(0.0, std::min(99.0 * 3600, tSet + d)); tLeft = tSet; rang = false; } break;
      case ID_T_GO: if (tOn) tOn = false; else if (tLeft > 0) { tEnd = env.now + tLeft; tOn = true; rang = false; } break;
      case ID_T_RESET: tOn = false; tLeft = tSet; rang = false; break;
    }
  }
  void bigText(gfx::Fb& fb, int y, const std::string& s, gfx::Color c, int scale) { int w = gfx::textWidth(s, scale); gfx::text(fb, (fb.w - w) / 2, y, s, c, scale); }
  void drawControls(gfx::Fb& fb, Rect a, int screenIdx) {
    const char* names[] = {"Clock", "Stopwatch", "Timer"}; int tw = (a.w - 8 - 8) / 3;
    for (int i = 0; i < 3; i++) { Rect r(a.x + 4 + i * (tw + 4), a.y + 4, tw, 28); drawButton(fb, r, names[i], i == tab); hits.add(screenIdx, r, ID_TAB + i); }
    struct B { const char* l; int id; bool on; }; std::vector<B> bs;
    if (tab == 0) bs = {{"12/24 hour", ID_H24, h24}, {"Colour", ID_INK, false}};
    else if (tab == 1) bs = {{swOn ? "Stop" : "Start", ID_SW_GO, swOn}, {"Lap", ID_SW_LAP, false}, {"Reset", ID_SW_RESET, false}};
    else bs = {{"-1 min", ID_T_M1, false}, {"+1 min", ID_T_P1, false}, {"-10 s", ID_T_M10, false}, {"+10 s", ID_T_P10, false}, {tOn ? "Pause" : "Start", ID_T_GO, tOn}, {"Reset", ID_T_RESET, false}};
    int perRow = bs.size() > 3 ? 3 : (int)bs.size(), rows = ((int)bs.size() + perRow - 1) / perRow, bh = std::min(40, (a.h - 44 - (rows - 1) * 4) / rows), bw = (a.w - 8 - (perRow - 1) * 4) / perRow;
    for (size_t i = 0; i < bs.size(); i++) { Rect r(a.x + 4 + (int)(i % perRow) * (bw + 4), a.y + 40 + (int)(i / perRow) * (bh + 4), bw, bh); drawButton(fb, r, bs[i].l, bs[i].on); hits.add(screenIdx, r, bs[i].id); }
  }
  void drawFace(gfx::Fb& fb, Env& env, Rect a) {
    int big = a.w >= 600 ? 7 : 4;
    if (tab == 0) { std::string t = clockText(env.epoch ? env.epoch : (long)env.now, h24, true); int sc = gfx::textWidth(t, big) > a.w - 16 ? big - 1 : big; bigText(fb, a.y + a.h / 2 - 16 * sc / 2 - 10, t, kInk[ink], sc); gfx::textCenter(fb, fb.w / 2, a.y + a.h / 2 + 16 * sc / 2 + 6, env.epoch ? dateText(env.epoch) : "No clock on this device", muted); }
    else if (tab == 1) { bigText(fb, a.y + 24, fmtDuration(swRun, true), swOn ? good : text, big); int y = a.y + 24 + 16 * big + 14; for (size_t i = laps.size(); i-- > 0 && y < a.y + a.h - 18; y += 17) gfx::textCenter(fb, fb.w / 2, y, "Lap " + std::to_string(i + 1) + "   " + fmtDuration(laps[i] - (i ? laps[i - 1] : 0), true), muted); }
    else { bigText(fb, a.y + a.h / 2 - 16 * big / 2 - 14, fmtDuration(tLeft, false), rang ? bad : tOn ? good : text, big); gfx::textCenter(fb, fb.w / 2, a.y + a.h / 2 + 16 * big / 2 + 2, rang ? "Time is up." : tOn ? "Counting down" : "Set the time, then press Start", rang ? bad : muted); }
  }
 public:
  Clock(Env&) {}
  std::string title() const override { return "Clock"; }
  std::string hint() const override { return tab == 0 ? "L/R Tab  X 12/24h  Y Colour  B Back" : tab == 1 ? "L/R Tab  A Start/Stop  X Lap  Y Reset  B Back" : "L/R Tab  A Start/Pause  D-pad Set  Y Reset  B Back"; }
  void update(const Input& in, Env& env, double dt) override {
    int id = hits.tapped(in); if (id == ID_BACK || in.pressed[B_B]) { done = true; return; } if (id >= 0) act(id, env);
    if (in.pressed[B_L]) tab = (tab + 2) % 3; if (in.pressed[B_R]) tab = (tab + 1) % 3;
    if (flash > 0) flash -= dt;
    if (tab == 0) { if (in.pressed[B_X]) act(ID_H24, env); if (in.pressed[B_Y]) act(ID_INK, env); }
    if (tab == 1) { if (in.pressed[B_A]) act(ID_SW_GO, env); if (in.pressed[B_X]) act(ID_SW_LAP, env); if (in.pressed[B_Y]) act(ID_SW_RESET, env); swRun = swBase + (swOn ? env.now - swStart : 0); }
    if (tab == 2) {
      if (tOn) { tLeft = tEnd - env.now; if (tLeft <= 0) { tLeft = 0; tOn = false; rang = true; flash = 3; } }
      if (in.repeat[B_UP]) act(ID_T_P1, env); if (in.repeat[B_DOWN]) act(ID_T_M1, env); if (in.repeat[B_RIGHT]) act(ID_T_P10, env); if (in.repeat[B_LEFT]) act(ID_T_M10, env);
      if (in.pressed[B_A]) act(ID_T_GO, env); if (in.pressed[B_Y]) act(ID_T_RESET, env);
    }
    if (tab != 2 && tOn) { tLeft = tEnd - env.now; if (tLeft <= 0) { tLeft = 0; tOn = false; rang = true; flash = 3; } }
    if (tab != 1 && swOn) swRun = swBase + env.now - swStart;
  }
  void draw(gfx::Fb& fb, Env& env) override {
    hits.clear(); if (flash > 0 && fmod(flash, 0.5) > 0.25) gfx::clear(fb, accent);
    drawHeader(fb, "Clock", env.dual ? "" : std::string(tab == 0 ? "Clock" : tab == 1 ? "Stopwatch" : "Timer")); Rect c = contentArea(fb);
    if (env.dual) drawFace(fb, env, c);
    else { int ch = std::min(c.h * 45 / 100, 112); drawFace(fb, env, Rect(c.x, c.y, c.w, c.h - ch)); drawControls(fb, Rect(c.x, c.y + c.h - ch, c.w, ch), 0); }
    drawFooter(fb, hint());
  }
  void drawSub(gfx::Fb& fb, Env&) override {
    gfx::clear(fb, bg); drawHeader(fb, "Clock", ""); Rect c = contentArea(fb, false); drawControls(fb, Rect(c.x, c.y, c.w, c.h - 40), 1);
    int by = fb.h - 38; drawButton(fb, Rect(8, by, 90, 32), "Back"); hits.add(1, Rect(8, by, 90, 32), ID_BACK);
  }
};
}  // namespace
Screen* makeClock(Env& env) { return new Clock(env); }
