#include "app.h"
#include <algorithm>
#include <time.h>
#include <stdio.h>

using namespace theme;

std::string agoText(long now, long then) {
  if (!then || !now) return "";
  long s = now - then; if (s < 0) s = 0; char b[40];
  if (s < 45) return "just now";
  if (s < 3600) { snprintf(b, sizeof b, "%ld min ago", (s + 30) / 60); return b; }
  if (s < 86400) { snprintf(b, sizeof b, "%ld hr ago", (s + 1800) / 3600); return b; }
  long d = (s + 43200) / 86400; snprintf(b, sizeof b, "%ld %s ago", d, d == 1 ? "day" : "days"); return b;
}
static struct tm toLocal(long epoch) { time_t t = (time_t)epoch; struct tm r = {}; struct tm* p = localtime(&t); if (p) r = *p; return r; }
std::string clockText(long epoch, bool h24, bool seconds) {
  struct tm t = toLocal(epoch); char b[24]; int h = t.tm_hour;
  if (!h24) { const char* ap = h >= 12 ? "PM" : "AM"; h = h % 12 ? h % 12 : 12; if (seconds) snprintf(b, sizeof b, "%d:%02d:%02d %s", h, t.tm_min, t.tm_sec, ap); else snprintf(b, sizeof b, "%d:%02d %s", h, t.tm_min, ap); }
  else if (seconds) snprintf(b, sizeof b, "%02d:%02d:%02d", h, t.tm_min, t.tm_sec); else snprintf(b, sizeof b, "%02d:%02d", h, t.tm_min);
  return b;
}
std::string dateText(long epoch) {
  static const char* D[] = {"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"};
  static const char* M[] = {"January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"};
  struct tm t = toLocal(epoch); char b[64]; snprintf(b, sizeof b, "%s, %s %d, %d", D[t.tm_wday % 7], M[t.tm_mon % 12], t.tm_mday, t.tm_year + 1900); return b;
}
std::string fmtDuration(double s, bool tenths) {
  if (s < 0) s = 0; long whole = (long)s; int t = (int)((s - whole) * 10); long h = whole / 3600, m = whole % 3600 / 60, sec = whole % 60; char b[32];
  if (h) snprintf(b, sizeof b, "%ld:%02ld:%02ld", h, m, sec); else if (tenths) snprintf(b, sizeof b, "%02ld:%02ld.%d", m, sec, t); else snprintf(b, sizeof b, "%02ld:%02ld", m, sec);
  return b;
}

int barHeight(const gfx::Fb& fb) { return fb.h >= 300 ? 30 : 24; }
Rect contentArea(const gfx::Fb& fb, bool footer) { int b = barHeight(fb); return {0, b + 1, fb.w, fb.h - b - 1 - (footer ? b + 1 : 0)}; }
Rect inset(Rect r, int d) { return {r.x + d, r.y + d, std::max(0, r.w - 2 * d), std::max(0, r.h - 2 * d)}; }

void drawHeader(gfx::Fb& fb, const std::string& title, const std::string& right) {
  int b = barHeight(fb), ty = (b - 16) / 2;
  gfx::rect(fb, 0, 0, fb.w, b, panel); gfx::rect(fb, 0, b, fb.w, 1, line);
  gfx::text(fb, 8, ty, gfx::fit(title, fb.w - 16 - (int)right.size() * 8), text); if (!right.empty()) gfx::textRight(fb, fb.w - 8, ty, right, muted);
}
void drawFooter(gfx::Fb& fb, const std::string& hint) {
  int b = barHeight(fb);
  gfx::rect(fb, 0, fb.h - b, fb.w, b, panel); gfx::rect(fb, 0, fb.h - b, fb.w, 1, line);
  gfx::text(fb, 8, fb.h - b + (b - 16) / 2, gfx::fit(hint, fb.w - 16), muted);
}
void drawToast(gfx::Fb& fb, const std::string& msg) {
  std::vector<std::string> lines = gfx::wrap(msg, fb.w - 60); int w = 0; for (auto& l : lines) w = std::max(w, gfx::textWidth(l)); w += 20; int h = (int)lines.size() * 16 + 12;
  int x = (fb.w - w) / 2, y = fb.h - barHeight(fb) - 6 - h;
  gfx::rrect(fb, x, y, w, h, 6, rgba(40, 30, 70, 240)); gfx::rframe(fb, x, y, w, h, 6, accent);
  for (size_t i = 0; i < lines.size(); i++) gfx::textCenter(fb, fb.w / 2, y + 6 + (int)i * 16, lines[i], text);
}
void drawPanel(gfx::Fb& fb, Rect r, bool selected) { gfx::rrect(fb, r.x, r.y, r.w, r.h, 6, selected ? rgba(34, 28, 58) : panel); gfx::rframe(fb, r.x, r.y, r.w, r.h, 6, selected ? accent : line); }
void drawButton(gfx::Fb& fb, Rect r, const std::string& label, bool focused, gfx::Color tint) {
  gfx::Color base = focused ? accent : tint; gfx::rrect(fb, r.x, r.y, r.w, r.h, 6, base);
  gfx::rrect(fb, r.x + 2, r.y + 2, r.w - 4, std::max(2, r.h / 2 - 2), 5, rgba(255, 255, 255, focused ? 46 : 22));          // the glass sheen
  gfx::rframe(fb, r.x, r.y, r.w, r.h, 6, focused ? text : line);
  gfx::textCenter(fb, r.x + r.w / 2, r.y + (r.h - 16) / 2, gfx::fit(label, r.w - 6), text);
}
void drawHelpPanel(gfx::Fb& fb, const std::string& title, const std::string& hint) {
  gfx::clear(fb, bg); drawHeader(fb, title, "");
  std::vector<std::string> ls = gfx::wrap(hint, fb.w - 24); int y = barHeight(fb) + 14;
  for (auto& l : ls) { gfx::text(fb, 12, y, l, muted); y += 18; }
}
void Screen::drawSub(gfx::Fb& fb, Env&) { drawHelpPanel(fb, title().empty() ? "Anti-Social" : title(), hint()); }
