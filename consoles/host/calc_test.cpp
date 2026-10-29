#include "../common/calc.h"
#include <stdio.h>
int main(){int bad=0; auto run=[&](std::string k,const char*want){CalcEngine c; for(char ch:k){ std::string s(1,ch); c.press(s);} std::string got=c.display(); if(got!=want){printf("FAIL %s -> %s want %s\n",k.c_str(),got.c_str(),want);bad++;}};
run("12+30=","42"); run("9/3=","3"); run("2*3+4=","10"); run("5/0=","Cannot divide by zero"); run("0.1+0.2=","0.3"); return bad;}
