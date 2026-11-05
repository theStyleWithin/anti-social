// Chores: repeating jobs ("Water the plants every 3 days"). Shows what is overdue, due today or coming up; Done restarts the clock.
#include "listbase.h"
#include "store.h"
#include <ctype.h>
#include <string.h>
#include <stdlib.h>
namespace {
using namespace theme;
struct Chore { std::string name; int every; long doneDay; };    // doneDay: days since 1970, -1 = never
enum { ID_ADD = 20, ID_DONE = 21, ID_DEL = 22 };
std::string lower(std::string s) { for (auto& c : s) c = (char)tolower((unsigned char)c); return s; }
// "Water plants every 3 days", "Vacuum weekly", "Pay rent monthly", "Dishes daily" -> name and a number of days
Chore parse(const std::string& in) {
  Chore c{in, 7, -1}; std::string l = lower(in); size_t p;
  auto cut = [&](size_t at, size_t len) { c.name = in.substr(0, at); while (!c.name.empty() && c.name.back() == ' ') c.name.pop_back(); (void)len; };
  if ((p = l.find(" every ")) != std::string::npos) {
    const char* q = l.c_str() + p + 7; int n = atoi(q); if (n < 1) n = 1; while (*q && isdigit((unsigned char)*q)) q++; while (*q == ' ') q++;
    int mult = strncmp(q, "week", 4) == 0 ? 7 : strncmp(q, "month", 5) == 0 ? 30 : strncmp(q, "year", 4) == 0 ? 365 : 1; c.every = n * mult; cut(p, 0);
  } else if ((p = l.find(" daily")) != std::string::npos) { c.every = 1; cut(p, 0); }
  else if ((p = l.find(" weekly")) != std::string::npos) { c.every = 7; cut(p, 0); }
  else if ((p = l.find(" monthly")) != std::string::npos) { c.every = 30; cut(p, 0); }
  else c.every = 7;
  if (c.name.empty()) c.name = in; return c;
}
class Chores : public ListApp {
  std::string path; std::vector<Chore> v; long today = 0;
  void load() { v.clear(); std::string d; if (!store::read(path, d)) return; size_t p = 0; while (p < d.size()) { size_t e = d.find('\n', p); if (e == std::string::npos) e = d.size(); std::string l = d.substr(p, e - p); p = e + 1;
    size_t a = l.find('\t'), b = l.find('\t', a == std::string::npos ? 0 : a + 1); if (a == std::string::npos || b == std::string::npos) continue; v.push_back({l.substr(0, a), atoi(l.substr(a + 1, b - a - 1).c_str()), atol(l.c_str() + b + 1)}); } }
  bool save() { std::string d; for (auto& c : v) d += c.name + "\t" + std::to_string(c.every) + "\t" + std::to_string(c.doneDay) + "\n"; return store::write(path, d); }
  long dueIn(const Chore& c) const { return c.doneDay < 0 ? 0 : c.doneDay + c.every - today; }
  const char* appName() const override { return "Chores"; }
  int count() override { return (int)v.size(); }
  const char* emptyText() override { return "No chores. Add one like: Water plants every 3 days"; }
  std::string subtitle() override { int n = 0; for (auto& c : v) if (dueIn(c) <= 0) n++; return std::to_string(n) + " due"; }
  std::vector<Action> actions() override { return {{"Add", ID_ADD, B_Y}, {"Done", ID_DONE, B_A}, {"Delete", ID_DEL, B_X}}; }
  void rowDraw(gfx::Fb& fb, Rect r, int i, bool, Env&) override {
    const Chore& c = v[i]; long d = dueIn(c); std::string st; gfx::Color col = muted;
    if (c.doneDay < 0) { st = "Not done yet"; col = bad; } else if (d < 0) { st = "Overdue " + std::to_string(-d) + (d == -1 ? " day" : " days"); col = bad; } else if (d == 0) { st = "Due today"; col = rgba(251, 191, 36); } else { st = "Due in " + std::to_string(d) + (d == 1 ? " day" : " days"); col = good; }
    gfx::text(fb, r.x + 10, r.y + 3, gfx::fit(c.name, r.w - 150), text); gfx::text(fb, r.x + 10, r.y + 17, "every " + std::to_string(c.every) + (c.every == 1 ? " day" : " days"), muted); gfx::textRight(fb, r.x + r.w - 10, r.y + r.h / 2 - 8, st, col);
  }
  std::string detail(Env&) override { return v.empty() ? "Tap Add and type a chore, like: Water plants every 3 days. Also understood: daily, weekly, monthly." : "Tap a chore, then Done when you have done it. It comes back when it is due."; }
  void act(int id, Env& env) override {
    today = (env.epoch ? env.epoch : 0) / 86400;
    if (id == ID_ADD) edit("New chore", "", [this](const std::string& t, bool ok) { if (!ok || t.find_first_not_of(" \n") == std::string::npos) return; std::string s = t; while (!s.empty() && (s.back() == '\n' || s.back() == ' ')) s.pop_back(); v.push_back(parse(s)); say(save() ? "Added." : "That could not be saved."); }, 200);
    else if (id == ID_DONE && !v.empty()) { v[sel].doneDay = today; save(); say("Done. Nice."); }
    else if (id == ID_DEL && !v.empty() && arm("Press Delete again to remove this chore.")) { v.erase(v.begin() + sel); clampSel(); save(); say("Removed."); }
  }
 public:
  Chores(Env& env) { store::mkdirs(env.dataDir); path = env.dataDir + "chores.dat"; load(); today = (env.epoch ? env.epoch : 0) / 86400; }
  void update(const Input& in, Env& env, double dt) override { today = (env.epoch ? env.epoch : 0) / 86400; ListApp::update(in, env, dt); }
};
}  // namespace
Screen* makeChores(Env& env) { return new Chores(env); }
