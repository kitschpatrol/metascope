meta:
	ADDON_NAME = ofxViveTracker
	ADDON_DESCRIPTION = OpenVR wrapper for Vive Tracker
	ADDON_AUTHOR =
	ADDON_TAGS = "vr" "tracking" "vive" "openvr"
	ADDON_URL =

common:

vs:
	ADDON_INCLUDES += libs/openvr/include
	ADDON_LIBS += libs/openvr/lib/win64/openvr_api.lib
