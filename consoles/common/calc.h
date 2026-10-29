// The calculator's brain, kept apart from the screen so it can be tested.
#pragma once
#include <string>
struct CalcEngine {
  std::string entry = "0";     // what is being typed
  double acc = 0; char op = 0; bool fresh = true;   // fresh: the next digit starts a new number
  std::string error;
  std::string display() const;
  std::string pending() const;                       // e.g. "12 +"
  void press(const std::string& key);                // "0".."9", ".", "+", "-", "*", "/", "=", "C", "+/-", "%", "<"
  static std::string fmt(double v);
};
