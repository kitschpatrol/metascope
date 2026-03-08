# All variables and this file are optional, if they are not present the PG and the
# makefiles will try to parse the correct values from the file system.
#
# Variables that specify exclusions can use % as a wildcard to specify that anything in
# that position will match. A partial path can also be specified to, for example, exclude
# a whole folder from the parsed paths from the file system
#
# Variables can be specified using = or +=
# = will clear the contents of that variable both specified from the file or the ones parsed
# from the file system
# += will add the values to the previous ones in the file or the ones parsed from the file 
# system
# 
# The PG can be used to detect errors in this file, just create a new project with this addon 
# and the PG will write to the console the kind of error and in which line it is

meta:
	ADDON_NAME = ofxSol2Lua
	ADDON_DESCRIPTION = Lua with Sol2 for openFrameworks
	ADDON_AUTHOR = Fumiya Funatsu
	ADDON_TAGS = "utility"
	ADDON_URL = https://github.com/funatsufumiya/ofxSol2Lua

common:
	ADDON_INCLUDES =
	ADDON_INCLUDES += libs/sol2/include
	ADDON_INCLUDES += libs/luajit/include

# NOTE: uncomment the following to use Lua instead of LuaJIT
# NOTE: and check much much bottom "NOTE" comment, if you use Lua instead of LuaJIT
# # UNCOMMENT BEGIN ---

	# ADDON_INCLUDES += lua/include

	# ADDON_SOURCES += lua/src/lapi.c
	# ADDON_SOURCES += lua/src/lauxlib.c
	# ADDON_SOURCES += lua/src/lbaselib.c
	# ADDON_SOURCES += lua/src/lcode.c
	# ADDON_SOURCES += lua/src/lcorolib.c
	# ADDON_SOURCES += lua/src/lctype.c
	# ADDON_SOURCES += lua/src/ldblib.c
	# ADDON_SOURCES += lua/src/ldebug.c
	# ADDON_SOURCES += lua/src/ldo.c
	# ADDON_SOURCES += lua/src/ldump.c
	# ADDON_SOURCES += lua/src/lfunc.c
	# ADDON_SOURCES += lua/src/lgc.c
	# ADDON_SOURCES += lua/src/linit.c
	# ADDON_SOURCES += lua/src/liolib.c
	# ADDON_SOURCES += lua/src/llex.c
	# ADDON_SOURCES += lua/src/lmathlib.c
	# ADDON_SOURCES += lua/src/lmem.c
	# ADDON_SOURCES += lua/src/loadlib.c
	# ADDON_SOURCES += lua/src/lobject.c
	# ADDON_SOURCES += lua/src/lopcodes.c
	# ADDON_SOURCES += lua/src/loslib.c
	# ADDON_SOURCES += lua/src/lparser.c
	# ADDON_SOURCES += lua/src/lstate.c
	# ADDON_SOURCES += lua/src/lstring.c
	# ADDON_SOURCES += lua/src/lstrlib.c
	# ADDON_SOURCES += lua/src/ltable.c
	# ADDON_SOURCES += lua/src/ltablib.c
	# ADDON_SOURCES += lua/src/ltests.c
	# ADDON_SOURCES += lua/src/ltm.c
	# ADDON_SOURCES += lua/src/lundump.c
	# ADDON_SOURCES += lua/src/lutf8lib.c
	# ADDON_SOURCES += lua/src/lvm.c
	# ADDON_SOURCES += lua/src/lzio.c

# # UNCOMMENT END ---

	# ADDON_SOURCES_EXCLUDE += libs/include/xxx/utf8.h
	# ADDON_SOURCES_EXCLUDE += libs/include/xxx/time.h

	# dependencies with other addons, a list of them separated by spaces 
	# or use += in several lines
	# ADDON_DEPENDENCIES =
	
	# include search paths, this will be usually parsed from the file system
	# but if the addon or addon libraries need special search paths they can be
	# specified here separated by spaces or one per line using +=
	# ADDON_INCLUDES =
	
	# any special flag that should be passed to the compiler when using this
	# addon
	# ADDON_CFLAGS =
	
	# any special flag that should be passed to the linker when using this
	# addon, also used for system libraries with -lname
	# ADDON_LDFLAGS =
	
	# linux only, any library that should be included in the project using
	# pkg-config
	# ADDON_PKG_CONFIG_LIBRARIES =
	
	# osx/iOS only, any framework that should be included in the project
	# ADDON_FRAMEWORKS =
	
	# source files, these will be usually parsed from the file system looking
	# in the src folders in libs and the root of the addon. if your addon needs
	# to include files in different places or a different set of files per platform
	# they can be specified here
	# ADDON_SOURCES =
	# ADDON_SOURCES_EXCLUDE = src/EngineVk.cpp
	
	# some addons need resources to be copied to the bin/data folder of the project
	# specify here any files that need to be copied, you can use wildcards like * and ?
	# ADDON_DATA = 
	
	# when parsing the file system looking for libraries exclude this for all or
	# a specific platform
	# ADDON_LIBS_EXCLUDE =

# NOTE: enable ADDONS_CLAGS if you use Lua instead of LuaJIT

linux64:
	# ADDON_CFLAGS += -DLUA_USE_LINUX
	
linux:
	# ADDON_CFLAGS += -DLUA_USE_LINUX
	
msys2:
	# ADDON_CFLAGS += -DLUA_USE_WINDOWS
	
vs:
	# ADDON_CFLAGS += -DLUA_USE_WINDOWS
	
linuxarmv6l:
	# ADDON_CFLAGS += -DLUA_USE_LINUX
	
linuxarmv7l:
	# ADDON_CFLAGS += -DLUA_USE_LINUX

android/armeabi:
	# ADDON_CFLAGS += -DLUA_USE_ANDROID

android/armeabi-v7a:
	# ADDON_CFLAGS += -DLUA_USE_ANDROID

osx:
	# ADDON_CFLAGS += -DLUA_USE_MACOSX

ios:
	# ADDON_CFLAGS += -DLUA_USE_IOS