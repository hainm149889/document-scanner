package com.rndocumentscanner.camera

import android.content.Context
import android.content.ContextWrapper
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.graphics.PointF
import android.media.ExifInterface
import android.widget.FrameLayout
import android.os.Handler
import android.os.Looper
import android.view.MotionEvent
import androidx.camera.core.Camera
import androidx.camera.core.CameraSelector
import androidx.camera.core.FocusMeteringAction
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import com.facebook.react.bridge.ReactContext
import com.rndocumentscanner.utils.EdgeDetector
import java.io.File
import java.io.FileOutputStream
import java.util.UUID
import java.util.concurrent.TimeUnit

class DocumentCameraManagerView(context: Context) : FrameLayout(context) {
    private val previewView: PreviewView = PreviewView(context)
    private var camera: Camera? = null
    private var imageCapture: ImageCapture? = null
    private var cameraProvider: ProcessCameraProvider? = null
    private var isFlashEnabled: Boolean = false

    companion object {
        @JvmStatic
        @Volatile
        var sharedCurrentView: DocumentCameraManagerView? = null

        /**
         * Dọn dẹp tất cả các file ảnh tạm (.jpg) đã tạo ra trong cacheDir
         */
        fun clearCacheFiles(context: Context): Boolean {
            return try {
                val cacheDir = context.cacheDir
                val files = cacheDir.listFiles { file ->
                    file.name.startsWith("scan_") || file.name.startsWith("raw_")
                }
                files?.forEach { it.delete() }
                true
            } catch (e: Exception) {
                e.printStackTrace()
                false
            }
        }
    }

