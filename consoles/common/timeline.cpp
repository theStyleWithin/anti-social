// Timeline: write posts that nobody will read. The one feature every Anti-Social has.
#include "screens.h"
#include "editor.h"
#include "store.h"
#include <algorithm>
#include <stdlib.h>

namespace {
using namespace theme;
struct Post { long at; std::string text; };
std::string esc(const std::string& s) { std::string o; for (char c : s) { if (c == '\\') o += "\\\\"; else if (c == '\n') o += "\\n"; else if (c == '\t') o += "\\t"; else o += c; } return o; }
std::string unesc(const std::string& s) { std::string o; for (size_t i = 0; i < s.size(); i++) { if (s[i] == '\\' && i + 1 < s.size()) { char n = s[++i]; o += n == 'n' ? '\n' : n == 't' ? '\t' : n; } else o += s[i]; } return o; }
const char* kJokes[] = {"Posted. Seen by: no one.", "Posted to an audience of zero.", "Your take has been safely ignored.", "Delivered to nobody.", "Hot take secured. No witnesses.", "Posted. Not even the algorithm cares."};
enum { ID_NEW = 1, ID_DELETE = 2, ID_BACK = 3, ID_ITEM = 100 };

class Timeline : public Screen {
  std::string path; std::vector<Post> posts; int sel = 0, top = 0; std::string toast; double toastT = 0; Screen* editor = nullptr; double delArm = 0; int jokeAt = 0; Hits hits; int rowsShown = 3;
  void load() { posts.clear(); std::string d; if (!store::read(path, d)) return; size_t p = 0; while (p < d.size()) { size_t e = d.find('\n', p); if (e == std::string::npos) e = d.size(); std::string line = d.substr(p, e - p); p = e + 1; size_t t = line.find('\t'); if (t == std::string::npos) continue; posts.push_back({atol(line.substr(0, t).c_str()), unesc(line.substr(t + 1))}); } std::reverse(posts.begin(), posts.end()); }
  bool save() { std::string d; for (size_t i = posts.size(); i-- > 0;) d += std::to_string(posts[i].at) + "\t" + esc(posts[i].text) + "\n"; return store::write(path, d); }
  void say(const std::string& m) { toast = m; toastT = 2.2; }
  int cardHeight(const Post& p, int w) const { int n = std::min<int>(3, (int)gfx::wrap(p.text, w - 28).size()); return 22 + n * 16 + 22; }
  void newPost(Env& env) {
    editor = makeEditor("New post", "", [this, &env](const std::string& t, bool ok) {
      std::string s = t; while (!s.empty() && (s.back() == '\n' || s.back() == ' ')) s.pop_back();
      if (!ok || s.empty()) return;
      posts.insert(posts.begin(), {env.epoch ? env.epoch : (long)env.now, s}); sel = 0; top = 0;
      say(save() ? kJokes[jokeAt++ % 6] : "That could not be saved to the SD card."); }, 2000);
  }
  void remove() {
    if (posts.empty()) return;
    if (delArm > 0) { posts.erase(posts.begin() + sel); if (sel >= (int)posts.size()) sel = std::max(0, (int)posts.size() - 1); say(save() ? "Deleted. (Nobody saw it, but still.)" : "That could not be saved."); delArm = 0; }
    else { delArm = 3; say("Tap or press X again to delete this post."); }
  }
 public:
  Timeline(Env& env) { store::mkdirs(env.dataDir); path = env.dataDir + "posts.dat"; load(); jokeAt = (int)(env.now * 7 + env.epoch) % 6; }
  ~Timeline() { delete editor; }
  std::string title() const override { return "Timeline"; }
  std::string hint() const override { return editor ? editor->hint() : "A Post  X Delete  Up/Down Choose  B Back"; }
  void update(const Input& in, Env& env, double dt) override {
    if (toastT > 0) toastT -= dt; if (delArm > 0) delArm -= dt;
    if (editor) { editor->update(in, env, dt); if (editor->done) { delete editor; editor = nullptr; } return; }
    int id = hits.tapped(in);
    if (in.pressed[B_B] || id == ID_BACK) { done = true; return; }
    if (in.pressed[B_A] || id == ID_NEW) { newPost(env); return; }
    if (id >= ID_ITEM) sel = std::min((int)posts.size() - 1, id - ID_ITEM);
    if (posts.empty()) return;
    if (in.repeat[B_DOWN] && sel + 1 < (int)posts.size()) sel++;
    if (in.repeat[B_UP] && sel > 0) sel--;
    if (in.pressed[B_X] || id == ID_DELETE) remove();
  }
  void drawList(gfx::Fb& fb, Env& env, int screenIdx) {
    Rect c = contentArea(fb);
    if (posts.empty()) {
      int cy = c.y + c.h / 2 - 50; gfx::textCenter(fb, fb.w / 2, cy, "Welcome to nowhere", text, 2); gfx::textCenter(fb, fb.w / 2, cy + 40, "Your timeline is empty.", muted); gfx::textCenter(fb, fb.w / 2, cy + 58, "So is everyone else's.", muted);
      gfx::textCenter(fb, fb.w / 2, cy + 88, env.dual ? "Tap New post, or press A." : "Press A and post something.", accent); return;
    }
    if (sel < top) top = sel;
    for (;;) { int y = 0; for (int i = top; i <= sel; i++) y += cardHeight(posts[i], fb.w - 12); if (y <= c.h - 4 || top >= sel) break; top++; }
    int y = c.y + 4; rowsShown = 0;
    for (int i = top; i < (int)posts.size() && y < c.y + c.h - 20; i++) {
      const Post& p = posts[i]; int h = cardHeight(p, fb.w - 12); Rect r(6, y, fb.w - 12, h - 4); drawPanel(fb, r, i == sel); hits.add(screenIdx, r, ID_ITEM + i);
      gfx::text(fb, 14, y + 3, "You", text); gfx::text(fb, 14 + 32, y + 3, "@you \xC2\xB7 " + agoText(env.epoch, p.at), muted);
      std::vector<std::string> ls = gfx::wrap(p.text, fb.w - 28); for (int k = 0; k < (int)ls.size() && k < 3; k++) gfx::text(fb, 14, y + 21 + k * 16, k == 2 && ls.size() > 3 ? gfx::fit(ls[k] + "...", fb.w - 28) : ls[k], text);
      gfx::text(fb, 14, y + h - 4 - 18, "Seen by: 0", muted); y += h; rowsShown++;
    }
  }
  void draw(gfx::Fb& fb, Env& env) override {
    hits.clear(); if (editor) { editor->draw(fb, env); return; }
    drawHeader(fb, "Timeline", std::to_string(posts.size()) + (posts.size() == 1 ? " post" : " posts")); drawList(fb, env, 0);
    if (!env.dual) { drawButton(fb, Rect(fb.w - 96, 3, 90, barHeight(fb) - 6), "New post", false, accentDim); hits.add(0, Rect(fb.w - 96, 3, 90, barHeight(fb) - 6), ID_NEW); }
    drawFooter(fb, hint()); if (toastT > 0) drawToast(fb, toast);
  }
  void drawSub(gfx::Fb& fb, Env& env) override {
    if (editor) { editor->drawSub(fb, env); return; }
    gfx::clear(fb, bg); drawHeader(fb, "Selected post", ""); Rect c = contentArea(fb, false);
    int bh = 34; int by = fb.h - bh - 6, bw = (fb.w - 24) / 3;
    drawButton(fb, Rect(8, by, bw, bh), "New post", false, accentDim); hits.add(1, Rect(8, by, bw, bh), ID_NEW);
    drawButton(fb, Rect(12 + bw, by, bw, bh), delArm > 0 ? "Sure?" : "Delete", delArm > 0, panel); hits.add(1, Rect(12 + bw, by, bw, bh), ID_DELETE);
    drawButton(fb, Rect(16 + 2 * bw, by, bw, bh), "Back"); hits.add(1, Rect(16 + 2 * bw, by, bw, bh), ID_BACK);
    if (posts.empty()) { gfx::textCenter(fb, fb.w / 2, c.y + 40, "Nothing posted yet.", muted); return; }
    const Post& p = posts[sel]; gfx::text(fb, 10, c.y + 6, "You  \xC2\xB7  " + agoText(env.epoch, p.at), muted);
    std::vector<std::string> ls = gfx::wrap(p.text, fb.w - 20); int rows = (by - c.y - 30) / 16;
    for (int i = 0; i < rows && i < (int)ls.size(); i++) gfx::text(fb, 10, c.y + 28 + i * 16, ls[i], text);
    if (toastT > 0) drawToast(fb, toast);
  }
};
}  // namespace
Screen* makeTimeline(Env& env) { return new Timeline(env); }
