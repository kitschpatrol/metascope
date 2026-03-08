# openFrameworks addon_config for a locally-built libgpiod (autotools).
#
# This assumes you've already built it in-place, producing:
#   lib/.libs/libgpiod.so (shared) and/or lib/.libs/libgpiod.a (static)
#
# If you want OF to build it automatically, we can add an ADDON_AFTER step,
# but that will require autotools deps to be present and is slower.

meta:
	ADDON_NAME = libgpiod
	ADDON_DESCRIPTION = Linux GPIO character device userspace library
	ADDON_AUTHOR = Bartosz Golaszewski
	ADDON_TAGS = "gpio" "linux" "libgpiod"

common:
	# Headers are in include/gpiod.h
	ADDON_INCLUDES += include

linux:
	# Prefer shared if present; otherwise link static.
	# OF will also copy shared libs into bin/ automatically.
	ADDON_LIBS += lib/.libs/libgpiod.so
	ADDON_LIBS += lib/.libs/libgpiod.a

linuxaarch64:
	ADDON_LIBS += lib/.libs/libgpiod.so
	ADDON_LIBS += lib/.libs/libgpiod.a



