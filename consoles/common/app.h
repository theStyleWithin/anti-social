// Anti-Social for game consoles: shared types. Every console runs the same screens; only the thin platform layer differs.
// Screens draw into plain pixel buffers whose size depends on the console:
//   Switch    one screen,  640x360 (scaled 2x to 1280x720, and by the console for a TV)
//   Wii U     TV 640x360 (2x) and GamePad 427x240 (2x to 854x480), the GamePad is the touch screen
//   3DS       top 400x240 and bottom 320x240, the bottom one is the touch screen
// On two-screen consoles the top/TV screen shows what you are reading and the touch screen shows the controls.
#pragma once
#include <string>
#include <vector>
#include <functional>
#include "gfx.h"

#ifndef AS_VERSION
#define AS_VERSION "dev"
#endif

enum Btn { B_UP, B_DOWN, B_LEFT, B_RIGHT, B_A, B_B, B_X, B_Y, B_L, B_R, B_START, B_SELECT, B_COUNT };

struct Rect {
  int x, y, w, h;
  Rect(int x_ = 0, int y_ = 0, int w_ = 0, int h_ = 0) : x(x_), y(y_), w(w_), h(h_) {}
  bool has(int px, int py) const { return px >= x && py >= y && px < x + w && py < y + h; }
};

struct Input {
  bool pressed[B_COUNT] = {};   // went down this frame
  bool held[B_COUNT] = {};
  bool repeat[B_COUNT] = {};    // pressed, or held long enough to repeat
  bool tap = false;             // a finger or stylus went down this frame
  int tapScreen = 0;            // 0 = main screen, 1 = second (touch) screen
  int tapX = 0, tapY = 0;       // in that screen's own pixels
};

struct Env {
  double now = 0;               // seconds since the app started (steady)
  long epoch = 0;               // wall clock, seconds since 1970 (0 if the console has no clock)
  std::string dataDir;          // where notes and posts are kept, always ends with '/'
  std::string platform = "dev";
  bool dual = false;            // two screens: the second one carries the touch controls
  bool quit = false;
};

// touch targets, rebuilt every time a screen is drawn
struct Hits {
  struct H { int screen; Rect r; int id; };
  std::vector<H> v;
  void clear() { v.clear(); }
  void add(int screen, Rect r, int id) { v.push_back({screen, r, id}); }
  int tapped(const Input& in) const { if (!in.tap) return -1; for (size_t i = v.size(); i-- > 0;) if (v[i].screen == in.tapScreen && v[i].r.has(in.tapX, in.tapY)) return v[i].id; return -1; }
};

class Screen {
 public:
  virtual ~Screen() {}
  virtual void update(const Input& in, Env& env, double dt) = 0;
  virtual void draw(gfx::Fb& fb, Env& env) = 0;               // the main screen (the only screen on a Switch)
  virtual void drawSub(gfx::Fb& fb, Env& env);                // the touch screen on two-screen consoles
  virtual std::string hint() const { return ""; }             // button prompts shown in the bottom bar
  virtual std::string title() const { return ""; }
  bool done = false;                                           // the launcher takes it away when this is set
};

namespace theme {
using gfx::rgba;
const gfx::Color bg = rgba(11, 11, 16), panel = rgba(24, 24, 33), line = rgba(48, 48, 62), text = rgba(240, 240, 245), muted = rgba(138, 143, 152),
                 accent = rgba(139, 92, 246), accentDim = rgba(88, 60, 160), good = rgba(52, 211, 153), bad = rgba(248, 113, 113);
}

// helpers every screen uses
std::string agoText(long now, long then);                // "just now", "3 min ago", "2 days ago"
std::string clockText(long epoch, bool h24, bool seconds);
std::string dateText(long epoch);
std::string fmtDuration(double seconds, bool tenths);    // 1:02:03 or 02:03.4
int barHeight(const gfx::Fb& fb);                        // header and footer height: bigger on the big screen
void drawHeader(gfx::Fb& fb, const std::string& title, const std::string& right = "");
void drawFooter(gfx::Fb& fb, const std::string& hint);
void drawToast(gfx::Fb& fb, const std::string& msg);
Rect contentArea(const gfx::Fb& fb, bool footer = true); // between the header and the footer
Rect inset(Rect r, int d);
void drawButton(gfx::Fb& fb, Rect r, const std::string& label, bool focused = false, gfx::Color tint = theme::panel);
void drawPanel(gfx::Fb& fb, Rect r, bool selected = false);
void drawHelpPanel(gfx::Fb& fb, const std::string& title, const std::string& hint);   // the default second screen

Screen* makeLauncher(Env& env);
