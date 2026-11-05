// Settings: a colour theme (like the desktop app's), the clock format, and where your data lives.
#include "screens.h"
#include "store.h"
#include <stdio.h>
#include <stdlib.h>
namespace {
using namespace theme;
struct Preset { const char* name; gfx::Color c; };
const Preset kPresets[] = {{"Violet", rgba(139, 92, 246)}, {"Blue", rgba(59, 130, 246)}, {"Teal", rgba(20, 184, 166)}, {"Green", rgba(34, 197, 94)}, {"Amber", rgba(245, 158, 11)}, {"Orange", rgba(249, 115, 22)}, {"Rose", rgba(244, 63, 94)}, {"Pink", rgba(236, 72, 153)}};
int gAccent = 0; bool gH24 = false; std::string gPath;
void persist() { store::write(gPath, "accent=" + std::to_string(gAccent) + "\nh24=" + (gH24 ? "1" : "0") + "\n"); }
enum { ID_BACK = 1, ID_H24 = 2, ID_SW = 100 };
class Settings : public Screen {
  Hits hits; std::string dir, platform;
 public:
  Settings(Env& env) : dir(env.dataDir), platform(env.platform) {}
  std::string title() const override { return "Settings"; }
  std::string hint() const override { return "Left/Right Colour  A 12/24 hour  B Back"; }
  void update(const Input& in, Env&, double) override {
    int id = hits.tapped(in);
    if (in.pressed[B_B] || id == ID_BACK) { done = true; return; }
    int n = (int)(sizeof kPresets / sizeof *kPresets); int a = gAccent;
    if (in.repeat[B_RIGHT]) a = (a + 1) % n; if (in.repeat[B_LEFT]) a = (a + n - 1) % n; if (id >= ID_SW && id < ID_SW + n) a = id - ID_SW;
    if (a != gAccent) { gAccent = a; setAccent(kPresets[a].c); persist(); }
    if (in.pressed[B_A] || id == ID_H24) { gH24 = !gH24; persist(); }
  }
  void body(gfx::Fb& fb, Rect c, int screenIdx) {
    int x = c.x + 16, y = c.y + 14; gfx::text(fb, x, y, "Colour theme", text); y += 26; int n = (int)(sizeof kPresets / sizeof *kPresets), sw = std::min(64, (c.w - 32) / n - 6);
    for (int i = 0; i < n; i++) { Rect r(x + i * (sw + 6), y, sw, sw); gfx::rrect(fb, r.x, r.y, r.w, r.h, 10, kPresets[i].c); if (i == gAccent) gfx::rframe(fb, r.x - 2, r.y - 2, r.w + 4, r.h + 4, 12, rgba(255, 255, 255)); hits.add(screenIdx, r, ID_SW + i); }
    y += sw + 8; gfx::text(fb, x, y, kPresets[gAccent].name, muted); y += 36;
    Rect b(x, y, std::min(c.w - 32, 280), 36); drawButton(fb, b, gH24 ? "Clock: 24 hour" : "Clock: 12 hour", false, accentDim); hits.add(screenIdx, b, ID_H24); y += 56;
    gfx::text(fb, x, y, "Your data", text); y += 22; for (auto& l : gfx::wrap("Posts, notes, diary pages, chores and the rest are plain files in " + dir + " on the SD card. Copy that folder to back it up.", c.w - 32)) { gfx::text(fb, x, y, l, muted); y += 18; }
    y += 10; gfx::text(fb, x, y, std::string("Version ") + AS_VERSION + " on " + platform, muted);
  }
  void draw(gfx::Fb& fb, Env& env) override {
    hits.clear(); drawHeader(fb, "Settings", ""); Rect c = contentArea(fb);
    if (env.dual) { gfx::text(fb, 16, c.y + 14, "Choose a colour and the clock format on the touch screen.", muted); gfx::text(fb, 16, c.y + 40, std::string("Colour: ") + kPresets[gAccent].name, text); gfx::text(fb, 16, c.y + 62, gH24 ? "Clock: 24 hour" : "Clock: 12 hour", text); }
    else { body(fb, c, 0); Rect b(fb.w - 96, 3, 90, barHeight(fb) - 6); drawButton(fb, b, "Back"); hits.add(0, b, ID_BACK); }
    drawFooter(fb, hint());
  }
  void drawSub(gfx::Fb& fb, Env&) override { gfx::clear(fb, bg); drawHeader(fb, "Settings", ""); body(fb, contentArea(fb, false), 1); Rect b(fb.w - 98, fb.h - 40, 90, 32); drawButton(fb, b, "Back"); hits.add(1, b, ID_BACK); }
};
}  // namespace
bool use24h() { return gH24; }
void loadSettings(Env& env) {
  gPath = env.dataDir + "settings.dat"; std::string s; store::mkdirs(env.dataDir); if (!store::read(gPath, s)) return;
  size_t p = s.find("accent="); if (p != std::string::npos) { int a = atoi(s.c_str() + p + 7); if (a >= 0 && a < (int)(sizeof kPresets / sizeof *kPresets)) { gAccent = a; setAccent(kPresets[a].c); } }
  p = s.find("h24="); if (p != std::string::npos) gH24 = s[p + 4] == '1';
}
Screen* makeSettings(Env& env) { return new Settings(env); }
