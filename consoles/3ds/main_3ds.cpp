// Nintendo 3DS: the top screen (400x240) shows the content, the bottom screen (320x240) is the touch screen.
#include <3ds.h>
#include <time.h>
#include <string.h>
#include "../common/app.h"
#include "../common/store.h"

static const struct { u32 mask; Btn b; } kMap[] = {
  {KEY_DUP | KEY_CPAD_UP, B_UP}, {KEY_DDOWN | KEY_CPAD_DOWN, B_DOWN}, {KEY_DLEFT | KEY_CPAD_LEFT, B_LEFT}, {KEY_DRIGHT | KEY_CPAD_RIGHT, B_RIGHT},
  {KEY_A, B_A}, {KEY_B, B_B}, {KEY_X, B_X}, {KEY_Y, B_Y}, {KEY_L, B_L}, {KEY_R, B_R}, {KEY_START, B_START}, {KEY_SELECT, B_SELECT}};

// The 3DS framebuffers are stored as columns, bottom to top, 3 bytes (B, G, R) per pixel.
static void blit(const gfx::Fb& fb, u8* dst) {
  for (int x = 0; x < fb.w; x++) {
    u8* col = dst + (size_t)x * fb.h * 3;
    for (int y = 0; y < fb.h; y++) { uint32_t p = fb.px[(size_t)y * fb.w + x]; u8* o = col + (fb.h - 1 - y) * 3; o[0] = p & 0xFF; o[1] = (p >> 8) & 0xFF; o[2] = (p >> 16) & 0xFF; }
  }
}

int main(int, char**) {
  gfxInitDefault(); gfxSetDoubleBuffering(GFX_TOP, true); gfxSetDoubleBuffering(GFX_BOTTOM, true);
  Env env; env.platform = "Nintendo 3DS"; env.dual = true; env.dataDir = "sdmc:/3ds/anti-social/"; store::mkdirs(env.dataDir);
  gfx::Fb top(400, 240), bottom(320, 240); Screen* root = makeLauncher(env);
  u64 prev = osGetTime(); bool touching = false; unsigned held[B_COUNT] = {};
  while (aptMainLoop() && !env.quit) {
    u64 t = osGetTime(); double dt = (double)(t - prev) / 1000.0; prev = t; if (dt > 0.1) dt = 0.1;
    env.now += dt; env.epoch = (long)time(NULL);
    hidScanInput(); u32 down = hidKeysDown(), cur = hidKeysHeld(); Input in;
    for (auto& m : kMap) {
      bool d = (down & m.mask) != 0, h = (cur & m.mask) != 0; in.pressed[m.b] = d; in.held[m.b] = h;
      if (d) held[m.b] = 0; else if (h) held[m.b]++; else held[m.b] = 0;
      in.repeat[m.b] = d || (held[m.b] > 24 && held[m.b] % 4 == 0);
    }
    if (cur & KEY_TOUCH) { touchPosition tp; hidTouchRead(&tp); if (!touching) { in.tap = true; in.tapScreen = 1; in.tapX = tp.px; in.tapY = tp.py; } touching = true; } else touching = false;
    root->update(in, env, dt); root->draw(top, env); root->drawSub(bottom, env);
    blit(top, gfxGetFramebuffer(GFX_TOP, GFX_LEFT, NULL, NULL)); blit(bottom, gfxGetFramebuffer(GFX_BOTTOM, GFX_LEFT, NULL, NULL));
    gfxFlushBuffers(); gfxSwapBuffers(); gspWaitForVBlank();
  }
  delete root; gfxExit(); return 0;
}
