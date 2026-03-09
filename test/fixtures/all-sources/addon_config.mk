meta:
	ADDON_NAME = ofxAllSources
	ADDON_DESCRIPTION = A comprehensive test fixture for openFrameworks addons.
	ADDON_AUTHOR = Test Author
	ADDON_TAGS = "test" "fixture" "metadata"
	ADDON_URL = https://github.com/test-org/all-sources

common:
	ADDON_DEPENDENCIES = ofxXmlSettings ofxOsc

linux64:
	ADDON_CFLAGS = -DLINUX

osx:
	ADDON_CFLAGS = -DOSX

vs:
	ADDON_CFLAGS = -DWINDOWS
