// A computer build for testing: runs the same screens, takes button presses from a script, saves pictures.
// Usage: antisocial-host <profile: 3ds|wiiu|switch> <data dir> <out dir> "A,DOWN,wait:2,tap:main:10:20,tap:sub:30:40,shot:name,..."
// shot:name saves name.ppm (main screen) and, on two-screen profiles, name_sub.ppm
#include "../common/app.h"
#include "../common/store.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <map>

static void savePpm(const gfx::Fb& fb, const std::string& path) {
  FILE* f = fopen(path.c_str(), "wb"); if (!f) return; fprintf(f, "P6\n%d %d\n255\n", fb.w, fb.h);
  for (uint32_t p : fb.px) { unsigned char c[3] = {(unsigned char)gfx::red(p), (unsigned char)gfx::green(p), (unsigned char)gfx::blue(p)}; fwrite(c, 1, 3, f); }
  fclose(f);
}

int main(int argc, char** argv) {
  if (argc < 5) { fprintf(stderr, "usage: %s profile datadir outdir script\n", argv[0]); return 2; }
  std::string prof = argv[1]; int mw = 640, mh = 360, sw = 0, sh = 0; Env env;
  if (prof == "3ds") { mw = 400; mh = 240; sw = 320; sh = 240; env.dual = true; env.platform = "Nintendo 3DS"; }
  else if (prof == "wiiu") { sw = 427; sh = 240; env.dual = true; env.platform = "Wii U"; }
  else if (prof == "switch") env.platform = "Nintendo Switch";
  else { fprintf(stderr, "unknown profile %s\n", prof.c_str()); return 2; }
  env.dataDir = std::string(argv[2]) + "/"; env.epoch = 1767225600 + 9 * 3600 + 41 * 60;   // 2026-01-01 09:41 UTC
  store::mkdirs(env.dataDir); std::string out = std::string(argv[3]) + "/"; store::mkdirs(out);
  gfx::Fb fb(mw, mh), sub(sw ? sw : 1, sh ? sh : 1); Screen* root = makeLauncher(env);
  static const std::map<std::string, Btn> names = {{"UP", B_UP}, {"DOWN", B_DOWN}, {"LEFT", B_LEFT}, {"RIGHT", B_RIGHT}, {"A", B_A}, {"B", B_B}, {"X", B_X}, {"Y", B_Y}, {"L", B_L}, {"R", B_R}, {"START", B_START}, {"SELECT", B_SELECT}};
  const double dt = 1.0 / 60; double frac = 0;
  auto frame = [&](const Input& in) { env.now += dt; frac += dt; if (frac >= 1) { env.epoch++; frac -= 1; } root->draw(fb, env); if (env.dual) root->drawSub(sub, env); root->update(in, env, dt); };
  std::string script = argv[4]; size_t p = 0;
  while (p <= script.size()) {
    size_t e = script.find(',', p); if (e == std::string::npos) e = script.size(); std::string tok = script.substr(p, e - p); p = e + 1; if (tok.empty()) continue;
    if (tok.rfind("wait:", 0) == 0) { int n = (int)(atof(tok.c_str() + 5) * 60); Input none; for (int i = 0; i < n; i++) frame(none); }
    else if (tok.rfind("shot:", 0) == 0) { root->draw(fb, env); savePpm(fb, out + tok.substr(5) + ".ppm"); if (env.dual) { root->drawSub(sub, env); savePpm(sub, out + tok.substr(5) + "_sub.ppm"); } }
    else if (tok.rfind("tap:", 0) == 0) { int sc = tok.compare(4, 3, "sub") == 0; int x = 0, y = 0; sscanf(tok.c_str() + tok.find(':', 5) + 1, "%d:%d", &x, &y); Input in; in.tap = true; in.tapScreen = sc; in.tapX = x; in.tapY = y; frame(in); Input none; frame(none); frame(none); }
    else if (tok.rfind("type:", 0) == 0) { /* typed through the on-screen keyboard by the test script itself */ }
    else if (tok.rfind("hold:", 0) == 0) { size_t c = tok.find(':', 5); auto it = names.find(tok.substr(5, c - 5)); if (it == names.end()) { fprintf(stderr, "unknown button %s\n", tok.c_str()); return 3; } int n = (int)(atof(tok.c_str() + c + 1) * 60); for (int i = 0; i < n; i++) { Input in; in.held[it->second] = true; if (i == 0) in.pressed[it->second] = true; in.repeat[it->second] = i == 0 || (i > 30 && i % 6 == 0); frame(in); } }
    else { auto it = names.find(tok); if (it == names.end()) { fprintf(stderr, "unknown step %s\n", tok.c_str()); return 3; } Input in; in.pressed[it->second] = in.held[it->second] = in.repeat[it->second] = true; frame(in); Input none; frame(none); frame(none); }
  }
  delete root; return 0;
}
