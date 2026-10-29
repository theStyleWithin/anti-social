#include "calc.h"
#include <stdio.h>
#include <stdlib.h>
#include <math.h>

std::string CalcEngine::fmt(double v) {
  if (!isfinite(v)) return "Error";
  char b[48]; snprintf(b, sizeof b, "%.10g", v); std::string s = b;
  if (s.find('e') != std::string::npos) return s;
  return s == "-0" ? "0" : s;
}
std::string CalcEngine::display() const { return error.empty() ? entry : error; }
std::string CalcEngine::pending() const { if (!op) return ""; std::string o = op == '*' ? "\xC3\x97" : op == '/' ? "\xC3\xB7" : op == '-' ? "\xE2\x88\x92" : std::string(1, op); return fmt(acc) + " " + o; }
void CalcEngine::press(const std::string& k) {
  if (!error.empty() && k != "C") return;
  auto value = [&]() { return atof(entry.c_str()); };
  auto apply = [&]() {
    double v = value(), r = v;
    switch (op) { case '+': r = acc + v; break; case '-': r = acc - v; break; case '*': r = acc * v; break;
      case '/': if (v == 0) { error = "Cannot divide by zero"; return; } r = acc / v; break; default: r = v; }
    acc = r; entry = fmt(r);
  };
  if (k == "C") { entry = "0"; acc = 0; op = 0; fresh = true; error.clear(); return; }
  if (k.size() == 1 && k[0] >= '0' && k[0] <= '9') { if (fresh) { entry = k; fresh = false; } else if (entry.size() < 14) entry = entry == "0" ? k : entry + k; return; }
  if (k == ".") { if (fresh) { entry = "0."; fresh = false; } else if (entry.find('.') == std::string::npos) entry += "."; return; }
  if (k == "<") { if (!fresh && entry.size() > 1) { entry.pop_back(); if (entry == "-") entry = "0"; } else { entry = "0"; fresh = true; } return; }
  if (k == "+/-") { if (entry != "0") entry = entry[0] == '-' ? entry.substr(1) : "-" + entry; return; }
  if (k == "%") { entry = fmt(value() / 100.0); fresh = true; return; }
  if (k == "+" || k == "-" || k == "*" || k == "/") { if (op && !fresh) apply(); else acc = value(); if (!error.empty()) return; op = k[0]; fresh = true; return; }
  if (k == "=") { if (op) { apply(); op = 0; fresh = true; } return; }
}
