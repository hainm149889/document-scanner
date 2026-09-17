package com.margelo.nitro.rndocumentscanner

import android.Manifest
import android.content.pm.PackageManager
import androidx.annotation.Keep
import androidx.core.content.ContextCompat
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise

@Keep
class HybridDocumentScanner : HybridDocumentScannerSpec() {
  override fun getNativeVersion(): String {
    return "0.1.0-android"
  }

  override fun ping(message: String): String {
    return "Android Pong: $message"
  }

  override fun getCameraPermissionStatus(): String {
    val context = NitroModules.applicationContext
    if (context != null) {
      val status = ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA)
      if (status == PackageManager.PERMISSION_GRANTED) {
        return "granted"
      }
    }
    return "denied"
  }

  override fun requestCameraPermission(): Promise<Boolean> {
    val context = NitroModules.applicationContext
    if (context != null) {
      val status = ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA)
      if (status == PackageManager.PERMISSION_GRANTED) {
        return Promise.resolved(true)
      }
    }
    return Promise.resolved(false)
  }
}
