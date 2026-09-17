package com.rndocumentscanner

import android.Manifest
import android.content.pm.PackageManager
import android.util.Log
import android.widget.FrameLayout
import androidx.camera.core.Camera
import androidx.camera.core.CameraSelector
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.ProcessLifecycleOwner
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.uimanager.ThemedReactContext

class DocumentCameraView(private val reactContext: ThemedReactContext) :
    FrameLayout(reactContext), LifecycleEventListener {

    private val previewView = PreviewView(reactContext).apply {
        layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
        implementationMode = PreviewView.ImplementationMode.COMPATIBLE
        scaleType = PreviewView.ScaleType.FILL_CENTER
    }

    private var camera: Camera? = null
    private var cameraProvider: ProcessCameraProvider? = null
    private var isFlashEnabled: Boolean = false
    private var isBound: Boolean = false

    init {
        addView(previewView)
        reactContext.addLifecycleEventListener(this)
    }

    override fun requestLayout() {
        super.requestLayout()
        post(measureAndLayout)
    }

    private val measureAndLayout = Runnable {
        measure(
            MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
            MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY)
        )
        layout(left, top, right, bottom)
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        startCamera()
    }

    fun setEnableFlash(enable: Boolean) {
        this.isFlashEnabled = enable
        camera?.cameraControl?.enableTorch(enable)
    }

    fun startCamera() {
        val permissionCheck = ContextCompat.checkSelfPermission(
            reactContext,
            Manifest.permission.CAMERA
        )
        if (permissionCheck != PackageManager.PERMISSION_GRANTED) {
            Log.w(TAG, "Camera permission is not granted yet.")
            return
        }

        val cameraProviderFuture = ProcessCameraProvider.getInstance(reactContext)
        cameraProviderFuture.addListener({
            try {
                val provider = cameraProviderFuture.get()
                this.cameraProvider = provider

                val preview = Preview.Builder().build().also {
                    it.setSurfaceProvider(previewView.surfaceProvider)
                }

                val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA

                val activity = reactContext.currentActivity
                val lifecycleOwner: LifecycleOwner = (activity as? LifecycleOwner) ?: ProcessLifecycleOwner.get()

                provider.unbindAll()
                val cam = provider.bindToLifecycle(
                    lifecycleOwner,
                    cameraSelector,
                    preview
                )
                this.camera = cam
                this.isBound = true
                cam.cameraControl.enableTorch(isFlashEnabled)
                Log.d(TAG, "Camera bound successfully to lifecycle.")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to bind camera use cases: ${e.message}", e)
            }
        }, ContextCompat.getMainExecutor(reactContext))
    }

    fun onDestroy() {
        try {
            reactContext.removeLifecycleEventListener(this)
            cameraProvider?.unbindAll()
            camera = null
            cameraProvider = null
            isBound = false
        } catch (e: Exception) {
            Log.e(TAG, "Error destroying DocumentCameraView: ${e.message}", e)
        }
    }

    override fun onHostResume() {
        if (!isBound) {
            startCamera()
        }
    }

    override fun onHostPause() {
        // LifecycleOwner handles pause/resume automatically
    }

    override fun onHostDestroy() {
        onDestroy()
    }

    companion object {
        private const val TAG = "DocumentCameraView"
    }
}
