meta:
	ADDON_NAME = ofxCpp14
	ADDON_DESCRIPTION = make using C++14 on openFrameworks easy.
	ADDON_AUTHOR = ISHII 2bit
	ADDON_TAGS = "utility"
	ADDON_URL = http://github.com/2bbb/ofxCpp14

common:
	ADDON_CPPFLAGS = "-std=c++14" 
VS:
	ADDON_CPPFLAGS = "/std:c++14"
