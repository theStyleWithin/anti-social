#include "store.h"
#include <stdio.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <dirent.h>
#include <algorithm>

namespace store {
bool mkdirs(const std::string& path) {
  std::string cur;
  for (size_t i = 0; i < path.size(); i++) {
    cur += path[i];
    if (path[i] == '/' && i > 0 && cur.back() == '/' && cur.size() > 1) { if (cur.size() >= 2 && cur[cur.size() - 2] == ':') continue; mkdir(cur.c_str(), 0777); }
  }
  mkdir(path.c_str(), 0777);
  struct stat st; return stat(path.c_str(), &st) == 0;
}
bool read(const std::string& path, std::string& out) {
  FILE* f = fopen(path.c_str(), "rb"); if (!f) return false;
  out.clear(); char buf[4096]; size_t n; while ((n = fread(buf, 1, sizeof buf, f)) > 0) out.append(buf, n);
  fclose(f); return true;
}
bool write(const std::string& path, const std::string& data) {
  std::string tmp = path + ".tmp"; FILE* f = fopen(tmp.c_str(), "wb"); if (!f) return false;
  bool ok = fwrite(data.data(), 1, data.size(), f) == data.size(); ok = (fclose(f) == 0) && ok;
  if (!ok) { ::remove(tmp.c_str()); return false; }
  ::remove(path.c_str());                                            // some consoles refuse to rename over a file
  return rename(tmp.c_str(), path.c_str()) == 0;
}
bool remove(const std::string& path) { return ::remove(path.c_str()) == 0; }
std::vector<std::string> list(const std::string& dir) {
  std::vector<std::string> out; DIR* d = opendir(dir.c_str()); if (!d) return out;
  while (struct dirent* e = readdir(d)) { std::string n = e->d_name; if (n == "." || n == ".." || (n.size() > 4 && n.substr(n.size() - 4) == ".tmp")) continue; out.push_back(n); }
  closedir(d); std::sort(out.begin(), out.end()); return out;
}
}  // namespace store
