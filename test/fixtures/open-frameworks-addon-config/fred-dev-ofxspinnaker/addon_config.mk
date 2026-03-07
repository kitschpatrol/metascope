meta:
    ADDON_NAME = ofxSpinnaker
    ADDON_DESCRIPTION = FLIR / Teledyne Spinnaker SDK integration for openFrameworks
    ADDON_AUTHOR = ofxSpinnaker maintainers
    ADDON_TAGS = "camera" "spinnaker" "flir" "machine-vision"
    ADDON_URL = https://github.com/yournamehere/ofxSpinnaker

common:
    ADDON_SOURCES += src/ofxSpinnaker.cpp
    ADDON_INCLUDES += $(ADDON_PATH)src
    ADDON_INCLUDES += $(ADDON_PATH)libs/spinnaker/include
    ADDON_INCLUDES += $(ADDON_PATH)libs/spinnaker/include/SpinGenApi
    ADDON_INCLUDES += $(ADDON_PATH)libs/spinnaker/include/GUI
    ADDON_INCLUDES += $(ADDON_PATH)libs/spinnaker/include/spinc
    

    # Silence deprecated OpenGL warnings on macOS builds
    ADDON_CPPFLAGS += -DGL_SILENCE_DEPRECATION

osx:
    SPINNAKER_LIB_DIR = $(ADDON_PATH)libs/spinnaker/lib/osx

    ADDON_LDFLAGS += -L$(SPINNAKER_LIB_DIR)
    ADDON_LDFLAGS += -Wl,-rpath,@executable_path/../Frameworks
    ADDON_LDFLAGS += -Wl,-rpath,@loader_path/../Frameworks
    ADDON_LDFLAGS += -Wl,-rpath,@loader_path/../../..

    ADDON_LIBS += Spinnaker
    ADDON_LIBS += Spinnaker_C
    ADDON_LIBS += SpinVideo
    ADDON_LIBS += SpinVideo_C
    ADDON_LIBS += SpinUpdate
    ADDON_LIBS += GenApi_clang90_v3_0
    ADDON_LIBS += GCBase_clang90_v3_0
    ADDON_LIBS += NodeMapData_clang90_v3_0
    ADDON_LIBS += MathParser_clang90_v3_0
    ADDON_LIBS += XmlParser_clang90_v3_0
    ADDON_LIBS += log4cpp_clang90_v3_0
    ADDON_LIBS += Log_clang90_v3_0
    ADDON_LIBS += ResUsageStat_clang90_v3_0

    ADDON_COPY_TO_BIN += $(SPINNAKER_LIB_DIR)/libSpinnaker*.dylib*
    ADDON_COPY_TO_BIN += $(SPINNAKER_LIB_DIR)/libSpinnaker_C*.dylib*
    ADDON_COPY_TO_BIN += $(SPINNAKER_LIB_DIR)/libSpinVideo*.dylib*
    ADDON_COPY_TO_BIN += $(SPINNAKER_LIB_DIR)/libSpinVideo_C*.dylib*
    ADDON_COPY_TO_BIN += $(SPINNAKER_LIB_DIR)/libSpinUpdate*.dylib*
    ADDON_COPY_TO_BIN += $(SPINNAKER_LIB_DIR)/libGenApi*.dylib*
    ADDON_COPY_TO_BIN += $(SPINNAKER_LIB_DIR)/libGCBase*.dylib*
    ADDON_COPY_TO_BIN += $(SPINNAKER_LIB_DIR)/libNodeMapData*.dylib*
    ADDON_COPY_TO_BIN += $(SPINNAKER_LIB_DIR)/libMathParser*.dylib*
    ADDON_COPY_TO_BIN += $(SPINNAKER_LIB_DIR)/libXmlParser*.dylib*
    ADDON_COPY_TO_BIN += $(SPINNAKER_LIB_DIR)/liblog4cpp*.dylib*
    ADDON_COPY_TO_BIN += $(SPINNAKER_LIB_DIR)/libLog*.dylib*
    ADDON_COPY_TO_BIN += $(SPINNAKER_LIB_DIR)/libResUsageStat*.dylib*
    ADDON_COPY_TO_BIN += $(SPINNAKER_LIB_DIR)/flir-gentl

vs:
    SPINNAKER_LIB_DIR = $(ADDON_PATH)libs/spinnaker/lib/vs

    ADDON_LDFLAGS += /LIBPATH:"$(SPINNAKER_LIB_DIR)"

    ADDON_LIBS += Spinnaker.lib
    ADDON_LIBS += Spinnaker_C.lib
    ADDON_LIBS += SpinVideo.lib
    ADDON_LIBS += SpinVideo_C.lib
    ADDON_LIBS += SpinUpdate.lib
    ADDON_LIBS += GenApi_MD.lib
    ADDON_LIBS += GCBase_MD.lib
    ADDON_LIBS += NodeMapData_MD.lib
    ADDON_LIBS += MathParser_MD.lib
    ADDON_LIBS += XmlParser_MD.lib
    ADDON_LIBS += log4cpp_MD.lib
    ADDON_LIBS += Log_MD.lib
    ADDON_LIBS += ResUsageStat_MD.lib

    ADDON_DLL_COPY += $(SPINNAKER_LIB_DIR)/*.dll
    ADDON_DLL_COPY += $(SPINNAKER_LIB_DIR)/flir-gentl

linux64:
    ADDON_WARN = "Spinnaker Linux build support pending update"

linuxarmv6l:
    ADDON_WARN = "Spinnaker not supported on linuxarmv6l"

linuxarmv7l:
    ADDON_WARN = "Spinnaker not supported on linuxarmv7l"

android/armeabi:
    ADDON_WARN = "Spinnaker not available for Android"

android/armeabi-v7a:
    ADDON_WARN = "Spinnaker not available for Android"

ios:
    ADDON_WARN = "Spinnaker not available for iOS"

tvos:
    ADDON_WARN = "Spinnaker not available for tvOS"
