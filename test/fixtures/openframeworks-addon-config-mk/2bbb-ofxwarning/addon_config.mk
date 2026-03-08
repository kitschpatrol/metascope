meta:
	ADDON_NAME = ofxWarning
	ADDON_DESCRIPTION = warning
	ADDON_AUTHOR = ISHII 2bit
	ADDON_TAGS = "utility"
	ADDON_URL = http://github.com/2bbb/ofxWarning

common:
	ADDON_CPPFLAGS  = "-Wuninitialized"
	ADDON_CPPFLAGS += "-Wignored-qualifiers"
	ADDON_CPPFLAGS += "-Wsign-compare"
	ADDON_CPPFLAGS += "-Wtype-limits"
	ADDON_CPPFLAGS += "-Wuninitialized"
	ADDON_CPPFLAGS += "-Wsequence-point"
	ADDON_CPPFLAGS += "-Wreorder"
	ADDON_CPPFLAGS += "-pedantic"
	ADDON_CPPFLAGS += "-Werror=return-type"
vs:
# https://docs.microsoft.com/cpp/error-messages/compiler-warnings/compiler-warnings-c4000-through-c4199
# https://docs.microsoft.com/cpp/error-messages/compiler-warnings/compiler-warnings-c4200-through-c4399
	ADDON_CPPFLAGS  = ""
# about many arguments
	ADDON_CPPFLAGS += "/we4020"
# about uninitialized
	ADDON_CPPFLAGS += "/w14533"
	ADDON_CPPFLAGS += "/w14701"
	ADDON_CPPFLAGS += "/w14703"
# about return-type
	ADDON_CPPFLAGS += "/we4715"
