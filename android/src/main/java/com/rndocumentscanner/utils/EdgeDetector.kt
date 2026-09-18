package com.rndocumentscanner.utils

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.PointF

object EdgeDetector {

    /**
     * Nắn thẳng hình ảnh dựa trên 4 tọa độ góc tứ giác
     */
    fun perspectiveTransform(src: Bitmap, corners: List<PointF>): Bitmap {
        val width = src.width
        val height = src.height

        val result = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(result)

        val srcPoints = floatArrayOf(
            corners[0].x, corners[0].y,
            corners[1].x, corners[1].y,
            corners[2].x, corners[2].y,
            corners[3].x, corners[3].y
        )

        val dstPoints = floatArrayOf(
            0f, 0f,
            width.toFloat(), 0f,
            width.toFloat(), height.toFloat(),
            0f, height.toFloat()
        )

        val matrix = Matrix()
        matrix.setPolyToPoly(srcPoints, 0, dstPoints, 0, 4)

        canvas.drawBitmap(src, matrix, Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG))

        // Giải phóng nguồn ảnh cũ nếu đã tạo ra bitmap mới thành công
        if (!src.isRecycled && src != result) {
            src.recycle()
        }

        return result
    }
}
