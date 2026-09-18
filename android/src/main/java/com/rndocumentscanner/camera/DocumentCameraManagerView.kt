package com.rndocumentscanner.camera

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.graphics.PointF
import android.media.ExifInterface
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
import com.rndocumentscanner.utils.EdgeDetector
import java.io.File
import java.io.FileOutputStream
import java.util.UUID

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
        addView(previewView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
        sharedCurrentView = this
        startCamera()
    }

    private fun startCamera() {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
        cameraProviderFuture.addListener({
            val provider: ProcessCameraProvider = cameraProviderFuture.get()
            this.cameraProvider = provider

            val preview = Preview.Builder().build().also {
                it.setSurfaceProvider(previewView.surfaceProvider)
            }

            imageCapture = ImageCapture.Builder()
                .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
                .build()

            val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA

            try {
                provider.unbindAll()
                val lifecycleOwner = context as? LifecycleOwner
                if (lifecycleOwner != null) {
                    camera = provider.bindToLifecycle(
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
                            bitmap.compress(Bitmap.CompressFormat.JPEG, 85, out)
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

        return when (orientation) {
            ExifInterface.ORIENTATION_ROTATE_90 -> rotateImage(img, 90f)
            ExifInterface.ORIENTATION_ROTATE_180 -> rotateImage(img, 180f)
            ExifInterface.ORIENTATION_ROTATE_270 -> rotateImage(img, 270f)
            else -> img
        }
    }

    private fun rotateImage(img: Bitmap, degree: Float): Bitmap {
        val matrix = Matrix()
        matrix.postRotate(degree)
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