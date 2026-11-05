// Calendar: a month grid with your events. Days with an event or a diary page get a dot.
#include "screens.h"
#include "editor.h"
#include "store.h"
#include <algorithm>
#include <stdio.h>
namespace {
using namespace theme;
struct Ev { std::string date, text; };
enum { ID_ADD = 1, ID_DEL = 2, ID_BACK = 3, ID_PREV = 4, ID_NEXT = 5, ID_TODAY = 6, ID_DAY = 100 };
const char* kMonths[] = {"January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"};
class Calendar : public Screen {
  std::string path, diary; std::vector<Ev> evs; int y = 2026, m = 1, d = 1, ty = 2026, tm = 1, td = 1, evSel = 0; Hits hits; Screen* editor = nullptr; std::string toast; double toastT = 0, armT = 0;
  void load() { evs.clear(); std::string s; if (!store::read(path, s)) return; size_t p = 0; while (p < s.size()) { size_t e = s.find('\n', p); if (e == std::string::npos) e = s.size(); std::string l = s.substr(p, e - p); p = e + 1; size_t t = l.find('\t'); if (t != std::string::npos) evs.push_back({l.substr(0, t), l.substr(t + 1)}); } }
  bool save() { std::string s; for (auto& e : evs) s += e.date + "\t" + e.text + "\n"; return store::write(path, s); }
  std::string cur() const { return isoDate(y, m, d); }
  std::vector<int> onDay(const std::string& date) const { std::vector<int> v; for (size_t i = 0; i < evs.size(); i++) if (evs[i].date == date) v.push_back((int)i); return v; }
  bool hasDiary(const std::string& date) const { std::string t; return store::read(diary + date + ".txt", t) && t.find_first_not_of(" \n\t") != std::string::npos; }
  void move(int dd) { d += dd; while (d < 1) { m--; if (m < 1) { m = 12; y--; } d += daysInMonth(y, m); } while (d > daysInMonth(y, m)) { d -= daysInMonth(y, m); m++; if (m > 12) { m = 1; y++; } } evSel = 0; }
  void month(int dm) { m += dm; if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; } d = std::min(d, daysInMonth(y, m)); evSel = 0; }
  void say(const std::string& s) { toast = s; toastT = 2.2; }
 public:
  Calendar(Env& env) { store::mkdirs(env.dataDir); path = env.dataDir + "events.dat"; diary = env.dataDir + "diary/"; int w; if (env.epoch) dateParts(env.epoch, y, m, d, w); ty = y; tm = m; td = d; load(); }
  ~Calendar() { delete editor; }
  std::string title() const override { return "Calendar"; }
  std::string hint() const override { return editor ? editor->hint() : "D-pad Day  L/R Month  A Add  X Delete  Y Today  B Back"; }
  void update(const Input& in, Env& env, double dt) override {
    if (toastT > 0) toastT -= dt; if (armT > 0) armT -= dt;
    if (editor) { editor->update(in, env, dt); if (editor->done) { delete editor; editor = nullptr; } return; }
    int id = hits.tapped(in);
    if (in.pressed[B_B] || id == ID_BACK) { done = true; return; }
    if (id >= ID_DAY && id < ID_DAY + 40) d = id - ID_DAY;
    if (in.repeat[B_LEFT]) move(-1); if (in.repeat[B_RIGHT]) move(1); if (in.repeat[B_UP]) move(-7); if (in.repeat[B_DOWN]) move(7);
    if (in.repeat[B_L] || id == ID_PREV) month(-1); if (in.repeat[B_R] || id == ID_NEXT) month(1);
    if (in.pressed[B_Y] || id == ID_TODAY) { y = ty; m = tm; d = td; evSel = 0; }
    if (in.pressed[B_A] || id == ID_ADD) { std::string date = cur(); editor = makeEditor("Event on " + date, "", [this, date](const std::string& t, bool ok) { std::string s = t; while (!s.empty() && (s.back() == '\n' || s.back() == ' ')) s.pop_back(); for (auto& c : s) if (c == '\n') c = ' '; if (!ok || s.empty()) return; evs.push_back({date, s}); say(save() ? "Added." : "That could not be saved."); }, 200); return; }
    if (in.pressed[B_X] || id == ID_DEL) { std::vector<int> v = onDay(cur()); if (v.empty()) { say("No events on this day."); return; } if (armT > 0) { evs.erase(evs.begin() + v.back()); save(); armT = 0; say("Removed the last event of the day."); } else { armT = 3; say("Press again to remove the day's last event."); } }
  }
  void drawGrid(gfx::Fb& fb, Rect a) {
    gfx::textCenter(fb, a.x + a.w / 2, a.y + 4, std::string(kMonths[m - 1]) + " " + std::to_string(y), text, 1);
    int cw = a.w / 7, top = a.y + 48, rows = 6, rh = std::max(24, std::min(60, (a.h - 56) / rows)); const char* dn[] = {"Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"};
    for (int i = 0; i < 7; i++) gfx::textCenter(fb, a.x + i * cw + cw / 2, a.y + 28, dn[i], muted);
    int first = weekdayOf(y, m, 1), n = daysInMonth(y, m);
    for (int day = 1; day <= n; day++) {
      int slot = first + day - 1, cx = a.x + (slot % 7) * cw, cy = top + (slot / 7) * rh; Rect r(cx + 2, cy + 2, cw - 4, rh - 4); bool sel = day == d, tod = y == ty && m == tm && day == td;
      gfx::rrect(fb, r.x, r.y, r.w, r.h, 6, sel ? accentDim : panel); gfx::rframe(fb, r.x, r.y, r.w, r.h, 6, sel ? accent : tod ? good : line); hits.add(0, r, ID_DAY + day);
      gfx::text(fb, r.x + 6, r.y + 4, std::to_string(day), tod ? good : text);
      std::string iso = isoDate(y, m, day); if (!onDay(iso).empty()) gfx::rrect(fb, r.x + r.w - 14, r.y + r.h - 14, 8, 8, 4, accent); if (hasDiary(iso)) gfx::rrect(fb, r.x + r.w - 26, r.y + r.h - 14, 8, 8, 4, good);
    }
  }
  void draw(gfx::Fb& fb, Env& env) override {
    hits.clear(); if (editor) { editor->draw(fb, env); return; }
    drawHeader(fb, "Calendar", cur()); Rect c = contentArea(fb);
    if (env.dual) { drawGrid(fb, Rect(c.x + 6, c.y, c.w - 12, c.h)); }
    else if (c.w >= 560) {
      int gw = c.w * 62 / 100; drawGrid(fb, Rect(c.x + 6, c.y + 4, gw - 12, c.h - 8));
      Rect ag(c.x + gw, c.y + 6, c.w - gw - 6, c.h - 12); drawPanel(fb, ag); gfx::text(fb, ag.x + 12, ag.y + 10, cur(), accent);
      std::vector<int> v = onDay(cur()); int y0 = ag.y + 38; if (v.empty()) gfx::text(fb, ag.x + 12, y0, "Nothing planned.", muted);
      for (size_t i = 0; i < v.size() && y0 < ag.y + ag.h - 40; i++) for (auto& l : gfx::wrap(evs[v[i]].text, ag.w - 28)) { gfx::text(fb, ag.x + 12, y0, l, text); y0 += 18; }
      if (hasDiary(cur())) gfx::text(fb, ag.x + 12, ag.y + ag.h - 28, "You wrote in your diary.", good);
      Rect b1(ag.x + 12, ag.y + ag.h - 66, ag.w - 24, 32); drawButton(fb, b1, "Add event", false, accentDim); hits.add(0, b1, ID_ADD);
    } else drawGrid(fb, Rect(c.x + 6, c.y + 4, c.w - 12, c.h - 8));
    if (!env.dual) { Rect p(fb.w - 200, 3, 48, barHeight(fb) - 6), n(fb.w - 148, 3, 48, barHeight(fb) - 6), t(fb.w - 96, 3, 90, barHeight(fb) - 6); drawButton(fb, p, "\xE2\x97\x80"); hits.add(0, p, ID_PREV); drawButton(fb, n, "\xE2\x96\xB6"); hits.add(0, n, ID_NEXT); drawButton(fb, t, "Today"); hits.add(0, t, ID_TODAY); }
    drawFooter(fb, hint()); if (toastT > 0) drawToast(fb, toast);
  }
  void drawSub(gfx::Fb& fb, Env& env) override {
    if (editor) { editor->drawSub(fb, env); return; }
    gfx::clear(fb, bg); drawHeader(fb, cur(), ""); Rect c = contentArea(fb, false); int bh = 36, by = fb.h - bh - 6, bw = (fb.w - 40) / 5; hits.clear();
    const char* lab[] = {"Add", "Delete", "Prev", "Next", "Today"}; int ids[] = {ID_ADD, ID_DEL, ID_PREV, ID_NEXT, ID_TODAY};
    for (int i = 0; i < 5; i++) { Rect r(8 + i * (bw + 6), by, bw, bh); drawButton(fb, r, lab[i], false, i == 0 ? accentDim : panel); hits.add(1, r, ids[i]); }
    std::vector<int> v = onDay(cur()); int y0 = c.y + 8; if (v.empty()) gfx::text(fb, 10, y0, "Nothing planned.", muted);
    for (size_t i = 0; i < v.size(); i++) for (auto& l : gfx::wrap(evs[v[i]].text, fb.w - 20)) { if (y0 > by - 20) break; gfx::text(fb, 10, y0, l, text); y0 += 18; }
    if (toastT > 0) drawToast(fb, toast);
  }
};
}  // namespace
Screen* makeCalendar(Env& env) { return new Calendar(env); }
