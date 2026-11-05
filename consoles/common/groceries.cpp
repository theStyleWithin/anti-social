// Groceries: a shopping list. Add several at once (one per line or separated by commas), tick them off, clear what is done.
#include "listbase.h"
#include "store.h"
namespace {
using namespace theme;
struct Item { bool done; std::string name; };
enum { ID_ADD = 20, ID_TOGGLE = 21, ID_CLEAR = 22 };
class Groceries : public ListApp {
  std::string path; std::vector<Item> items;
  void load() { items.clear(); std::string d; if (!store::read(path, d)) return; size_t p = 0; while (p < d.size()) { size_t e = d.find('\n', p); if (e == std::string::npos) e = d.size(); std::string l = d.substr(p, e - p); p = e + 1; if (l.size() > 2) items.push_back({l[0] == '1', l.substr(2)}); } }
  bool save() { std::string d; for (auto& i : items) d += std::string(i.done ? "1" : "0") + "|" + i.name + "\n"; return store::write(path, d); }
  const char* appName() const override { return "Groceries"; }
  int count() override { return (int)items.size(); }
  const char* emptyText() override { return "Your list is empty. Add what you need."; }
  std::string subtitle() override { int n = 0; for (auto& i : items) if (!i.done) n++; return std::to_string(n) + " to get"; }
  std::vector<Action> actions() override { return {{"Add", ID_ADD, B_Y}, {"Got it", ID_TOGGLE, B_A}, {"Clear done", ID_CLEAR, B_X}}; }
  void rowDraw(gfx::Fb& fb, Rect r, int i, bool, Env&) override {
    const Item& it = items[i]; int cy = r.y + r.h / 2; gfx::rrect(fb, r.x + 10, cy - 8, 16, 16, 4, it.done ? good : line); if (it.done) gfx::text(fb, r.x + 11, cy - 8, "\xC3\x97", rgba(0, 0, 0));
    gfx::text(fb, r.x + 38, cy - 8, gfx::fit(it.name, r.w - 50), it.done ? muted : text);
  }
  std::string detail(Env&) override { return items.empty() ? "Tap Add and type what you need. Several at once is fine." : "Tap an item, then Got it. Clear done removes the ticked ones."; }
  void act(int id, Env&) override {
    if (id == ID_ADD) { edit("Add groceries", "", [this](const std::string& t, bool ok) {
      if (!ok) return; std::string cur; auto push = [&]() { size_t a = cur.find_first_not_of(" \t"), b = cur.find_last_not_of(" \t"); if (a != std::string::npos) items.push_back({false, cur.substr(a, b - a + 1)}); cur.clear(); };
      for (char c : t) { if (c == '\n' || c == ',') push(); else cur += c; } push(); say(save() ? "Added." : "That could not be saved."); }, 4000); }
    else if (id == ID_TOGGLE && !items.empty()) { items[sel].done = !items[sel].done; save(); }
    else if (id == ID_CLEAR) { size_t before = items.size(); items.erase(std::remove_if(items.begin(), items.end(), [](const Item& i) { return i.done; }), items.end()); clampSel(); save(); say(before == items.size() ? "Nothing is ticked." : "Cleared."); }
  }
 public:
  Groceries(Env& env) { store::mkdirs(env.dataDir); path = env.dataDir + "groceries.dat"; load(); }
};
}  // namespace
Screen* makeGroceries(Env& env) { return new Groceries(env); }
