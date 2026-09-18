package com.margelo.nitro.rndocumentscanner

import android.Manifest
import android.content.pm.PackageManager
import androidx.annotation.Keep
import androidx.core.content.ContextCompat
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import com.rndocumentscanner.camera.DocumentCameraManagerView
import com.rndocumentscanner.utils.ImageValidator

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

  override fun capturePhoto(options: NativeCaptureOptions): Promise<NativeCapturedDocument> {
    return Promise.async {
      val cameraView = DocumentCameraManagerView.sharedCurrentView
        ?: throw Exception("Camera view active instance not found on Android")

      val enableFlash = options.enableFlash ?: false
      val autoCrop = options.autoCrop ?: false
      val detectPerspective = options.detectPerspective ?: false
      val documentType = options.documentType ?: "cccd"

      kotlin.coroutines.suspendCoroutine { continuation ->
        cameraView.post {
          cameraView.capturePhoto(enableFlash, autoCrop, detectPerspective, documentType) { result ->
            result.fold(
              onSuccess = { map ->
                val doc = NativeCapturedDocument(
                  imageUri = map["imageUri"] as String,
                  width = map["width"] as Double,
                  height = map["height"] as Double,
                  orientation = map["orientation"] as Double,
                  isCropped = map["isCropped"] as Boolean,
                  corners = null
                )
                continuation.resumeWith(Result.success(doc))
              },
              onFailure = { error ->
                continuation.resumeWith(Result.failure(error))
              }
            )
          }
        }
      }
    }
  }

  override fun validateDocumentImage(imageUri: String): Promise<ImageValidationResult> {
    return Promise.async {
      val res = ImageValidator.validate(imageUri)
      ImageValidationResult(res.hasFace, res.hash)
    }
  }

  override fun compareImages(imageUri1: String, imageUri2: String): Promise<Double> {
    return Promise.async {
      ImageValidator.compare(imageUri1, imageUri2)
    }
  }
}
