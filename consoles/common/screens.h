#pragma once
#include "app.h"
Screen* makeTimeline(Env& env);
Screen* makeNotes(Env& env);
Screen* makeCalculator(Env& env);
Screen* makeClock(Env& env);
Screen* makeMatrix(Env& env);
Screen* makeAbout(Env& env);
Screen* makeDiary(Env& env);
Screen* makeCalendar(Env& env);
Screen* makeGroceries(Env& env);
Screen* makeChores(Env& env);
Screen* makeSettings(Env& env);
Screen* makeDesk(Env& env);
void loadSettings(Env& env);   // reads settings.dat (colour theme, 24 hour clock) from the data folder
bool use24h();
