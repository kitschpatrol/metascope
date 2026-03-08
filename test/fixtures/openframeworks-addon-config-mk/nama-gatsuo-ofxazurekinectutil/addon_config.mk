
meta:
	ADDON_NAME = ofxAzureKinectUtil
	ADDON_DESCRIPTION = Use Azure Kinect inside openFrameworks.
	ADDON_AUTHOR = Ayumu Nagamatsu
	ADDON_TAGS = "computer vision" "3D sensing" "kinect"
	ADDON_URL = https://github.com/nama-gatsuo/ofxAzureKinectUtil

common:

vs:
	ADDON_INCLUDES += $(AZUREKINECT_SDK)\sdk\include
	ADDON_INCLUDES += $(AZUREKINECT_BODY_SDK)\sdk\include

	ADDON_INCLUDES_EXCLUDE += libs
	ADDON_INCLUDES_EXCLUDE += libs\turbojpeg
	ADDON_INCLUDES_EXCLUDE += libs\turbojpeg\lib
	ADDON_INCLUDES_EXCLUDE += libs\turbojpeg\lib\%
	ADDON_INCLUDES_EXCLUDE += libs\attitude_estimator

	ADDON_LIBS += $(AZUREKINECT_SDK)\sdk\windows-desktop\amd64\release\lib\k4a.lib
	ADDON_LIBS += $(AZUREKINECT_SDK)\sdk\windows-desktop\amd64\release\lib\k4arecord.lib
	ADDON_LIBS += $(AZUREKINECT_BODY_SDK)\sdk\windows-desktop\amd64\release\lib\k4abt.lib

	ADDON_DLLS_TO_COPY += $(AZUREKINECT_SDK)\sdk\windows-desktop\amd64\release\bin\k4a.dll
	ADDON_DLLS_TO_COPY += $(AZUREKINECT_SDK)\sdk\windows-desktop\amd64\release\bin\k4arecord.dll
	ADDON_DLLS_TO_COPY += $(AZUREKINECT_SDK)\sdk\windows-desktop\amd64\release\bin\depthengine_2_0.dll
	ADDON_DLLS_TO_COPY += $(AZUREKINECT_BODY_SDK)\sdk\windows-desktop\amd64\release\bin\k4abt.dll
	ADDON_DLLS_TO_COPY += $(AZUREKINECT_BODY_SDK)\sdk\windows-desktop\amd64\release\bin\onnxruntime.dll
	ADDON_DLLS_TO_COPY += $(AZUREKINECT_BODY_SDK)\sdk\windows-desktop\amd64\release\bin\dnn_model_2_0_op11.onnx

linux64:

linux:

linuxarmv6l:

linuxarmv7l:

msys2:

android/armeabi:

android/armeabi-v7a:

ios:
