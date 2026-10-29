// A text editor with an on-screen keyboard that works with just a controller. Used for posts and notes.
#pragma once
#include "app.h"

// onDone is called once: save = true if the person finished, false if they cancelled.
Screen* makeEditor(const std::string& title, const std::string& initial, std::function<void(const std::string&, bool save)> onDone, size_t maxLen = 200000);
