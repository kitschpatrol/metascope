meta:
ADDON_NAME = ofxDST
ADDON_DESCRIPTION = Minimal Tajima DST (.dst) reader for openFrameworks
ADDON_AUTHOR = daito manabe
ADDON_TAGS = "embroidery" "dst" "file-format"
ADDON_URL = https://github.com/daitomanabe/ofxDST

common:
ADDON_INCLUDES += libs/dst-cpp/include
ADDON_SOURCES += libs/dst-cpp/src/dst.cpp
