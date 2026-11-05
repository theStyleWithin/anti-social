// Diary: one page a day, with a mood and a streak. Saved as plain text files (diary/2026-01-31.txt) you can also read on a computer.
#include "listbase.h"
#include "store.h"
#include <stdio.h>
namespace {
using namespace theme;
const char* kMood[] = {"No mood", "Great", "Good", "Okay", "Low", "Rough"};
const gfx::Color kMoodCol[] = {rgba(138, 143, 152), rgba(52, 211, 153), rgba(132, 204, 22), rgba(251, 191, 36), rgba(251, 146, 60), rgba(248, 113, 113)};
struct Page { std::string date; int mood; std::string text; };
enum { ID_WRITE = 20, ID_MOOD = 21, ID_DEL = 22 };
class Diary : public ListApp {
  std::string dir, today; std::vector<Page> pages;
  static void split(const std::string& raw, int& mood, std::string& text) { mood = 0; text = raw; if (raw.compare(0, 6, "#mood ") == 0) { mood = raw.size() > 6 ? raw[6] - '0' : 0; if (mood < 0 || mood > 5) mood = 0; size_t nl = raw.find('\n'); text = nl == std::string::npos ? "" : raw.substr(nl + 1); } }
  void load() {
    pages.clear(); std::vector<std::string> fs = store::list(dir); bool hasToday = false;
    for (size_t i = fs.size(); i-- > 0;) { const std::string& f = fs[i]; if (f.size() != 14 || f.compare(10, 4, ".txt") != 0) continue; std::string raw; store::read(dir + f, raw); Page p; p.date = f.substr(0, 10); split(raw, p.mood, p.text); if (p.date == today) hasToday = true; pages.push_back(p); }
    if (!hasToday && !today.empty()) pages.insert(pages.begin(), {today, 0, ""});
  }
  bool write(const Page& p) { std::string raw = "#mood " + std::to_string(p.mood) + "\n" + p.text; if (p.text.find_first_not_of(" \n\t") == std::string::npos && p.mood == 0) { store::remove(dir + p.date + ".txt"); return true; } return store::write(dir + p.date + ".txt", raw); }
  const char* appName() const override { return "Diary"; }
  int count() override { return (int)pages.size(); }
  std::string subtitle() override { int n = 0; for (auto& p : pages) if (p.text.find_first_not_of(" \n\t") != std::string::npos) n++; return std::to_string(n) + (n == 1 ? " page" : " pages"); }
  std::vector<Action> actions() override { return {{"Write", ID_WRITE, B_A}, {"Mood", ID_MOOD, B_Y}, {"Delete", ID_DEL, B_X}}; }
  int rowH() override { return 40; }
  void rowDraw(gfx::Fb& fb, Rect r, int i, bool, Env&) override {
    const Page& p = pages[i]; std::string first = p.text.substr(0, p.text.find('\n')); if (first.empty()) first = p.date == today ? "Nothing written today yet." : "(empty)";
    gfx::text(fb, r.x + 10, r.y + 4, p.date + (p.date == today ? "  today" : ""), p.date == today ? accent : muted); gfx::textRight(fb, r.x + r.w - 10, r.y + 4, kMood[p.mood], kMoodCol[p.mood]);
    gfx::text(fb, r.x + 10, r.y + 20, gfx::fit(first, r.w - 24), text);
  }
  std::string detail(Env&) override { if (pages.empty()) return ""; const Page& p = pages[sel]; return p.date + "  " + kMood[p.mood] + "\n\n" + p.text.substr(0, 400); }
  void act(int id, Env&) override {
    if (pages.empty()) return;
    if (id == ID_WRITE) { Page p = pages[sel]; std::string d = p.date; edit("Diary " + d, p.text, [this, d](const std::string& t, bool ok) { if (!ok) return; for (auto& q : pages) if (q.date == d) { q.text = t; say(write(q) ? "Saved." : "That could not be saved."); } load(); }); }
    else if (id == ID_MOOD) { Page& p = pages[sel]; p.mood = (p.mood + 1) % 6; write(p); say(kMood[p.mood]); }
    else if (id == ID_DEL && arm("Press Delete again to erase this page.")) { Page p = pages[sel]; p.text = ""; p.mood = 0; write(p); load(); clampSel(); say("Erased."); }
  }
 public:
  Diary(Env& env) { store::mkdirs(env.dataDir); dir = env.dataDir + "diary/"; store::mkdirs(dir); int y = 2026, m = 1, d = 1, w; if (env.epoch) dateParts(env.epoch, y, m, d, w); today = isoDate(y, m, d); load(); }
};
}  // namespace
Screen* makeDiary(Env& env) { return new Diary(env); }
