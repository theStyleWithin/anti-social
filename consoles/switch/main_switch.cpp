// Nintendo Switch: one 1280x720 screen. The shared screens draw 640x360 and are doubled here.
#include <switch.h>
#include <time.h>
#include <string.h>
#include "../common/app.h"
#include "../common/store.h"

static const struct { u64 mask; Btn b; } kMap[] = {
  {HidNpadButton_Up | HidNpadButton_StickLUp, B_UP}, {HidNpadButton_Down | HidNpadButton_StickLDown, B_DOWN}, {HidNpadButton_Left | HidNpadButton_StickLLeft, B_LEFT},
  {HidNpadButton_Right | HidNpadButton_StickLRight, B_RIGHT}, {HidNpadButton_A, B_A}, {HidNpadButton_B, B_B}, {HidNpadButton_X, B_X}, {HidNpadButton_Y, B_Y},
  {HidNpadButton_L, B_L}, {HidNpadButton_R, B_R}, {HidNpadButton_Plus, B_START}, {HidNpadButton_Minus, B_SELECT}};

int main(int, char**) {
  padConfigureInput(1, HidNpadStyleSet_NpadStandard); PadState pad; padInitializeDefault(&pad); hidInitializeTouchScreen();
  NWindow* win = nwindowGetDefault(); Framebuffer fbuf; framebufferCreate(&fbuf, win, 1280, 720, PIXEL_FORMAT_RGBA_8888, 2); framebufferMakeLinear(&fbuf);
  Env env; env.platform = "Nintendo Switch"; env.dual = false; env.dataDir = "sdmc:/switch/anti-social/"; store::mkdirs(env.dataDir);
  gfx::Fb fb(640, 360); Screen* root = makeLauncher(env);
  u64 prevTick = armGetSystemTick(), freq = armGetSystemTickFreq(); bool touching = false; u64 held[B_COUNT] = {};
  while (appletMainLoop() && !env.quit) {
    u64 t = armGetSystemTick(); double dt = (double)(t - prevTick) / freq; prevTick = t; if (dt > 0.1) dt = 0.1;
    env.now += dt; env.epoch = (long)time(NULL);
    padUpdate(&pad); u64 down = padGetButtonsDown(&pad), cur = padGetButtons(&pad);
    Input in;
    for (auto& m : kMap) {
      bool d = (down & m.mask) != 0, h = (cur & m.mask) != 0; in.pressed[m.b] = d; in.held[m.b] = h;
      if (d) held[m.b] = 0; else if (h) held[m.b]++; else held[m.b] = 0;
      in.repeat[m.b] = d || (held[m.b] > 24 && held[m.b] % 4 == 0);
    }
    HidTouchScreenState ts = {0}; hidGetTouchScreenStates(&ts, 1);
    if (ts.count > 0) { if (!touching) { in.tap = true; in.tapScreen = 0; in.tapX = ts.touches[0].x / 2; in.tapY = ts.touches[0].y / 2; } touching = true; } else touching = false;
    root->update(in, env, dt); root->draw(fb, env);
    u32 stride; u32* out = (u32*)framebufferBegin(&fbuf, &stride); stride /= 4;
    for (int y = 0; y < 720; y++) {
      const uint32_t* src = fb.row(y / 2); u32* dst = out + (size_t)y * stride;
      for (int x = 0; x < 1280; x++) { uint32_t p = src[x / 2]; dst[x] = 0xFF000000u | ((p & 0xFF) << 16) | (p & 0xFF00) | ((p >> 16) & 0xFF); }   // ARGB -> ABGR
    }
    framebufferEnd(&fbuf);
  }
  delete root; framebufferClose(&fbuf); return 0;
}
