# Addon configuration for ofxPureNanoVG

meta:
	ADDON_NAME = ofxPureNanoVG
	ADDON_DESCRIPTION = Pure NanoVG vector graphics library for openFrameworks
	ADDON_AUTHOR = Mikko Mononen / OF wrapper
	ADDON_TAGS = "graphics" "vector" "ui" "gui"
	ADDON_URL = https://github.com/memononen/nanovg

common:
	# Include paths
	ADDON_INCLUDES = src
	ADDON_INCLUDES += libs/nanovg/include
	ADDON_INCLUDES += src/ui
	ADDON_INCLUDES += src/ui/widgets
	ADDON_INCLUDES += src/ui/layout
	
	# Source files  
	ADDON_SOURCES = src/ofxNanoVG.cpp
	ADDON_SOURCES += libs/nanovg/src/nanovg.c
	ADDON_SOURCES += src/ui/NanoVGComponent.cpp
	ADDON_SOURCES += src/ui/NanoVGEventDispatcher.cpp
	ADDON_SOURCES += src/ui/NanoVGPanel.cpp
	ADDON_SOURCES += src/ui/NanoVGStyle.cpp
	ADDON_SOURCES += src/ui/layout/Grid.cpp
	ADDON_SOURCES += src/ui/layout/VBox.cpp
	ADDON_SOURCES += src/ui/widgets/ofxNanoVGButton.cpp
	ADDON_SOURCES += src/ui/widgets/ofxNanoVGLabel.cpp
	ADDON_SOURCES += src/ui/widgets/ofxNanoVGSlider.cpp
	ADDON_SOURCES += src/ui/widgets/ofxNanoVGToggle.cpp
	ADDON_SOURCES += src/ui/widgets/NanoVGKnob.cpp
	ADDON_SOURCES += src/ui/widgets/NanoVGRadioGroup.cpp
	ADDON_SOURCES += src/ui/widgets/NanoVGModulationGraph.cpp
	ADDON_SOURCES += src/ui/widgets/NanoVGCompositeGraph.cpp
	ADDON_SOURCES += src/ui/widgets/ofxNanoVGTextBox.cpp

	
	# Compiler flags for NanoVG GL3 implementation
	#ADDON_CPPFLAGS = -DNANOVG_GL3_IMPLEMENTATION
