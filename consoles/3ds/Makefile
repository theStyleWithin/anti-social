# Nintendo 3DS build (devkitARM + libctru). Produces anti-social.3dsx and, when bannertool and makerom are on PATH, anti-social.cia
# Needs DEVKITPRO set, e.g. inside the devkitpro/devkitarm docker image.  make VERSION=0.22.0
DEVKITPRO ?= /opt/devkitpro
VERSION ?= dev
CXX := $(DEVKITPRO)/devkitARM/bin/arm-none-eabi-g++
ARCH := -march=armv6k -mtune=mpcore -mfloat-abi=hard -mtp=soft
CXXFLAGS := -O2 -g -ffunction-sections -fno-rtti -fno-exceptions $(ARCH) -D__3DS__ -std=gnu++11 -I$(DEVKITPRO)/libctru/include -I../common -DAS_VERSION=\"$(VERSION)\" -Wall -Wno-misleading-indentation
LDFLAGS := -specs=3dsx.specs -g $(ARCH) -Wl,-Map,build/anti-social.map -L$(DEVKITPRO)/libctru/lib
SRC := main_3ds.cpp $(wildcard ../common/*.cpp)
TOOLS := $(DEVKITPRO)/tools/bin
all: anti-social.3dsx
build/anti-social.elf: $(SRC) $(wildcard ../common/*.h)
	@mkdir -p build
	$(CXX) $(CXXFLAGS) $(SRC) $(LDFLAGS) -lctru -lm -o $@
build/anti-social.smdh: icon.png
	$(TOOLS)/smdhtool --create "Anti-Social" "A social network with nobody on it" "Gamehopper" icon.png $@
anti-social.3dsx: build/anti-social.elf build/anti-social.smdh
	$(TOOLS)/3dsxtool build/anti-social.elf $@ --smdh=build/anti-social.smdh
# the .cia installs to the HOME menu with FBI; it needs bannertool and makerom
cia:
	@mkdir -p build romfs
	bannertool makebanner -i banner.png -a silence.wav -o build/banner.bnr
	bannertool makesmdh -s "Anti-Social" -l "A social network with nobody on it" -p "Gamehopper" -i icon.png -o build/icon.icn
	makerom -f cia -o anti-social.cia -elf build/anti-social.elf -rsf app.rsf -icon build/icon.icn -banner build/banner.bnr -exefslogo -target t
clean:
	rm -rf build anti-social.3dsx anti-social.cia
