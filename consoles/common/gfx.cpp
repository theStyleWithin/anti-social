#include "gfx.h"
#include "font.h"
#include <algorithm>

namespace gfx {
Color mix(Color a, Color b, int t) {
  t = std::max(0, std::min(255, t));
  auto ch = [&](int x, int y) { return (x * (255 - t) + y * t) / 255; };
  return rgba(ch(red(a), red(b)), ch(green(a), green(b)), ch(blue(a), blue(b)), ch(alpha(a), alpha(b)));
}
void clear(Fb& f, Color c) { std::fill(f.px.begin(), f.px.end(), c | 0xFF000000u); }
void pixel(Fb& f, int x, int y, Color c) {
  if (x < 0 || y < 0 || x >= f.w || y >= f.h) return;
  int a = alpha(c);
  if (a == 255) { f.px[(size_t)y * f.w + x] = c; return; }
  if (a == 0) return;
  uint32_t& d = f.px[(size_t)y * f.w + x];
  d = rgba((red(c) * a + red(d) * (255 - a)) / 255, (green(c) * a + green(d) * (255 - a)) / 255, (blue(c) * a + blue(d) * (255 - a)) / 255);
}
void rect(Fb& f, int x, int y, int w, int h, Color c) {
  int x0 = std::max(0, x), y0 = std::max(0, y), x1 = std::min(f.w, x + w), y1 = std::min(f.h, y + h);
  if (alpha(c) == 255) { for (int j = y0; j < y1; j++) { uint32_t* r = f.row(j); for (int i = x0; i < x1; i++) r[i] = c; } return; }
  for (int j = y0; j < y1; j++) for (int i = x0; i < x1; i++) pixel(f, i, j, c);
}
void frame(Fb& f, int x, int y, int w, int h, Color c) { rect(f, x, y, w, 1, c); rect(f, x, y + h - 1, w, 1, c); rect(f, x, y, 1, h, c); rect(f, x + w - 1, y, 1, h, c); }
// is (px,py) inside a rounded rectangle of size w x h with corner radius r (coordinates relative to its corner)?
static bool inside(int px, int py, int w, int h, int r) {
  if (px < 0 || py < 0 || px >= w || py >= h) return false;
  int cx = px < r ? r - 1 - px : px >= w - r ? px - (w - r) : -1, cy = py < r ? r - 1 - py : py >= h - r ? py - (h - r) : -1;
  if (cx < 0 || cy < 0) return true;
  return cx * cx + cy * cy <= (r - 1) * (r - 1) + r;   // a little generous so small radii look round
}
void rrect(Fb& f, int x, int y, int w, int h, int r, Color c) { for (int j = 0; j < h; j++) for (int i = 0; i < w; i++) if (inside(i, j, w, h, r)) pixel(f, x + i, y + j, c); }
void rframe(Fb& f, int x, int y, int w, int h, int r, Color c) { for (int j = 0; j < h; j++) for (int i = 0; i < w; i++) if (inside(i, j, w, h, r) && !inside(i - 1, j - 1, w - 2, h - 2, r - 1 > 0 ? r - 1 : 0)) pixel(f, x + i, y + j, c); }
void vgradient(Fb& f, int x, int y, int w, int h, Color top, Color bottom) { for (int j = 0; j < h; j++) rect(f, x, y + j, w, 1, mix(top, bottom, h > 1 ? j * 255 / (h - 1) : 0)); }

static int glyphFor(uint32_t cp) {
  if (cp >= 32 && cp <= 126) return (int)cp - 32;
  for (int i = 0; i < kFontSymbolCount; i++) if (kFontSymbols[i] == cp) return kFontFirstSymbol + i;
  return '?' - 32;
}
static uint32_t nextCp(const std::string& s, size_t& i) {
  unsigned char c = (unsigned char)s[i++];
  if (c < 0x80) return c;
  int extra = c >= 0xF0 ? 3 : c >= 0xE0 ? 2 : 1; uint32_t cp = c & (0x3F >> extra);
  while (extra-- > 0 && i < s.size()) cp = (cp << 6) | ((unsigned char)s[i++] & 0x3F);
  return cp;
}
int textWidth(const std::string& s, int scale) { int n = 0; for (size_t i = 0; i < s.size();) { nextCp(s, i); n++; } return n * 8 * scale; }
int text(Fb& f, int x, int y, const std::string& s, Color c, int scale) {
  for (size_t i = 0; i < s.size();) {
    uint32_t cp = nextCp(s, i);
    if (cp == '\n' || cp == '\r') continue;
    const uint8_t* g = kFont[glyphFor(cp)];
    for (int j = 0; j < 16; j++) for (int b = 0; b < 8; b++) if (g[j] & (0x80 >> b)) { if (scale == 1) pixel(f, x + b, y + j, c); else rect(f, x + b * scale, y + j * scale, scale, scale, c); }
    x += 8 * scale;
  }
  return x;
}
void textCenter(Fb& f, int cx, int y, const std::string& s, Color c, int scale) { text(f, cx - textWidth(s, scale) / 2, y, s, c, scale); }
void textRight(Fb& f, int rx, int y, const std::string& s, Color c, int scale) { text(f, rx - textWidth(s, scale), y, s, c, scale); }

std::vector<std::string> wrap(const std::string& s, int maxWidth, int scale) {
  std::vector<std::string> out; int per = std::max(1, maxWidth / (8 * scale));
  size_t pos = 0;
  while (pos <= s.size()) {
    size_t nl = s.find('\n', pos); std::string line = s.substr(pos, nl == std::string::npos ? std::string::npos : nl - pos);
    if (line.empty()) out.push_back("");
    while (!line.empty()) {
      if ((int)line.size() <= per) { out.push_back(line); break; }
      size_t cut = line.rfind(' ', per); if (cut == std::string::npos || cut == 0) cut = per;
      out.push_back(line.substr(0, cut)); line = line.substr(cut); while (!line.empty() && line[0] == ' ') line.erase(0, 1);
    }
    if (nl == std::string::npos) break; pos = nl + 1;
  }
  return out;
}
std::string fit(const std::string& s, int maxWidth, int scale) {
  int per = std::max(1, maxWidth / (8 * scale)); if ((int)s.size() <= per) return s; return per <= 3 ? s.substr(0, per) : s.substr(0, per - 3) + "...";
}
}  // namespace gfx
