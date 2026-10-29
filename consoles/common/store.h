// Files on the console's SD card (or any folder when testing on a computer).
#pragma once
#include <string>
#include <vector>
namespace store {
bool mkdirs(const std::string& path);
bool read(const std::string& path, std::string& out);
bool write(const std::string& path, const std::string& data);   // writes to a temp file first, then renames
bool remove(const std::string& path);
std::vector<std::string> list(const std::string& dir);          // plain file names, sorted
}
