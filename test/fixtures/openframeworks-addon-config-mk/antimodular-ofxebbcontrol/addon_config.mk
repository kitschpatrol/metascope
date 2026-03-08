# addon_config.mk for ofxEbbControl

#----------------------------------------------------------------
# This file tells the OpenFrameworks project generator about
# the ofxEbbControl addon location and include paths.
#----------------------------------------------------------------

meta:
	ADDON_NAME = ofxEbbControl
	ADDON_DESCRIPTION = Addon for interfacing with the EiBotBoard - the controller in the AxiDraw, Egg-Bot, and WaterColorBot.
	ADDON_AUTHOR = Owen Trueblood, Andreas Schmelas
	ADDON_TAGS = "hardware interface"
	ADDON_URL = https://github.com/m9dfukc/ofxEbbControl

common:
	ADDON_INCLUDES = src
