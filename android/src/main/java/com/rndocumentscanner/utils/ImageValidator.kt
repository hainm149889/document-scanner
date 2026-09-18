package com.rndocumentscanner.utils

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.media.FaceDetector
import android.net.Uri
import com.margelo.nitro.NitroModules
import java.io.File

object ImageValidator {

    data class ValidationResult(val hasFace: Boolean, val hash: String)

    /**
     * Kiểm tra ảnh: phát hiện khuôn mặt và sinh mã băm dHash (64-bit hex)
     */
    fun validate(imageUri: String): ValidationResult {
        val bitmap = loadImage(imageUri) ?: return ValidationResult(false, "")
        try {
            val hasFace = detectFace(bitmap)
            val hash = computeDHash(bitmap)
            return ValidationResult(hasFace, hash)
        } finally {
            bitmap.recycle()
        }
    }

    /**
     * So sánh độ tương đồng giữa 2 ảnh (0.0 đến 1.0) dựa trên khoảng cách Hamming của dHash
     */
    fun compare(imageUri1: String, imageUri2: String): Double {
        val b1 = loadImage(imageUri1)
        val b2 = loadImage(imageUri2)
        if (b1 == null || b2 == null) {
            b1?.recycle()
            b2?.recycle()
            return 0.0
        }

        try {
            val hash1 = computeDHash(b1)
            val hash2 = computeDHash(b2)
            return similarity(hash1, hash2)
        } finally {
            b1.recycle()
            b2.recycle()
        }
    }

    // MARK: - Private Helpers

    private fun loadImage(uriString: String): Bitmap? {
        val clean = if (uriString.startsWith("file://")) uriString.substring(7) else uriString
        val file = File(clean)
        if (file.exists()) {
            return BitmapFactory.decodeFile(file.absolutePath)
        }
        try {
            val uri = Uri.parse(uriString)
            val context = NitroModules.applicationContext
            if (context != null && uri.scheme == "content") {
                context.contentResolver.openInputStream(uri)?.use { stream ->
                    return BitmapFactory.decodeStream(stream)
                }
            }
        } catch (_: Exception) {}
        return null
    }

    /**
     * Phát hiện khuôn mặt bằng android.media.FaceDetector tiêu chuẩn của Android SDK
     */
    private fun detectFace(bitmap: Bitmap): Boolean {
        var scaled: Bitmap? = null
        var rgb565: Bitmap? = null
        try {
            val targetWidth = 400
            val targetHeight = (bitmap.height.toFloat() / bitmap.width.toFloat() * targetWidth).toInt()
            val evenWidth = if (targetWidth % 2 == 0) targetWidth else targetWidth - 1
            val evenHeight = if (targetHeight % 2 == 0) targetHeight else targetHeight - 1

            scaled = Bitmap.createScaledBitmap(bitmap, evenWidth, evenHeight, true)
            rgb565 = scaled.copy(Bitmap.Config.RGB_565, false) ?: return false

            val detector = FaceDetector(evenWidth, evenHeight, 1)
            val faces = arrayOfNulls<FaceDetector.Face>(1)
            val count = detector.findFaces(rgb565, faces)
            return count > 0 && faces[0] != null && faces[0]!!.confidence() > 0.4f
        } catch (_: Exception) {
            return false
        } finally {
            if (scaled != null && scaled != bitmap) scaled.recycle()
            if (rgb565 != null && rgb565 != bitmap) rgb565.recycle()
        }
    }

    /**
     * Tính mã băm Difference Hash (dHash) 64-bit
     */
    private fun computeDHash(bitmap: Bitmap): String {
        var scaled: Bitmap? = null
        try {
            scaled = Bitmap.createScaledBitmap(bitmap, 9, 8, true)
            var hash = 0L
            for (y in 0 until 8) {
                for (x in 0 until 8) {
                    val leftPixel = scaled.getPixel(x, y)
                    val rightPixel = scaled.getPixel(x + 1, y)

                    val leftGray = (Color.red(leftPixel) * 299 +
                                    Color.green(leftPixel) * 587 +
                                    Color.blue(leftPixel) * 114) / 1000
                    val rightGray = (Color.red(rightPixel) * 299 +
                                     Color.green(rightPixel) * 587 +
                                     Color.blue(rightPixel) * 114) / 1000

                    hash = (hash shl 1) or (if (leftGray > rightGray) 1L else 0L)
                }
            }
            return String.format("%016x", hash)
        } catch (_: Exception) {
            return ""
        } finally {
            if (scaled != null && scaled != bitmap) scaled.recycle()
        }
    }

    /**
     * Tính độ tương đồng Hamming từ 2 mã băm Hex 64-bit
     */
    private fun similarity(hash1: String, hash2: String): Double {
        if (hash1.isEmpty() || hash2.isEmpty() || hash1.length != 16 || hash2.length != 16) {
            return 0.0
        }
        return try {
            val val1 = java.lang.Long.parseUnsignedLong(hash1, 16)
            val val2 = java.lang.Long.parseUnsignedLong(hash2, 16)
            val xorVal = val1 xor val2
            val diffBits = java.lang.Long.bitCount(xorVal)
            maxOf(0.0, 1.0 - (diffBits.toDouble() / 64.0))
        } catch (_: Exception) {
            0.0
        }
    }
}
