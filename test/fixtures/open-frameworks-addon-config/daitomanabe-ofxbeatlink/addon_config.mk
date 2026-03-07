meta:
	ADDON_NAME = ofxBeatLink
	ADDON_DESCRIPTION = openFrameworks addon for Pioneer DJ Link protocol (beat-link-cpp wrapper)
	ADDON_AUTHOR = Daito Manabe
	ADDON_TAGS = "dj" "pioneer" "cdj" "beat" "sync" "pro dj link"
	ADDON_URL = https://github.com/daitomanabe/beat-link-cpp

common:
	# Include paths
	ADDON_INCLUDES = src
	ADDON_INCLUDES += libs/beat-link-cpp/include
	ADDON_INCLUDES += libs/beat-link-cpp/src
	ADDON_INCLUDES += libs/beat-link-cpp/src/generated
	ADDON_INCLUDES += libs/asio-include
	ADDON_INCLUDES += libs/stb-include
	ADDON_INCLUDES += libs/miniz-include
	# crate-digger-cpp includes
	ADDON_INCLUDES += libs/crate-digger-cpp/include

	# Exclude examples, tests, and python bindings
	ADDON_SOURCES_EXCLUDE = libs/beat-link-cpp/examples/%
	ADDON_SOURCES_EXCLUDE += libs/beat-link-cpp/tests/%
	ADDON_SOURCES_EXCLUDE += libs/beat-link-cpp/src/python_bindings.cpp
	ADDON_SOURCES_EXCLUDE += libs/crate-digger-cpp/tests/%
	ADDON_SOURCES_EXCLUDE += libs/crate-digger-cpp/src/cli/%
	ADDON_SOURCES_EXCLUDE += libs/crate-digger-cpp/src/python/%

	# Source files - basic beat-link-cpp core (no VirtualCdj/advanced features)
	# For full feature support, additional dependencies are required: sqlite3, utf8proc
	ADDON_SOURCES = src/ofxBeatLink.cpp
	# Core sources (basic functionality)
	ADDON_SOURCES += libs/beat-link-cpp/src/Beat.cpp
	ADDON_SOURCES += libs/beat-link-cpp/src/BeatFinder.cpp
	ADDON_SOURCES += libs/beat-link-cpp/src/CdjStatus.cpp
	ADDON_SOURCES += libs/beat-link-cpp/src/DeviceAnnouncement.cpp
	ADDON_SOURCES += libs/beat-link-cpp/src/DeviceFinder.cpp
	ADDON_SOURCES += libs/beat-link-cpp/src/DeviceUpdate.cpp
	ADDON_SOURCES += libs/beat-link-cpp/src/MixerStatus.cpp
	ADDON_SOURCES += libs/beat-link-cpp/src/PrecisePosition.cpp
	ADDON_SOURCES += libs/beat-link-cpp/src/Util.cpp
	# crate-digger-cpp sources (rekordbox database parsing)
	ADDON_SOURCES += libs/crate-digger-cpp/src/core/api_schema.cpp
	ADDON_SOURCES += libs/crate-digger-cpp/src/core/database.cpp
	ADDON_SOURCES += libs/crate-digger-cpp/src/core/database_util.cpp
	ADDON_SOURCES += libs/crate-digger-cpp/src/core/logging.cpp
	ADDON_SOURCES += libs/crate-digger-cpp/src/core/rekordbox_anlz.cpp
	ADDON_SOURCES += libs/crate-digger-cpp/src/core/rekordbox_pdb.cpp

	# C++ flags (Asio standalone mode, C++17 required)
	# BEATLINK_NO_TIMEFINDER: Disable TimeFinder to avoid complex dependencies
	# BEATLINK_NO_VIRTUALCDJ: Disable VirtualCdj to avoid complex dependencies (sqlite3, utf8proc)
	ADDON_CPPFLAGS = -DASIO_STANDALONE -DBEATLINK_NO_TIMEFINDER -DBEATLINK_NO_VIRTUALCDJ -std=c++17

osx:
	# macOS specific settings
	ADDON_FRAMEWORKS =

linux64:
	# Linux specific settings
	ADDON_LDFLAGS = -lpthread

linux:
	ADDON_LDFLAGS = -lpthread

linuxarmv6l:
	ADDON_LDFLAGS = -lpthread

linuxarmv7l:
	ADDON_LDFLAGS = -lpthread

msys2:
	# Windows MSYS2 settings
	ADDON_LDFLAGS = -lws2_32

vs:
	# Visual Studio settings
	ADDON_LDFLAGS = ws2_32.lib
