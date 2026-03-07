meta:
	ADDON_NAME = ofxTimelineLoader
	ADDON_DESCRIPTION = "loader for ofxTimeline but also provide scriptable interface"
	ADDON_AUTHOR = Fumiya Funatsu
	ADDON_TAGS = "time timeline curves"
	ADDON_URL = https://github.com/funatsufumiya/ofxTimelineLoader

common:
	ADDON_DEPENDENCIES = ofxEasing

	ADDON_INCLUDES =
	ADDON_INCLUDES += src
osx:
	# ADDON_LDFLAGS = -Xlinker -rpath -Xlinker @executable_path
vs:

