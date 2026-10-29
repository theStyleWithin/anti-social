# Wii U build (devkitPPC + wut). Produces anti-social.rpx and anti-social.wuhb
# Needs DEVKITPRO and WUT_ROOT, e.g. inside the devkitpro/devkitppc docker image with wut installed.  make VERSION=0.22.0
DEVKITPRO ?= /opt/devkitpro
WUT_ROOT ?= $(DEVKITPRO)/wut
VERSION ?= dev
CXX := $(DEVKITPRO)/devkitPPC/bin/powerpc-eabi-g++
ARCH := -mcpu=750 -meabi -mhard-float
CXXFLAGS := -O2 -ffunction-sections -fno-rtti -fno-exceptions $(ARCH) -D__WIIU__ -D__WUT__ -std=gnu++11 -I$(WUT_ROOT)/include -I../common -DAS_VERSION=\"$(VERSION)\" -Wall -Wno-misleading-indentation
LDFLAGS := $(ARCH) -specs=$(WUT_ROOT)/share/wut.specs -Wl,-Map,build/anti-social.map -L$(WUT_ROOT)/lib
SRC := main_wiiu.cpp $(wildcard ../common/*.cpp)
all: anti-social.rpx anti-social.wuhb
build/anti-social.elf: $(SRC) $(wildcard ../common/*.h)
	@mkdir -p build
	$(CXX) $(CXXFLAGS) $(SRC) $(LDFLAGS) -lwut -o $@
anti-social.rpx: build/anti-social.elf
	$(DEVKITPRO)/tools/bin/elf2rpl $< $@
# the .wuhb is the installable bundle for the Aroma environment; the .rpx alone also runs from the SD card
anti-social.wuhb: anti-social.rpx icon.png tv.png drc.png
	@mkdir -p build/content
	$(DEVKITPRO)/tools/bin/wuhbtool anti-social.rpx $@ --content=build/content --name="Anti-Social" --short-name="Anti-Social" --author="Gamehopper" --icon=icon.png --tv-image=tv.png --drc-image=drc.png
clean:
	rm -rf build anti-social.rpx anti-social.wuhb
