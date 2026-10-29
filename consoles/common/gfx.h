// A tiny software renderer: every screen is drawn into a plain pixel buffer, then each console copies it to its display.
#pragma once
#include <stdint.h>
#include <string>
#include <vector>

namespace gfx {
typedef uint32_t Color;  // 0xAARRGGBB
constexpr Color rgba(int r, int g, int b, int a = 255) { return ((uint32_t)a << 24) | ((uint32_t)r << 16) | ((uint32_t)g << 8) | (uint32_t)b; }
inline int red(Color c) { return (c >> 16) & 255; }
inline int green(Color c) { return (c >> 8) & 255; }
inline int blue(Color c) { return c & 255; }
inline int alpha(Color c) { return c >> 24; }
Color mix(Color a, Color b, int t255);  // t255 = 0 gives a, 255 gives b

struct Fb {
  int w, h;
  std::vector<uint32_t> px;
  Fb(int w_, int h_) : w(w_), h(h_), px((size_t)w_ * h_, 0xFF000000u) {}
  uint32_t* row(int y) { return &px[(size_t)y * w]; }
};

void clear(Fb& f, Color c);
void pixel(Fb& f, int x, int y, Color c);          // blends if the colour has alpha
void rect(Fb& f, int x, int y, int w, int h, Color c);
void frame(Fb& f, int x, int y, int w, int h, Color c);
void rrect(Fb& f, int x, int y, int w, int h, int r, Color c);       // rounded filled
void rframe(Fb& f, int x, int y, int w, int h, int r, Color c);     // rounded outline
void vgradient(Fb& f, int x, int y, int w, int h, Color top, Color bottom);
// text: 8x16 glyphs, UTF-8 in. Returns the x after the last glyph.
int text(Fb& f, int x, int y, const std::string& s, Color c, int scale = 1);
int textWidth(const std::string& s, int scale = 1);
void textCenter(Fb& f, int cx, int y, const std::string& s, Color c, int scale = 1);
void textRight(Fb& f, int rx, int y, const std::string& s, Color c, int scale = 1);
// word-wrap to a pixel width; returns the lines (explicit \n kept)
std::vector<std::string> wrap(const std::string& s, int maxWidth, int scale = 1);
std::string fit(const std::string& s, int maxWidth, int scale = 1);   // shorten with "..." to fit
}  // namespace gfx
