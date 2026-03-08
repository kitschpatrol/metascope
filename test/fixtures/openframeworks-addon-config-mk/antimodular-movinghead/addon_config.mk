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
	ADDON_NAME = ofxCeres
	ADDON_DESCRIPTION = Addon for dealing with ceres-solver
	ADDON_AUTHOR = Elliot Woods
	ADDON_TAGS = "math" "3D"
	ADDON_URL = http://github.com/elliotwoods/ofxCeres

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

	ADDON_SOURCES = src/ofxCeres.h
	ADDON_SOURCES += src/ofxCeres/Exception.h
	ADDON_SOURCES += src/ofxCeres/Exception.cpp
	ADDON_SOURCES += src/ofxCeres/Result.h
	ADDON_SOURCES += src/ofxCeres/SolverSettings.h
	ADDON_SOURCES += src/ofxCeres/SolverSettings.cpp
	ADDON_SOURCES += src/ofxCeres/Models/Base.h
	ADDON_SOURCES += src/ofxCeres/Models/MovingHead.cpp
	ADDON_SOURCES += src/ofxCeres/Models/MovingHead.h
	ADDON_SOURCES += src/ofxCeres/Models/MovingHeadError.h
	ADDON_SOURCES += src/ofxCeres/Models/DistortedMovingHead.cpp
	ADDON_SOURCES += src/ofxCeres/Models/DistortedMovingHead.h
	ADDON_SOURCES += src/ofxCeres/Models/DistortedMovingHeadError.h
	ADDON_SOURCES += src/ofxCeres/Models/RigidBodyTransform.cpp
	ADDON_SOURCES += src/ofxCeres/Models/RigidBodyTransform.h
	ADDON_SOURCES += src/ofxCeres/VectorMath/VectorMath.h

osx:
	ADDON_SOURCES += libs/miniglog/glog/logging.cc

	ADDON_INCLUDES = libs/ceres/include-osx
	ADDON_INCLUDES += libs/miniglog
	ADDON_INCLUDES += src

#linuxarmv6l:
#	ADDON_PKG_CONFIG_LIBRARIES = assimp
#	ADDON_LIBS_EXCLUDE = libs/assimp
#	ADDON_INCLUDES_EXCLUDE = libs/assimp/%
#
#linuxarmv7l:
#	ADDON_PKG_CONFIG_LIBRARIES = assimp
#	ADDON_LIBS_EXCLUDE = libs/assimp
#	ADDON_INCLUDES_EXCLUDE = libs/assimp/%
#
#linux:
#	ADDON_PKG_CONFIG_LIBRARIES = assimp
#	ADDON_LIBS_EXCLUDE = libs/assimp
#	ADDON_INCLUDES_EXCLUDE = libs/assimp/%
#
#linux64:
#	ADDON_PKG_CONFIG_LIBRARIES = assimp
#	ADDON_LIBS_EXCLUDE = libs/assimp
#	ADDON_INCLUDES_EXCLUDE = libs/assimp/%
#
#msys2:
#	ADDON_PKG_CONFIG_LIBRARIES = assimp
#	ADDON_LIBS_EXCLUDE = libs/assimp
#	ADDON_INCLUDES_EXCLUDE = libs/assimp/%
#
#android/armeabi-v7a:
#	ADDON_LIBS=
#	ADDON_LIBS+=libs/assimp/lib/android/armeabi-v7a/libassimp.a
#	ADDON_LIBS+=libs/assimp/lib/android/armeabi-v7a/libIrrXML.a
#
#android/x86:
#	ADDON_LIBS=
#	ADDON_LIBS+=libs/assimp/lib/android/x86/libassimp.a
#	ADDON_LIBS+=libs/assimp/lib/android/x86/libIrrXML.a