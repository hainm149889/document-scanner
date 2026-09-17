package com.rndocumentscanner.camera

import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

class DocumentCameraViewManager : SimpleViewManager<DocumentCameraManagerView>() {

    override fun getName(): String {
        return "DocumentCameraView"
    }

    override fun createViewInstance(reactContext: ThemedReactContext): DocumentCameraManagerView {
        return DocumentCameraManagerView(reactContext)
    }

    @ReactProp(name = "enableFlash", defaultBoolean = false)
    fun setEnableFlash(view: DocumentCameraManagerView, enableFlash: Boolean) {
        view.setFlashEnabled(enableFlash)
    }
}