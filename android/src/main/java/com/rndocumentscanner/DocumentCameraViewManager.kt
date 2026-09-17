package com.rndocumentscanner

import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

class DocumentCameraViewManager : SimpleViewManager<DocumentCameraView>() {

    override fun getName(): String {
        return REACT_CLASS
    }

    override fun createViewInstance(reactContext: ThemedReactContext): DocumentCameraView {
        return DocumentCameraView(reactContext)
    }

    override fun onDropViewInstance(view: DocumentCameraView) {
        super.onDropViewInstance(view)
        view.onDestroy()
    }

    @ReactProp(name = "enableFlash", defaultBoolean = false)
    fun setEnableFlash(view: DocumentCameraView, enableFlash: Boolean) {
        view.setEnableFlash(enableFlash)
    }

    companion object {
        const val REACT_CLASS = "DocumentCameraView"
    }
}
