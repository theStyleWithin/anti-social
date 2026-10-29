// Wii U: the TV shows the content (640x360, doubled to 1280x720) and the GamePad is the touch screen (427x240, doubled to 854x480).
#include <coreinit/screen.h>
#include <coreinit/cache.h>
#include <coreinit/time.h>
#include <vpad/input.h>
#include <whb/proc.h>
#include <whb/sdcard.h>
#include <malloc.h>
#include <string.h>
#include "../common/app.h"
#include "../common/store.h"

static const struct { uint32_t mask; Btn b; } kMap[] = {
  {VPAD_BUTTON_UP | VPAD_STICK_L_EMULATION_UP, B_UP}, {VPAD_BUTTON_DOWN | VPAD_STICK_L_EMULATION_DOWN, B_DOWN}, {VPAD_BUTTON_LEFT | VPAD_STICK_L_EMULATION_LEFT, B_LEFT},
  {VPAD_BUTTON_RIGHT | VPAD_STICK_L_EMULATION_RIGHT, B_RIGHT}, {VPAD_BUTTON_A, B_A}, {VPAD_BUTTON_B, B_B}, {VPAD_BUTTON_X, B_X}, {VPAD_BUTTON_Y, B_Y},
  {VPAD_BUTTON_L, B_L}, {VPAD_BUTTON_R, B_R}, {VPAD_BUTTON_PLUS, B_START}, {VPAD_BUTTON_MINUS, B_SELECT}};

// OSScreen buffers are 32-bit 0xRRGGBBAA. The TV is 1280 pixels per row, the GamePad 896 (854 shown).
static void blit(const gfx::Fb& fb, uint32_t* dst, int pitch, int dw, int dh) {
  for (int y = 0; y < dh; y++) {
    const uint32_t* src = &fb.px[(size_t)(y / 2) * fb.w]; uint32_t* d = dst + (size_t)y * pitch;
    for (int x = 0; x < dw; x++) { uint32_t p = src[x / 2]; d[x] = ((p & 0xFF0000) << 8) | (p & 0xFF00) << 8 | ((p & 0xFF) << 8) | 0xFF; }
  }
}

int main(int, char**) {
  WHBProcInit(); VPADInit(); OSScreenInit();
  size_t tvSize = OSScreenGetBufferSizeEx(SCREEN_TV), drcSize = OSScreenGetBufferSizeEx(SCREEN_DRC);
  void* tvBuf = memalign(0x100, tvSize); void* drcBuf = memalign(0x100, drcSize);
  OSScreenSetBufferEx(SCREEN_TV, tvBuf); OSScreenSetBufferEx(SCREEN_DRC, drcBuf); OSScreenEnableEx(SCREEN_TV, 1); OSScreenEnableEx(SCREEN_DRC, 1);
  OSScreenClearBufferEx(SCREEN_TV, 0); OSScreenClearBufferEx(SCREEN_DRC, 0);
  Env env; env.platform = "Wii U"; env.dual = true; WHBMountSdCard(); env.dataDir = std::string(WHBGetSdCardMountPath()) + "/wiiu/anti-social/"; store::mkdirs(env.dataDir);
  gfx::Fb tv(640, 360), drc(427, 240); Screen* root = makeLauncher(env);
  OSTime prev = OSGetSystemTime(); bool touching = false; unsigned held[B_COUNT] = {};
  while (WHBProcIsRunning() && !env.quit) {
    OSTime t = OSGetSystemTime(); double dt = (double)(t - prev) / (double)OSSecondsToTicks(1); prev = t; if (dt > 0.1) dt = 0.1;
    env.now += dt; env.epoch = (long)(OSTicksToSeconds(OSGetTime()) + 946684800LL);   // console clock counts from 2000
    VPADStatus st; VPADReadError err; VPADRead(VPAD_CHAN_0, &st, 1, &err); Input in;
    if (err == VPAD_READ_SUCCESS) {
      for (auto& m : kMap) {
        bool d = (st.trigger & m.mask) != 0, h = (st.hold & m.mask) != 0; in.pressed[m.b] = d; in.held[m.b] = h;
        if (d) held[m.b] = 0; else if (h) held[m.b]++; else held[m.b] = 0;
        in.repeat[m.b] = d || (held[m.b] > 24 && held[m.b] % 4 == 0);
      }
      VPADTouchData cal; VPADGetTPCalibratedPointEx(VPAD_CHAN_0, VPAD_TP_854X480, &cal, &st.tpNormal);
      if (cal.touched) { if (!touching) { in.tap = true; in.tapScreen = 1; in.tapX = cal.x / 2; in.tapY = cal.y / 2; } touching = true; } else touching = false;
    }
    root->update(in, env, dt); root->draw(tv, env); root->drawSub(drc, env);
    blit(tv, (uint32_t*)tvBuf, 1280, 1280, 720); blit(drc, (uint32_t*)drcBuf, 896, 854, 480);
    DCFlushRange(tvBuf, tvSize); DCFlushRange(drcBuf, drcSize); OSScreenFlipBuffersEx(SCREEN_TV); OSScreenFlipBuffersEx(SCREEN_DRC);
  }
  delete root; WHBUnmountSdCard(); OSScreenShutdown(); free(tvBuf); free(drcBuf); VPADShutdown(); WHBProcShutdown(); return 0;
}
