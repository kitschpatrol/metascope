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

meta:
ADDON_NAME = ofxSurfingSupabase
ADDON_DESCRIPTION = Supabase integration for openFrameworks - Remote preset management
ADDON_AUTHOR = moebiusSurfing
ADDON_TAGS = "database" "cloud" "supabase" "presets"
ADDON_URL = https://github.com/moebiusSurfing/ofxSurfingSupabase

common:
# dependencies with other addons, a list of them separated by spaces
ADDON_DEPENDENCIES = ofxGui

# include search paths, this will be usually parsed from the file system
# but if the addon or addon libraries need special search paths they can be
# specified here separated by spaces or one per line using +=
ADDON_INCLUDES = src
ADDON_INCLUDES += libs/cpp-httplib/include

# any special flag that should be passed to the compiler when using this
# addon
# ADDON_CFLAGS =

# any special flag that should be passed to the linker when using this
# addon, also used for system libraries with -lname
# ADDON_LDFLAGS =

# source files, these will be usually parsed from the file system looking
# in the src folders in libs and the root of the addon. if your addon needs
# to include files in different places or a different set of files per platform
# they can be specified here
# ADDON_SOURCES =

# source files that will be included as C files explicitly
# ADDON_C_SOURCES = 

# source files that will be included as header files explicitly
# ADDON_HEADER_SOURCES =

# path to include files that should be injected into the project
# ADDON_INCLUDES_EXCLUDE =

linux64:
# linux only, any library that should be included in the project using
# pkg-config
# ADDON_PKG_CONFIG_LIBRARIES =

# For OpenSSL support in cpp-httplib
ADDON_LIBS += -lssl -lcrypto

linux:
# For OpenSSL support in cpp-httplib  
ADDON_LIBS += -lssl -lcrypto

linuxarmv6l:
# For OpenSSL support in cpp-httplib
ADDON_LIBS += -lssl -lcrypto

linuxarmv7l:
# For OpenSSL support in cpp-httplib
ADDON_LIBS += -lssl -lcrypto

android/armeabi:

android/armeabi-v7a:

osx:
# For OpenSSL support in cpp-httplib (macOS already has OpenSSL)
# No additional libs needed on macOS

vs:
# For Windows, you may need to link OpenSSL manually
# Download OpenSSL for Windows from: https://slproweb.com/products/Win32OpenSSL.html
# ADDON_LIBS += path/to/openssl/lib/libssl.lib
# ADDON_LIBS += path/to/openssl/lib/libcrypto.lib

ios:
# iOS already includes OpenSSL support