    init {
        previewView.implementationMode = PreviewView.ImplementationMode.COMPATIBLE
        previewView.scaleType = PreviewView.ScaleType.FILL_CENTER
        addView(previewView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
        sharedCurrentView = this
        setupTapToFocus()
        post {
            startCamera()
        }
    }

    private fun setupTapToFocus() {
        previewView.setOnTouchListener { view, event ->
            if (event.action == MotionEvent.ACTION_UP) {
                val cam = camera
                if (cam != null) {
                    try {
                        val factory = previewView.meteringPointFactory
                        val point = factory.createPoint(event.x, event.y)
                        val action = FocusMeteringAction.Builder(point, FocusMeteringAction.FLAG_AF or FocusMeteringAction.FLAG_AE)
                            .setAutoCancelDuration(3, TimeUnit.SECONDS)
                            .build()
                        cam.cameraControl.startFocusAndMetering(action)
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }
                view.performClick()
            }
            true
        }
    }

    override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
        super.onLayout(changed, left, top, right, bottom)
        val w = right - left
        val h = bottom - top
        previewView.measure(
            MeasureSpec.makeMeasureSpec(w, MeasureSpec.EXACTLY),
            MeasureSpec.makeMeasureSpec(h, MeasureSpec.EXACTLY)
        )
        previewView.layout(0, 0, w, h)
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
        sharedCurrentView = this
        post {
            if (camera == null) {
                startCamera()
            }
        }
    }

    override fun onWindowFocusChanged(hasWindowFocus: Boolean) {
        super.onWindowFocusChanged(hasWindowFocus)
        if (hasWindowFocus && camera == null && hasCameraPermission()) {
            startCamera()
        }
    }

    private fun hasCameraPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            context,
            android.Manifest.permission.CAMERA
        ) == android.content.pm.PackageManager.PERMISSION_GRANTED
    }

    private fun getLifecycleOwner(): LifecycleOwner? {
        var ctx: Context? = context
        while (ctx != null) {
            if (ctx is LifecycleOwner) {
                return ctx
            }
            if (ctx is ContextWrapper) {
                ctx = ctx.baseContext
            } else {
                break
            }
        }
        val reactContext = context as? ReactContext
        val activity = reactContext?.currentActivity
        if (activity is LifecycleOwner) {
            return activity
        }
        return null
    }

    private fun startCamera() {
        if (!hasCameraPermission()) {
            android.util.Log.w("DocumentCameraView", "Chưa có quyền CAMERA, bỏ qua khởi tạo CameraX.")
            return
        }

        val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
        cameraProviderFuture.addListener({
            try {
                val provider: ProcessCameraProvider = cameraProviderFuture.get()
                this.cameraProvider = provider

                val rotation = previewView.display?.rotation ?: android.view.Surface.ROTATION_0
                val preview = Preview.Builder()
                    .setTargetRotation(rotation)
                    .build().also {
                        it.setSurfaceProvider(previewView.surfaceProvider)
                    }

                imageCapture = ImageCapture.Builder()
                    .setCaptureMode(ImageCapture.CAPTURE_MODE_MAXIMIZE_QUALITY)
                    .setJpegQuality(95)
                    .setTargetRotation(rotation)
                    .build()

                val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA

                provider.unbindAll()
                val lifecycleOwner = getLifecycleOwner()
                if (lifecycleOwner != null) {
                    camera = provider.bindToLifecycle(
                        lifecycleOwner, cameraSelector, preview, imageCapture
                    )
                    // Áp dụng lại trạng thái Flash Torch nếu đã được bật trước đó
                    if (isFlashEnabled) {
                        setFlashEnabled(true)
                    }
                    android.util.Log.i("DocumentCameraView", "CameraX bound thành công vào LifecycleOwner: $lifecycleOwner")
                } else {
                    android.util.Log.e("DocumentCameraView", "LifecycleOwner is null for Context: $context")
                }
            } catch (exc: Exception) {
                android.util.Log.e("DocumentCameraView", "Lỗi khởi tạo CameraX", exc)
            }
        }, ContextCompat.getMainExecutor(context))
    }

    fun setFlashEnabled(enabled: Boolean) {
        this.isFlashEnabled = enabled
        try {
            val cam = camera ?: return
            if (cam.cameraInfo.hasFlashUnit()) {
                cam.cameraControl.enableTorch(enabled)
            }
        } catch (e: Exception) {
            android.util.Log.e("DocumentCameraView", "Không thể bật/tắt flash torch: ${e.message}")
        }
    }

    fun capturePhoto(
        enableFlash: Boolean,
        autoCrop: Boolean,
        detectPerspective: Boolean,
        documentType: String,
        callback: (Result<Map<String, Any>>) -> Unit
    ) {
        val capture = imageCapture ?: run {
            callback(Result.failure(Exception("ImageCapture uninitialized")))
            return
        }

        val cam = camera ?: run {
            callback(Result.failure(Exception("Camera chưa được kích hoạt hoặc quyền Camera bị từ chối.")))
            return
        }

        if (enableFlash) {
            capture.flashMode = ImageCapture.FLASH_MODE_ON
        } else {
            capture.flashMode = ImageCapture.FLASH_MODE_OFF
        }

        val currentRotation = previewView.display?.rotation ?: android.view.Surface.ROTATION_0
        capture.targetRotation = currentRotation

        // Pre-capture Autofocus & Exposure stability sequence
        // Khóa nét vào tâm khung scan trước khi kích hoạt chụp
        val factory = previewView.meteringPointFactory
        val centerX = (previewView.width / 2f).coerceAtLeast(1f)
        val centerY = (previewView.height / 2f).coerceAtLeast(1f)
        val centerPoint = factory.createPoint(centerX, centerY)
        val focusAction = FocusMeteringAction.Builder(centerPoint, FocusMeteringAction.FLAG_AF or FocusMeteringAction.FLAG_AE)
            .setAutoCancelDuration(3, TimeUnit.SECONDS)
            .build()

        var hasExecuted = false
        val executeCaptureAction = {
            if (!hasExecuted) {
                hasExecuted = true
                takePictureInternal(capture, autoCrop, detectPerspective, documentType, callback)
            }
        }

        val handler = Handler(Looper.getMainLooper())
        val timeoutRunnable = Runnable {
            executeCaptureAction()
        }
        // Timeout 600ms phòng trường hợp môi trường tối khó lock focus
        handler.postDelayed(timeoutRunnable, 600)

        try {
            val focusFuture = cam.cameraControl.startFocusAndMetering(focusAction)
            focusFuture.addListener({
                handler.removeCallbacks(timeoutRunnable)
                executeCaptureAction()
            }, ContextCompat.getMainExecutor(context))
        } catch (e: Exception) {
            handler.removeCallbacks(timeoutRunnable)
            executeCaptureAction()
        }
    }

    private fun takePictureInternal(
        capture: ImageCapture,
        autoCrop: Boolean,
        detectPerspective: Boolean,
        documentType: String,
        callback: (Result<Map<String, Any>>) -> Unit
    ) {
        val rawFile = File(context.cacheDir, "raw_${UUID.randomUUID()}.jpg")
        val outputOptions = ImageCapture.OutputFileOptions.Builder(rawFile).build()

        capture.takePicture(
            outputOptions,
            ContextCompat.getMainExecutor(context),
            object : ImageCapture.OnImageSavedCallback {
                override fun onImageSaved(output: ImageCapture.OutputFileResults) {
                    try {
                        var bitmap = BitmapFactory.decodeFile(rawFile.absolutePath)
                        if (bitmap != null) {
                            bitmap = rotateImageIfRequired(bitmap, rawFile.absolutePath)
                        }

                        var isCropped = false

                        if (detectPerspective && bitmap != null) {
                            val imgW = bitmap.width.toFloat()
                            val imgH = bitmap.height.toFloat()
                            val corners = listOf(
                                PointF(imgW * 0.1f, imgH * 0.2f),
                                PointF(imgW * 0.9f, imgH * 0.18f),
                                PointF(imgW * 0.88f, imgH * 0.82f),
                                PointF(imgW * 0.12f, imgH * 0.8f)
                            )
                            bitmap = EdgeDetector.perspectiveTransform(bitmap, corners)
                            isCropped = true
                        } else if (autoCrop && bitmap != null) {
                            val aspectRatio = if (documentType == "passport") 1.42f else 1.585f
                            val cropped = cropBitmapToFrame(bitmap, aspectRatio)
                            if (cropped != null) {
                                if (!bitmap.isRecycled && bitmap != cropped) {
                                    bitmap.recycle()
                                }
                                bitmap = cropped
                                isCropped = true
                            }
                        }

                        if (bitmap == null) {
                            callback(Result.failure(Exception("Bitmap decoding/processing failed")))
                            return
                        }

                        val finalFile = File(context.cacheDir, "scan_${UUID.randomUUID()}.jpg")
                        FileOutputStream(finalFile).use { out ->
                            bitmap.compress(Bitmap.CompressFormat.JPEG, 95, out)
                        }

                        val resultWidth = bitmap.width.toDouble()
                        val resultHeight = bitmap.height.toDouble()

                        if (!bitmap.isRecycled) {
                            bitmap.recycle()
                        }

                        if (rawFile.exists()) rawFile.delete()

                        val result = mapOf(
                            "imageUri" to "file://${finalFile.absolutePath}",
                            "width" to resultWidth,
                            "height" to resultHeight,
                            "orientation" to 0.0,
                            "isCropped" to isCropped
                        )
                        callback(Result.success(result))
                    } catch (e: Exception) {
                        callback(Result.failure(e))
                    }
                }

                override fun onError(exc: ImageCaptureException) {
                    callback(Result.failure(exc))
                }
            }
        )
    }

    private fun cropBitmapToFrame(src: Bitmap, targetAspectRatio: Float): Bitmap? {
        val imgW = src.width
        val imgH = src.height

        val cropW = (imgW * 0.85f).toInt()
        val cropH = (cropW / targetAspectRatio).toInt()

        val startX = ((imgW - cropW) / 2).coerceAtLeast(0)
        val startY = ((imgH - cropH) / 2).coerceAtLeast(0)

        if (startX + cropW > imgW || startY + cropH > imgH) return null

        return Bitmap.createBitmap(src, startX, startY, cropW, cropH)
    }

    private fun rotateImageIfRequired(img: Bitmap, path: String): Bitmap {
        val ei = ExifInterface(path)
        val orientation = ei.getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)

        val matrix = Matrix()
        when (orientation) {
            ExifInterface.ORIENTATION_ROTATE_90 -> matrix.postRotate(90f)
            ExifInterface.ORIENTATION_ROTATE_180 -> matrix.postRotate(180f)
            ExifInterface.ORIENTATION_ROTATE_270 -> matrix.postRotate(270f)
            ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> matrix.postScale(-1f, 1f)
            ExifInterface.ORIENTATION_FLIP_VERTICAL -> matrix.postScale(1f, -1f)
            ExifInterface.ORIENTATION_TRANSPOSE -> {
                matrix.postRotate(90f)
                matrix.postScale(-1f, 1f)
            }
            ExifInterface.ORIENTATION_TRANSVERSE -> {
                matrix.postRotate(270f)
                matrix.postScale(-1f, 1f)
            }
            else -> return img
        }

        val rotatedImg = Bitmap.createBitmap(img, 0, 0, img.width, img.height, matrix, true)
        if (!img.isRecycled && img != rotatedImg) {
            img.recycle()
        }
        return rotatedImg
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        cameraProvider?.unbindAll()
        cameraProvider = null
        if (sharedCurrentView == this) {
            sharedCurrentView = null
        }
    }
}