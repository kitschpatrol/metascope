meta:
	ADDON_NAME = ofxPcapPlusPlus
	ADDON_DESCRIPTION = Addon for PcapPlusPlus
	ADDON_AUTHOR = KANA10SKY
	ADDON_TAGS = realsense
	ADDON_URL = https://github.com/Kanato/ofxPcapPlusPlus

common:
	ADDON_INCLUDES = src
	#ADDON_LIBS = ""
	#ADDON_DLLS_TO_COPY = ""

vs:
	# pcapcpp
	ADDON_INCLUDES += libs/pcapplusplus-22.05-windows-vs2019/header
	ADDON_LIBS += libs/pcapplusplus-22.05-windows-vs2019/$()$(PlatformTarget)/$(Configuration)/Common++.lib
	ADDON_LIBS += libs/pcapplusplus-22.05-windows-vs2019/$()$(PlatformTarget)/$(Configuration)/Packet++.lib
	ADDON_LIBS += libs/pcapplusplus-22.05-windows-vs2019/$()$(PlatformTarget)/$(Configuration)/Pcap++.lib

	## winpcap
	#ADDON_INCLUDES += libs/WpdPack/Include
	#ADDON_LIBS += libs/WpdPack/Lib/$()$(PlatformTarget)/Packet.lib
	#ADDON_LIBS += libs/WpdPack/Lib/$()$(PlatformTarget)/wpcap.lib
	# npcap
	ADDON_INCLUDES += libs/npcap-sdk-1.12/Include
	ADDON_LIBS += libs/npcap-sdk-1.12/Lib/$()$(PlatformTarget)/Packet.lib
	ADDON_LIBS += libs/npcap-sdk-1.12/Lib/$()$(PlatformTarget)/wpcap.lib
	ADDON_DLLS_TO_COPY += libs/npcap-sdk-1.12/Lib/$()$(PlatformTarget)/wpcap.dll
	ADDON_DLLS_TO_COPY += libs/npcap-sdk-1.12/Lib/$()$(PlatformTarget)/packet.dll
	

	# pthreads-win32
	# ADDON_INCLUDES += libs/pthreads-win32-master/Pre-built.2/include
	# ADDON_LIBS += libs/pthreads-win32-master/Pre-built.2/lib/pthreadVC2.lib
	##ADDON_LIBS_EXCLUDE = libs/pthreads-win32-master/Pre-built.2/lib/pthreadVCE2.lib
	#ADDON_LIBS_EXCLUDE += libs/pthreads-win32-master/Pre-built.2/lib/pthreadVSE2.lib
	#ADDON_INCLUDES += libs/pthreads-w32-2-9-1-release/Pre-built.2/include
	#ADDON_LIBS += libs/pthreads-w32-2-9-1-release/Pre-built.2/lib/$()$(PlatformTarget)/pthreadVC2.lib
	#ADDON_DLLS_TO_COPY += libs/pthreads-w32-2-9-1-release/Pre-built.2/dll/$()$(PlatformTarget)/pthreadVC2.dll
	#ADDON_DLLS_TO_COPY += libs/pthreads-w32-2-9-1-release/Pre-built.2/dll/$()$(PlatformTarget)/pthreadGC2.dll
	ADDON_LIBS += libs/pthreads-w32-2-9-1-release/Pre-built.2/lib/$()$(PlatformTarget)/pthreadVC2.lib
	#ADDON_INCLUDES_EXCLUDE += libs/pthreads-w32-2-9-1-release/pthreads.2/%
	#ADDON_DLLS_TO_COPY = libs/pthreads-w32-2-9-1-release/Pre-built.2/dll/$()$(PlatformTarget)/pthreadVC2.dll
	#ADDON_DLLS_TO_COPY += libs/pthreads-w32-2-9-1-release/Pre-built.2/dll/$()$(PlatformTarget)/%
	#ADDON_DLLS_TO_COPY += lfibs/pthreads-w32-2-9-1-release/Pre-built.2/dll/$()$(PlatformTarget)/pthreadVC2.dll

#############################################################################################################################
# ???? make Error
# ADDON_INCLUDES = libs/pcapplusplus-22.05-windows-vs2019/header
# ADDON_INCLUDES += libs/WpdPack/Include
# ADDON_INCLUDES += libs/pthreads-win32-master/Pre-built.2/include
# 
# ADDON_LIBS = libs/pcapplusplus-22.05-windows-vs2019/$()$(PlatformTarget)/$()$(Configuration)/Common++.lib
# ADDON_LIBS += libs/pcapplusplus-22.05-windows-vs2019/$()$(PlatformTarget)/$()$(Configuration)/Packet++.lib
# ADDON_LIBS += libs/pcapplusplus-22.05-windows-vs2019/$()$(PlatformTarget)/$()$(Configuration)/Pcap++.lib
# ADDON_LIBS += libs/WpdPack/Lib/$()$(PlatformTarget)/Packet.lib
# ADDON_LIBS += libs/WpdPack/Lib/$()$(PlatformTarget)/wpcap.lib
# ADDON_LIBS += libs/pthreads-win32-master/Pre-built.2/lib/pthreadVC2.lib
# ADDON_LIBS_EXCLUDE = libs/pthreads-win32-master/Pre-built.2/lib/pthreadVCE2.lib
# ADDON_LIBS_EXCLUDE += libs/pthreads-win32-master/Pre-built.2/lib/pthreadVSE2.lib

