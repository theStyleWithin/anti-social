// A base for the simple list apps (Groceries, Chores, Diary): a scrolling list, action buttons, an editor, and one layout for one-screen and two-screen consoles.
#pragma once
#include "screens.h"
#include "editor.h"
#include <algorithm>

using namespace theme;
class ListApp : public Screen {
 protected:
  struct Action { const char* label; int id; Btn key; };
  int sel = 0, top = 0; std::string toast; double toastT = 0, armT = 0; Screen* editor = nullptr; Hits hits;
  enum { ID_BACK = 1, ID_ACT = 20, ID_ROW = 200 };
  virtual const char* appName() const = 0;
  virtual std::string subtitle() { return ""; }
  virtual int count() = 0;
  virtual const char* emptyText() { return "Nothing here yet."; }
  virtual int rowH() { return 36; }
  virtual void rowDraw(gfx::Fb& fb, Rect r, int i, bool on, Env& env) = 0;
  virtual std::vector<Action> actions() = 0;
  virtual void act(int id, Env& env) = 0;
  virtual std::string detail(Env&) { return ""; }                     // shown on the touch screen of a two-screen console
  void say(const std::string& m) { toast = m; toastT = 2.2; }
  bool arm(const char* msg) { if (armT > 0) { armT = 0; return true; } armT = 3; say(msg); return false; }
  void edit(const std::string& title, const std::string& initial, std::function<void(const std::string&, bool)> cb, size_t maxLen = 200000) { delete editor; editor = makeEditor(title, initial, cb, maxLen); }
  void clampSel() { int n = count(); if (sel >= n) sel = std::max(0, n - 1); if (sel < 0) sel = 0; }
 public:
  ~ListApp() { delete editor; }
  std::string title() const override { return const_cast<ListApp*>(this)->appName(); }
  std::string hint() const override {
    if (editor) return editor->hint();
    std::string h; for (auto& a : const_cast<ListApp*>(this)->actions()) { static const char* k[] = {"Up", "Down", "Left", "Right", "A", "B", "X", "Y"}; if (a.key <= B_Y && a.key >= B_A) h += std::string(k[a.key]) + " " + a.label + "  "; }
    return h + "B Back";
  }
  void update(const Input& in, Env& env, double dt) override {
    if (toastT > 0) toastT -= dt; if (armT > 0) armT -= dt;
    if (editor) { editor->update(in, env, dt); if (editor->done) { delete editor; editor = nullptr; } return; }
    int id = hits.tapped(in);
    if (in.pressed[B_B] || id == ID_BACK) { done = true; return; }
    if (id >= ID_ROW) { sel = id - ID_ROW; clampSel(); }
    if (id >= ID_ACT && id < ID_ROW) { act(id, env); return; }
    for (auto& a : actions()) if (a.key != B_COUNT && in.pressed[a.key]) { act(a.id, env); return; }
    int n = count(); if (in.repeat[B_DOWN] && sel + 1 < n) sel++; if (in.repeat[B_UP] && sel > 0) sel--; if (in.repeat[B_R]) sel = std::min(std::max(0, n - 1), sel + 8); if (in.repeat[B_L]) sel = std::max(0, sel - 8);
  }
  void drawButtons(gfx::Fb& fb, Rect a, int screenIdx) {
    std::vector<Action> as = actions(); as.push_back({"Back", ID_BACK, B_B}); int n = (int)as.size(), bw = (a.w - 4 * (n + 1)) / n;
    for (int i = 0; i < n; i++) { Rect r(a.x + 4 + i * (bw + 4), a.y, bw, a.h); drawButton(fb, r, as[i].label, false, i == 0 ? accentDim : panel); hits.add(screenIdx, r, as[i].id); }
  }
  void drawList(gfx::Fb& fb, Rect c, Env& env, int screenIdx) {
    int n = count(); if (n == 0) { gfx::textCenter(fb, c.x + c.w / 2, c.y + c.h / 2 - 8, emptyText(), muted); return; }
    int rh = rowH(), rows = std::max(1, (c.h - 4) / rh); if (sel < top) top = sel; if (sel >= top + rows) top = sel - rows + 1; if (top < 0) top = 0;
    for (int i = 0; i < rows && top + i < n; i++) { Rect r(c.x + 4, c.y + 3 + i * rh, c.w - 8, rh - 3); bool on = top + i == sel; drawPanel(fb, r, on); hits.add(screenIdx, r, ID_ROW + top + i); rowDraw(fb, r, top + i, on, env); }
    if (n > rows) { int bh = std::max(12, c.h * rows / n), by = c.y + (c.h - bh) * top / std::max(1, n - rows); gfx::rect(fb, c.x + c.w - 4, by, 3, bh, accentDim); }
  }
  void draw(gfx::Fb& fb, Env& env) override {
    hits.clear(); if (editor) { editor->draw(fb, env); return; }
    drawHeader(fb, appName(), subtitle()); Rect c = contentArea(fb);
    if (env.dual) drawList(fb, c, env, 0);
    else { int bh = 34; drawList(fb, Rect(c.x, c.y, c.w, c.h - bh - 6), env, 0); drawButtons(fb, Rect(c.x, c.y + c.h - bh - 3, c.w, bh), 0); }
    drawFooter(fb, hint()); if (toastT > 0) drawToast(fb, toast);
  }
  void drawSub(gfx::Fb& fb, Env& env) override {
    if (editor) { editor->drawSub(fb, env); return; }
    gfx::clear(fb, bg); drawHeader(fb, appName(), ""); Rect c = contentArea(fb, false); int bh = 40;
    drawButtons(fb, Rect(c.x, fb.h - bh - 6, c.w, bh), 1);
    std::vector<std::string> ls = gfx::wrap(detail(env), fb.w - 20); for (int i = 0; i < (int)ls.size() && i < (fb.h - bh - c.y - 24) / 16; i++) gfx::text(fb, 10, c.y + 8 + i * 16, ls[i], text);
    if (toastT > 0) drawToast(fb, toast);
  }
};
