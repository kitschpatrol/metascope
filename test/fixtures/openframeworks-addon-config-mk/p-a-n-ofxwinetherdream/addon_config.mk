meta:
    ADDON_NAME = ofxEtherdream
    ADDON_DESCRIPTION = let's etherdream
    ADDON_AUTHOR = Akira Hayasaka
    ADDON_TAGS = "etherdream"

vs:
	# x64
	ADDON_LIBS += libs\win\lib\x64\EtherDream.lib
	ADDON_DLLS_TO_COPY += copy_dll_to_bin\x64\EtherDream.dll