#############################################################################################################################
# self library path settings v2
## pcapplusplus
#ADDON_INCLUDES += $(PCAPPLUSPLUS_ROOT)/header/
#ADDON_LIBS += $(PCAPPLUSPLUS_ROOT)/$(PlatformTarget)/$(Configuration)/Common++.lib
#ADDON_LIBS += $(PCAPPLUSPLUS_ROOT)/$(PlatformTarget)/$()$(Configuration)/Packet++.lib
#ADDON_LIBS += $(PCAPPLUSPLUS_ROOT)/$(PlatformTarget)/$()$(Configuration)/Pcap++.lib
#
## winpcap
#ADDON_INCLUDES += $(WINPCAP_ROOT)/Include/
#ADDON_LIBS += $(WINPCAP_ROOT)/Lib/$(PlatformTarget)/Packet.lib
#ADDON_LIBS += $(WINPCAP_ROOT)/Lib/$(PlatformTarget)/wpcap.lib
#
## pthread-win32
#ADDON_INCLUDES += $(PTHREAD_ROOT)/Pre-built.2/include/
#ADDON_LIBS += $(PTHREADS_ROOT)/Pre-built.2/lib/pthreadVC2.lib

#############################################################################################################################
# self library path settings
## pcapplusplus
#ADDON_INCLUDES += E:/lib/pcapplusplus-22.05-windows-vs2019/header/
#ADDON_LIBS += E:/lib/pcapplusplus-22.05-windows-vs2019/$()$(PlatformTarget)/$()$(Configuration)/Common++.lib
#ADDON_LIBS += E:/lib/pcapplusplus-22.05-windows-vs2019/$()$(PlatformTarget)/$()$(Configuration)/Packet++.lib
#ADDON_LIBS += E:/lib/pcapplusplus-22.05-windows-vs2019/$()$(PlatformTarget)/$()$(Configuration)/Pcap++.lib
#
## winpcap
#ADDON_INCLUDES += E:/lib/WpdPack/Include/
#ADDON_LIBS += E:/lib/WpdPack/Lib/$()$(PlatformTarget)/Packet.lib
#ADDON_LIBS += E:/lib/WpdPack/Lib/$()$(PlatformTarget)/wpcap.lib
#
## pthread-win32
#ADDON_INCLUDES += E:/lib/pthreads-win32-master/Pre-built.2/include/
#ADDON_LIBS += E:/lib/pthreads-win32-master/Pre-built.2/lib/pthreadVC2.lib

#############################################################################################################################
# ? escape method? -> $()$(XXX)
# ADDON_INCLUDES += E:/lib/pcapplusplus-22.05-windows-vs2019/header/
# ADDON_INCLUDES += E:/lib/WpdPack/Include/
# ADDON_INCLUDES += E:/lib/pthreads-win32-masterPre-built.2/include/
# 
# ADDON_LIBS += E:/lib/pcapplusplus-22.05-windows-vs2019/x64/$()$(Configuration)/Common++.lib
# ADDON_LIBS += E:/lib/pcapplusplus-22.05-windows-vs2019/x64/$()$(Configuration)/Packet++.lib
# ADDON_LIBS += E:/lib/pcapplusplus-22.05-windows-vs2019/x64/$()$(Configuration)/Pcap++.lib
# ADDON_LIBS += E:/lib/WpdPackLib/x64/Packet.lib
# ADDON_LIBS += E:/lib/WpdPackLib/x64/wpcap.lib
# ADDON_LIBS += E:/lib/pthreads-win32-masterPre-built.2/lib/pthreadVC2.lib

#############################################################################################################################
# Wouldn't Work, couldn't reed env some variables
# ADDON_INCLUDES += "$(PCAPPLUSPLUS_ROOT)/header/"
# ADDON_INCLUDES += "$(WINPCAP_ROOT)/Include/"
# ADDON_INCLUDES += "$(PTHREADS_ROOT)/Pre-built.2/include/"
# 
# ADDON_LIBS += "$(PCAPPLUSPLUS_ROOT)/$(PlatformTarget)/$(Configuration)/*.lib"
# ADDON_LIBS += "$(WINPCAP_ROOT)/Lib/*.lib"
# ADDON_LIBS += "$(WINPCAP_ROOT)/Lib/$(PlatformTarget)/*.lib"
# ADDON_LIBS += "$(PTHREADS_ROOT)/Pre-built.2/lib/pthreadVC2.lib"
