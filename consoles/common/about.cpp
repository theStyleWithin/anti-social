#include "screens.h"
namespace {
using namespace theme;
enum { ID_BACK = 1 };
class About : public Screen {
  std::string platform; Hits hits;
 public:
  About(Env& env) : platform(env.platform) {}
  std::string title() const override { return "About"; }
  std::string hint() const override { return "B Back"; }
  void update(const Input& in, Env&, double) override { if (in.pressed[B_B] || in.pressed[B_A] || hits.tapped(in) == ID_BACK) done = true; }
  void draw(gfx::Fb& fb, Env& env) override {
    hits.clear(); drawHeader(fb, "About", ""); Rect c = contentArea(fb); int cy = c.y + 16;
    gfx::textCenter(fb, fb.w / 2, cy, "anti-social", accent, 2); gfx::textCenter(fb, fb.w / 2, cy + 40, std::string("Version ") + AS_VERSION + " for " + platform, text);
    const char* lines[] = {"A social network with nobody on it.", "No servers. No tracking. No audience.", "Everything stays on this console's SD card.", "", "Made by Gamehopper. Licence: GPL-2.0.", "Font: GNU Unifont. Terms of Use: TOUCH GRASS."};
    for (int i = 0; i < 6; i++) gfx::textCenter(fb, fb.w / 2, cy + 68 + i * 18, lines[i], i == 5 ? muted : text);
    if (!env.dual) { Rect b(fb.w - 96, 3, 90, barHeight(fb) - 6); drawButton(fb, b, "Back"); hits.add(0, b, ID_BACK); }
    drawFooter(fb, hint());
  }
  void drawSub(gfx::Fb& fb, Env&) override {
    gfx::clear(fb, bg); drawHeader(fb, "Controls", ""); int y = barHeight(fb) + 12;
    const char* l[] = {"D-pad     Choose", "A         Open / confirm", "B         Back / delete a letter", "X         Extra (space, delete)", "Y         Extra (new, shift)", "L / R     Switch tab / move cursor", "START     Save", "SELECT    Cancel", "", "The touch screen works too."};
    for (int i = 0; i < 10; i++) { gfx::text(fb, 10, y, l[i], i == 9 ? accent : text); y += 17; }
    int by = fb.h - 38; drawButton(fb, Rect(8, by, 90, 32), "Back"); hits.add(1, Rect(8, by, 90, 32), ID_BACK);
  }
};
}  // namespace
Screen* makeAbout(Env& env) { return new About(env); }
