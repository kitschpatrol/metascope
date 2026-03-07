# ofxGlic addon configuration

meta:
	ADDON_NAME = ofxGlic
	ADDON_DESCRIPTION = GLIC (GLitch Image Codec) addon for openFrameworks
	ADDON_AUTHOR =
	ADDON_TAGS = "image" "codec" "glitch" "compression"
	ADDON_URL =

common:
	# Required C++17 for some features
	ADDON_CFLAGS = -std=c++17
	ADDON_CPPFLAGS = -std=c++17

	# Include paths
	ADDON_INCLUDES = src/
	ADDON_INCLUDES += src/glic/
