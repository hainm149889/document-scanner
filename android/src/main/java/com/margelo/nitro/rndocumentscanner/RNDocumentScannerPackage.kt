package com.rndocumentscanner

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import com.rndocumentscanner.camera.DocumentCameraViewManager

import com.margelo.nitro.rndocumentscanner.RNDocumentScannerOnLoad

/**
 * Package đăng ký cho Autolinking của React Native trên Android
 */
class RNDocumentScannerPackage : ReactPackage {
    init {
        try {
            RNDocumentScannerOnLoad.initializeNative()
        } catch (e: Throwable) {
            e.printStackTrace()
        }
    }

    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return emptyList()
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return listOf(DocumentCameraViewManager())
    }
}