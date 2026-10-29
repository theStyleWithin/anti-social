# Builds the test program for a computer: make -C consoles/host
CXX ?= g++
SRC = main_host.cpp $(wildcard ../common/*.cpp)
all: antisocial-host
antisocial-host: $(SRC) $(wildcard ../common/*.h)
	$(CXX) -std=c++11 -O1 -Wall -Wextra -Wno-misleading-indentation -DAS_VERSION=\"$(VERSION)\" -o $@ $(SRC)
VERSION ?= dev
clean:
	rm -f antisocial-host
