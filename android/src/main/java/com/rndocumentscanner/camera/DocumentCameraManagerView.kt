package com.rndocumentscanner.camera

import android.content.Context
import android.widget.FrameLayout
import androidx.camera.core.Camera
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import java.io.File
import java.util.UUID

class DocumentCameraManagerView(context: Context) : FrameLayout(context) {
    private val previewView: PreviewView = PreviewView(context)
    private var camera: Camera? = null
    private var imageCapture: ImageCapture? = null
    private var isFlashEnabled: Boolean = false

    companion object {
        @JvmStatic
        @Volatile
        var sharedCurrentView: DocumentCameraManagerView? = null
    }

    init {
        addView(previewView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
        sharedCurrentView = this
        startCamera()
    }

    private fun startCamera() {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
        cameraProviderFuture.addListener({
            val cameraProvider: ProcessCameraProvider = cameraProviderFuture.get()

            val preview = Preview.Builder().build().also {
                it.setSurfaceProvider(previewView.surfaceProvider)
            }

            imageCapture = ImageCapture.Builder()
                .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
                .build()

            val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA

            try {
                cameraProvider.unbindAll()
                val lifecycleOwner = context as? LifecycleOwner
                if (lifecycleOwner != null) {
                    camera = cameraProvider.bindToLifecycle(
                        lifecycleOwner, cameraSelector, preview, imageCapture
                    )
                    setFlashEnabled(isFlashEnabled)
                }
            } catch (exc: Exception) {
                exc.printStackTrace()
            }
        }, ContextCompat.getMainExecutor(context))
    }

    fun setFlashEnabled(enabled: Boolean) {
        this.isFlashEnabled = enabled
        camera?.cameraControl?.enableTorch(enabled)
    }

    fun capturePhoto(enableFlash: Boolean, callback: (Result<Map<String, Any>>) -> Unit) {
        val capture = imageCapture ?: run {
            callback(Result.failure(Exception("ImageCapture uninitialized")))
            return
        }

        val photoFile = File(context.cacheDir, "scan_${UUID.randomUUID()}.jpg")
        val outputOptions = ImageCapture.OutputFileOptions.Builder(photoFile).build()

        capture.takePicture(
            outputOptions,
            ContextCompat.getMainExecutor(context),
            object : ImageCapture.OnImageSavedCallback {
                override fun onImageSaved(output: ImageCapture.OutputFileResults) {
                    val result = mapOf<String, Any>(
                        "imageUri" to "file://${photoFile.absolutePath}",
                        "width" to 1920.0,
                        "height" to 1080.0,
                        "orientation" to 0.0
                    )
                    callback(Result.success(result))
                }

                override fun onError(exc: ImageCaptureException) {
                    callback(Result.failure(exc))
                }
            }
        )
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        if (sharedCurrentView == this) {
            sharedCurrentView = null
        }
    }
}