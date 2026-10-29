# Nintendo Switch build (devkitA64 + libnx). Produces anti-social.nro
# Needs DEVKITPRO set, e.g. inside the devkitpro/devkita64 docker image.  make VERSION=0.22.0
DEVKITPRO ?= /opt/devkitpro
VERSION ?= dev
CXX := $(DEVKITPRO)/devkitA64/bin/aarch64-none-elf-g++
ARCH := -march=armv8-a+crc+crypto -mtune=cortex-a57 -mtp=soft -fPIE
CXXFLAGS := -O2 -g -ffunction-sections -fno-rtti -fno-exceptions $(ARCH) -D__SWITCH__ -std=gnu++11 -I$(DEVKITPRO)/libnx/include -I../common -DAS_VERSION=\"$(VERSION)\" -Wall -Wno-misleading-indentation
LDFLAGS := -specs=$(DEVKITPRO)/libnx/switch.specs -g $(ARCH) -Wl,-Map,build/anti-social.map -L$(DEVKITPRO)/libnx/lib
SRC := main_switch.cpp $(wildcard ../common/*.cpp)
all: anti-social.nro
build/anti-social.elf: $(SRC) $(wildcard ../common/*.h)
	@mkdir -p build
	$(CXX) $(CXXFLAGS) $(SRC) $(LDFLAGS) -lnx -o $@
build/anti-social.nacp:
	@mkdir -p build
	$(DEVKITPRO)/tools/bin/nacptool --create "Anti-Social" "Gamehopper" "$(VERSION)" $@
anti-social.nro: build/anti-social.elf build/anti-social.nacp icon.jpg
	$(DEVKITPRO)/tools/bin/elf2nro build/anti-social.elf $@ --icon=icon.jpg --nacp=build/anti-social.nacp
clean:
	rm -rf build anti-social.nro
