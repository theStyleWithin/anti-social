// Notes: as long as you like, saved on the SD card as plain text files you can also read on a computer.
#include "screens.h"
#include "editor.h"
#include "store.h"
#include <algorithm>
#include <stdio.h>

namespace {
using namespace theme;
struct Note { std::string file, text; };
enum { ID_NEW = 1, ID_DELETE = 2, ID_BACK = 3, ID_EDIT = 4, ID_ITEM = 100 };
class Notes : public Screen {
  std::string dir; std::vector<Note> notes; int sel = 0, top = 0, viewing = -1, scroll = 0; std::string toast; double toastT = 0, delArm = 0; Screen* editor = nullptr; int counter = 0; Hits hits;
  void load() { notes.clear(); for (auto& f : store::list(dir)) { if (f.size() < 5 || f.substr(f.size() - 4) != ".txt") continue; Note n; n.file = f; store::read(dir + f, n.text); notes.push_back(n); } std::reverse(notes.begin(), notes.end()); }
  void say(const std::string& m) { toast = m; toastT = 2.2; }
  static std::string titleOf(const Note& n) { size_t s = n.text.find_first_not_of(" \n\t"); if (s == std::string::npos) return "(empty note)"; size_t e = n.text.find('\n', s); return n.text.substr(s, e == std::string::npos ? std::string::npos : e - s); }
  void startEdit(Env& env, int index) {
    std::string initial = index >= 0 ? notes[index].text : "", file = index >= 0 ? notes[index].file : "";
    editor = makeEditor(index >= 0 ? "Edit note" : "New note", initial, [this, &env, file](const std::string& t, bool ok) {
      if (!ok) return;
      std::string f = file; if (f.empty()) { char b[48]; snprintf(b, sizeof b, "n%010ld%02d.txt", env.epoch ? env.epoch : (long)env.now, counter++ % 100); f = b; }
      if (t.find_first_not_of(" \n\t") == std::string::npos) { if (!file.empty()) store::remove(dir + file); load(); viewing = -1; return; }
      say(store::write(dir + f, t) ? "Saved on the SD card." : "That could not be saved."); load(); viewing = -1; sel = 0; for (size_t i = 0; i < notes.size(); i++) if (notes[i].file == f) sel = (int)i; });
  }
  void remove() {
    if (notes.empty()) return;
    if (delArm > 0) { store::remove(dir + notes[sel].file); load(); if (sel >= (int)notes.size()) sel = std::max(0, (int)notes.size() - 1); viewing = -1; say("Deleted."); delArm = 0; }
    else { delArm = 3; say("Tap or press X again to delete this note."); }
  }
 public:
  Notes(Env& env) { dir = env.dataDir + "notes/"; store::mkdirs(dir); load(); }
  ~Notes() { delete editor; }
  std::string title() const override { return "Notes"; }
  std::string hint() const override { return editor ? editor->hint() : viewing >= 0 ? "A Edit  Up/Down Scroll  X Delete  B Back" : "A Open  Y New  X Delete  B Back"; }
  void update(const Input& in, Env& env, double dt) override {
    if (toastT > 0) toastT -= dt; if (delArm > 0) delArm -= dt;
    if (editor) { editor->update(in, env, dt); if (editor->done) { delete editor; editor = nullptr; } return; }
    int id = hits.tapped(in);
    if (id == ID_NEW || in.pressed[B_Y]) { startEdit(env, -1); return; }
    if (id == ID_BACK || in.pressed[B_B]) { if (viewing >= 0) viewing = -1; else done = true; return; }
    if (id >= ID_ITEM) { sel = std::min((int)notes.size() - 1, id - ID_ITEM); if (!env.dual) { viewing = sel; scroll = 0; } }
    if (notes.empty()) return;
    if (id == ID_EDIT) { startEdit(env, sel); return; }
    if (id == ID_DELETE || in.pressed[B_X]) { remove(); return; }
    if (viewing >= 0) {
      if (in.pressed[B_A]) { startEdit(env, viewing); return; }
      if (in.repeat[B_DOWN]) scroll++; if (in.repeat[B_UP] && scroll > 0) scroll--; if (in.repeat[B_R]) scroll += 8; if (in.repeat[B_L]) scroll = std::max(0, scroll - 8);
      return;
    }
    if (in.repeat[B_DOWN] && sel + 1 < (int)notes.size()) sel++; if (in.repeat[B_UP] && sel > 0) sel--;
    if (in.pressed[B_A]) { if (env.dual) startEdit(env, sel); else { viewing = sel; scroll = 0; } }
  }
  void drawList(gfx::Fb& fb, int screenIdx) {
    Rect c = contentArea(fb);
    if (notes.empty()) { gfx::textCenter(fb, fb.w / 2, c.y + c.h / 2 - 30, "No notes yet", text, 2); gfx::textCenter(fb, fb.w / 2, c.y + c.h / 2 + 8, "Write one. It stays on this console.", muted); gfx::textCenter(fb, fb.w / 2, c.y + c.h / 2 + 34, "Press Y for a new note.", accent); return; }
    int rowH = 19, rows = std::max(1, (c.h - 6) / rowH); if (sel < top) top = sel; if (sel >= top + rows) top = sel - rows + 1;
    for (int i = 0; i < rows && top + i < (int)notes.size(); i++) { Rect r(4, c.y + 4 + i * rowH, fb.w - 8, rowH - 1); bool on = top + i == sel; if (on) gfx::rrect(fb, r.x, r.y, r.w, r.h, 4, accentDim); hits.add(screenIdx, r, ID_ITEM + top + i);
      gfx::text(fb, 10, r.y + 1, gfx::fit(titleOf(notes[top + i]), fb.w - 90), on ? text : muted); gfx::textRight(fb, fb.w - 10, r.y + 1, std::to_string(notes[top + i].text.size()), muted); }
  }
  void drawText(gfx::Fb& fb, Rect c, const Note& n) {
    std::vector<std::string> ls = gfx::wrap(n.text, c.w - 16); int rows = std::max(1, c.h / 16); scroll = std::min(scroll, std::max(0, (int)ls.size() - rows));
    for (int i = 0; i < rows && scroll + i < (int)ls.size(); i++) gfx::text(fb, c.x + 8, c.y + 4 + i * 16, ls[scroll + i], text);
    if ((int)ls.size() > rows) { int bh = std::max(10, c.h * rows / (int)ls.size()), by = c.y + (c.h - bh) * scroll / std::max(1, (int)ls.size() - rows); gfx::rect(fb, c.x + c.w - 4, by, 3, bh, accentDim); }
  }
  void draw(gfx::Fb& fb, Env& env) override {
    hits.clear(); if (editor) { editor->draw(fb, env); return; }
    if (env.dual) {                                  // the main screen shows the list, or the open note; the touch screen has the buttons
      if (viewing >= 0 && viewing < (int)notes.size()) { drawHeader(fb, gfx::fit(titleOf(notes[viewing]), fb.w - 90), std::to_string(notes[viewing].text.size()) + " chars"); drawText(fb, contentArea(fb), notes[viewing]); }
      else { drawHeader(fb, "Notes", std::to_string(notes.size()) + (notes.size() == 1 ? " note" : " notes")); drawList(fb, 0); }
    } else if (viewing >= 0 && viewing < (int)notes.size()) { drawHeader(fb, gfx::fit(titleOf(notes[viewing]), fb.w - 190), std::to_string(notes[viewing].text.size()) + " chars"); drawText(fb, contentArea(fb), notes[viewing]);
      Rect b(fb.w - 96, 3, 90, barHeight(fb) - 6); drawButton(fb, b, "Edit", false, accentDim); hits.add(0, b, ID_EDIT); }
    else { drawHeader(fb, "Notes", std::to_string(notes.size()) + (notes.size() == 1 ? " note" : " notes")); drawList(fb, 0); Rect b(fb.w - 96, 3, 90, barHeight(fb) - 6); drawButton(fb, b, "New note", false, accentDim); hits.add(0, b, ID_NEW); }
    drawFooter(fb, hint()); if (toastT > 0) drawToast(fb, toast);
  }
  void drawSub(gfx::Fb& fb, Env& env) override {
    if (editor) { editor->drawSub(fb, env); return; }
    gfx::clear(fb, bg); drawHeader(fb, viewing >= 0 ? "Note" : "Preview", ""); Rect c = contentArea(fb, false);
    int bh = 34, by = fb.h - bh - 6, n = 4, bw = (fb.w - 8 - 4 * n) / n; const char* lab[] = {"New", "Edit", "Delete", "Back"}; int ids[] = {ID_NEW, ID_EDIT, ID_DELETE, ID_BACK};
    for (int i = 0; i < n; i++) { Rect r(8 + i * (bw + 4), by, bw, bh); drawButton(fb, r, i == 2 && delArm > 0 ? "Sure?" : lab[i], i == 2 && delArm > 0, i == 0 ? accentDim : panel); hits.add(1, r, ids[i]); }
    if (!notes.empty() && sel < (int)notes.size()) { std::vector<std::string> ls = gfx::wrap(notes[sel].text, fb.w - 20); int rows = (by - c.y - 12) / 16; for (int i = 0; i < rows && i < (int)ls.size(); i++) gfx::text(fb, 10, c.y + 6 + i * 16, ls[i], text); }
    else gfx::textCenter(fb, fb.w / 2, c.y + 40, "Tap New to write one.", muted);
    if (toastT > 0) drawToast(fb, toast);
  }
};
}  // namespace
Screen* makeNotes(Env& env) { return new Notes(env); }
