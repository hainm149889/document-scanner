package com.rndocumentscanner.camera

import android.content.Context
import android.widget.FrameLayout
import androidx.camera.core.Camera
import androidx.camera.core.CameraSelector
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner

class DocumentCameraManagerView(context: Context) : FrameLayout(context) {
    private val previewView: PreviewView = PreviewView(context)
    private var camera: Camera? = null
    private var isFlashEnabled: Boolean = false

    init {
        addView(previewView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
        startCamera()
    }

    private fun startCamera() {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
        cameraProviderFuture.addListener({
            val cameraProvider: ProcessCameraProvider = cameraProviderFuture.get()

            val preview = Preview.Builder().build().also {
                it.setSurfaceProvider(previewView.surfaceProvider)
            }

            val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA

            try {
                cameraProvider.unbindAll()
                val lifecycleOwner = context as? LifecycleOwner
                if (lifecycleOwner != null) {
                    camera = cameraProvider.bindToLifecycle(
                        lifecycleOwner, cameraSelector, preview
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
}