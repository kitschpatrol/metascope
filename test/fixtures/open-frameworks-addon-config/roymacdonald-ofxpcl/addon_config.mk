# All variables and this file are optional, if they are not present the PG and the
# makefiles will try to parse the correct values from the file system.
#
# Variables that specify exclusions can use % as a wildcard to specify that anything in
# that position will match. A partial path can also be specified to, for example, exclude
# a whole folder from the parsed paths from the file system
#
# Variables can be specified using = or +=
# = will clear the contents of that variable both specified from the file or the ones parsed
# from the file system
# += will add the values to the previous ones in the file or the ones parsed from the file
# system
#
# The PG can be used to detect errors in this file, just create a new project with this addon
# and the PG will write to the console the kind of error and in which line it is

meta:
	ADDON_NAME = ofxPCL	
	ADDON_DESCRIPTION = Addon for using point clouds through the Point Cloud Library (PCL)
	ADDON_AUTHOR = OF Team
	ADDON_TAGS = "point clouds"
	ADDON_URL = http://github.com/roymacdonald/ofxPCL

common:
	# dependencies with other addons, a list of them separated by spaces
	# or use += in several lines
	# ADDON_DEPENDENCIES =

	# include search paths, this will be usually parsed from the file system
	# but if the addon or addon libraries need special search paths they can be
	# specified here separated by spaces or one per line using +=
	# ADDON_INCLUDES =

	# any special flag that should be passed to the compiler when using this
	# addon
	# ADDON_CFLAGS =

	# any special flag that should be passed to the linker when using this
	# addon, also used for system libraries with -lname
	# ADDON_LDFLAGS =

	# linux only, any library that should be included in the project using
	# pkg-config
	# ADDON_PKG_CONFIG_LIBRARIES =

	# osx/iOS only, any framework that should be included in the project
	# ADDON_FRAMEWORKS =

	# source files, these will be usually parsed from the file system looking
	# in the src folders in libs and the root of the addon. if your addon needs
	# to include files in different places or a different set of files per platform
	# they can be specified here
	# ADDON_SOURCES =

	# some addons need resources to be copied to the bin/data folder of the project
	# specify here any files that need to be copied, you can use wildcards like * and ?
	# ADDON_DATA =

	# when parsing the file system looking for libraries exclude this for all or
	# a specific platform
	# ADDON_LIBS_EXCLUDE =

# 	ADDON_LIBS += libs/opencv/lib/emscripten/libzlib.a

osx:
 
 # osx/iOS only, any framework that should be included in the project
 # 	ADDON_FRAMEWORKS = AssetsLibrary
 #  ADDON_INCLUDES = /opt/homebrew/Cellar/boost/1.78.0_1/include 
 #  ADDON_INCLUDES += /opt/homebrew/Cellar/eigen/3.4.0_1/include/eigen3 
 #  ADDON_INCLUDES += /opt/homebrew/Cellar/pcl/1.12.1_2/include/pcl-1.12 
 #  ADDON_INCLUDES += /opt/homebrew/Cellar/flann/1.9.1_13/include


 ADDON_INCLUDES =  /usr/local/include
 ADDON_INCLUDES += /usr/local/include/eigen3 
 ADDON_INCLUDES += /usr/local/include/pcl-1.13


    ADDON_LIBS = /usr/local/lib/libpcl_common.dylib                                     
    ADDON_LIBS += /usr/local/lib/libpcl_features.dylib                                   
    ADDON_LIBS += /usr/local/lib/libpcl_filters.dylib                                    
    ADDON_LIBS += /usr/local/lib/libpcl_io.dylib                                         
    ADDON_LIBS += /usr/local/lib/libpcl_io_ply.dylib                                     
    ADDON_LIBS += /usr/local/lib/libpcl_kdtree.dylib                                     
    ADDON_LIBS += /usr/local/lib/libpcl_keypoints.dylib
    ADDON_LIBS += /usr/local/lib/libpcl_ml.dylib
    ADDON_LIBS += /usr/local/lib/libpcl_octree.dylib
    ADDON_LIBS += /usr/local/lib/libpcl_outofcore.dylib
    ADDON_LIBS += /usr/local/lib/libpcl_people.dylib
    ADDON_LIBS += /usr/local/lib/libpcl_recognition.dylib
    ADDON_LIBS += /usr/local/lib/libpcl_registration.dylib
    ADDON_LIBS += /usr/local/lib/libpcl_sample_consensus.dylib
    ADDON_LIBS += /usr/local/lib/libpcl_search.dylib
    ADDON_LIBS += /usr/local/lib/libpcl_segmentation.dylib
    ADDON_LIBS += /usr/local/lib/libpcl_simulation.dylib
    ADDON_LIBS += /usr/local/lib/libpcl_simulation_io.dylib
    ADDON_LIBS += /usr/local/lib/libpcl_stereo.dylib
    ADDON_LIBS += /usr/local/lib/libpcl_surface.dylib
    ADDON_LIBS += /usr/local/lib/libpcl_tracking.dylib



  ADDON_LIBS_EXCLUDE = ../../../libs/boost/lib/osx/boost_system.a
  ADDON_LIBS_EXCLUDE +=  ../../../libs/boost/lib/osx/boost_filesystem.a
  ADDON_INCLUDES_EXCLUDE = ../../../libs/boost/include