package com.rndocumentscanner.utils

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.ExifInterface
import android.net.Uri
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.Text
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import com.margelo.nitro.NitroModules
import com.margelo.nitro.rndocumentscanner.ExtractedDocumentData
import java.io.File

object DocumentOcrAnalyzer {

    fun extractData(imageUri: String, documentType: String): ExtractedDocumentData {
        val bitmap = loadImage(imageUri) ?: return emptyResult()
        val rotated = rotateImageIfRequired(bitmap, imageUri)

        try {
            val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
            val inputImage = InputImage.fromBitmap(rotated, 0)
            val visionText: Text = Tasks.await(recognizer.process(inputImage))

            val allLines = mutableListOf<String>()
            for (block in visionText.textBlocks) {
                for (line in block.lines) {
                    val trimmed = line.text.trim()
                    if (trimmed.isNotEmpty()) {
                        allLines.add(trimmed)
                    }
                }
            }

            return if (documentType == "passport") {
                parsePassport(allLines)
            } else {
                parseCccd(allLines)
            }
        } catch (e: Exception) {
            e.printStackTrace()
            return emptyResult()
        } finally {
            if (!rotated.isRecycled) {
                rotated.recycle()
            }
            if (bitmap != rotated && !bitmap.isRecycled) {
                bitmap.recycle()
            }
        }
    }

    private fun parseCccd(lines: List<String>): ExtractedDocumentData {
        var idNumber = ""
        var fullName = ""
        var dateOfBirth = ""
        var gender = ""
        var nationality = "Việt Nam"
        var placeOfOrigin = ""
        var placeOfResidence = ""
        var expiryDate = ""
        var issueDate = ""

        // Regex patterns
        val idRegex = Regex("""\b(\d{12})\b""")
        val oldIdRegex = Regex("""\b(\d{9})\b""")
        val dateRegex = Regex("""\b(\d{2}[/.-]\d{2}[/.-]\d{4})\b""")

        for (i in lines.indices) {
            val line = lines[i]
            val lower = line.lowercase()

            // 1. Số CCCD (12 chữ số)
            if (idNumber.isEmpty()) {
                val match = idRegex.find(line) ?: oldIdRegex.find(line)
                if (match != null) {
                    idNumber = match.value
                } else if (lower.contains("số") || lower.contains("no")) {
                    val digits = line.filter { it.isDigit() }
                    if (digits.length in 9..12) {
                        idNumber = digits
                    }
                }
            }

            // 2. Họ và tên
            if (fullName.isEmpty()) {
                if (lower.contains("họ và tên") || lower.contains("full name") || lower.contains("họ tên")) {
                    val cleaned = line.replace(Regex("""(?i)(họ và tên|full name|họ tên|[:;.,-])"""), "").trim()
                    if (cleaned.length >= 3 && cleaned.any { it.isLetter() }) {
                        fullName = cleaned
                    } else if (i + 1 < lines.size) {
                        val nextLine = lines[i + 1].trim()
                        if (nextLine.length >= 3 && isUppercaseName(nextLine)) {
                            fullName = nextLine
                        }
                    }
                } else if (isUppercaseName(line) && !lower.contains("cộng hòa") && !lower.contains("độc lập") && !lower.contains("căn cước") && !lower.contains("việt nam")) {
                    fullName = line
                }
            }

            // 3. Ngày sinh
            if (dateOfBirth.isEmpty()) {
                if (lower.contains("ngày sinh") || lower.contains("date of birth") || lower.contains("sinh ngày") || lower.contains("dob")) {
                    val match = dateRegex.find(line)
                    if (match != null) {
                        dateOfBirth = match.value
                    } else if (i + 1 < lines.size) {
                        val nextMatch = dateRegex.find(lines[i + 1])
                        if (nextMatch != null) dateOfBirth = nextMatch.value
                    }
                } else {
                    val match = dateRegex.find(line)
                    if (match != null && dateOfBirth.isEmpty()) {
                        dateOfBirth = match.value
                    }
                }
            }

            // 4. Giới tính
            if (gender.isEmpty()) {
                if (lower.contains("nam") && !lower.contains("việt nam")) {
                    gender = "Nam"
                } else if (lower.contains("nữ") || lower.contains("nu")) {
                    gender = "Nữ"
                }
            }

            // 5. Quốc tịch
            if (lower.contains("quốc tịch") || lower.contains("nationality")) {
                if (lower.contains("việt nam") || lower.contains("viet nam")) {
                    nationality = "Việt Nam"
                }
            }

            // 6. Quê quán
            if (placeOfOrigin.isEmpty() && (lower.contains("quê quán") || lower.contains("place of origin"))) {
                val cleaned = line.replace(Regex("""(?i)(quê quán|place of origin|[:;])"""), "").trim()
                if (cleaned.isNotEmpty()) {
                    placeOfOrigin = cleaned
                } else if (i + 1 < lines.size) {
                    placeOfOrigin = lines[i + 1].trim()
                }
            }

            // 7. Nơi thường trú
            if (placeOfResidence.isEmpty() && (lower.contains("thường trú") || lower.contains("place of residence") || lower.contains("nơi thường trú"))) {
                val cleaned = line.replace(Regex("""(?i)(nơi thường trú|thường trú|place of residence|[:;])"""), "").trim()
                if (cleaned.isNotEmpty()) {
                    placeOfResidence = cleaned
                } else if (i + 1 < lines.size) {
                    placeOfResidence = lines[i + 1].trim()
                }
            }

            // 8. Hạn sử dụng
            if (expiryDate.isEmpty() && (lower.contains("giá trị đến") || lower.contains("expiry") || lower.contains("có giá trị"))) {
                val match = dateRegex.find(line)
                if (match != null) {
                    expiryDate = match.value
                } else if (lower.contains("không thời hạn") || lower.contains("vô thời hạn")) {
                    expiryDate = "Không thời hạn"
                }
            }
        }

        return ExtractedDocumentData(
            idNumber = idNumber.ifEmpty { "Chưa nhận diện được số" },
            fullName = fullName.ifEmpty { "Chưa nhận diện được họ tên" },
            dateOfBirth = dateOfBirth.ifEmpty { "Chưa rõ" },
            gender = gender.ifEmpty { "Chưa rõ" },
            nationality = nationality,
            placeOfOrigin = placeOfOrigin.ifEmpty { "Chưa rõ" },
            placeOfResidence = placeOfResidence.ifEmpty { "Chưa rõ" },
            expiryDate = expiryDate.ifEmpty { "Theo quy định" },
            issueDate = issueDate.ifEmpty { "Theo quy định" },
            mrzLines = arrayOf(),
            rawText = lines.toTypedArray()
        )
    }

    private fun parsePassport(lines: List<String>): ExtractedDocumentData {
        var idNumber = ""
        var fullName = ""
        var dateOfBirth = ""
        var gender = ""
        var nationality = "Việt Nam"
        var expiryDate = ""
        val mrzLines = mutableListOf<String>()

        // 1. Tìm các dòng MRZ chuẩn ICAO Doc 9303 (Bắt đầu với P< hoặc có nhiều dấu '<')
        for (line in lines) {
            val clean = line.replace(" ", "").uppercase()
            if (clean.startsWith("P<") || clean.startsWith("P<<") || (clean.length >= 30 && clean.contains("<<"))) {
                mrzLines.add(clean)
            } else if (clean.length >= 30 && clean.contains("<") && clean.any { it.isDigit() }) {
                mrzLines.add(clean)
            }
        }

        // Bóc tách từ MRZ nếu tìm thấy đủ 2 dòng
        if (mrzLines.size >= 2) {
            val line1 = mrzLines[0]
            val line2 = mrzLines[1]

            // Line 1: P<VNMNGUYEN<<VAN<AN<<<<...
            try {
                if (line1.length >= 5) {
                    nationality = if (line1.substring(2, 5) == "VNM") "Việt Nam" else line1.substring(2, 5)
                    val namesPart = line1.substring(5).replace("<", " ").trim()
                    fullName = namesPart.split("  ").joinToString(" ")
                }
            } catch (_: Exception) {}

            // Line 2: C1234567<8VNM9808154M3308159001098012345<<68
            try {
                if (line2.length >= 20) {
                    val passNum = line2.substring(0, 9).replace("<", "")
                    idNumber = passNum

                    // DOB (YYMMDD)
                    val dobRaw = line2.substring(13, 19)
                    if (dobRaw.length == 6 && dobRaw.all { it.isDigit() }) {
                        val yy = dobRaw.substring(0, 2)
                        val mm = dobRaw.substring(2, 4)
                        val dd = dobRaw.substring(4, 6)
                        val yearPrefix = if (yy.toInt() > 30) "19" else "20"
                        dateOfBirth = "$dd/$mm/$yearPrefix$yy"
                    }

                    // Sex (M/F)
                    val sexChar = line2[20]
                    gender = when (sexChar) {
                        'M' -> "Nam"
                        'F' -> "Nữ"
                        else -> "Chưa rõ"
                    }

                    // Expiry (YYMMDD)
                    val expRaw = line2.substring(21, 27)
                    if (expRaw.length == 6 && expRaw.all { it.isDigit() }) {
                        val yy = expRaw.substring(0, 2)
                        val mm = expRaw.substring(2, 4)
                        val dd = expRaw.substring(4, 6)
                        expiryDate = "$dd/$mm/20$yy"
                    }
                }
            } catch (_: Exception) {}
        }

        // Nếu MRZ chưa đủ, fallback regex từ các dòng chữ thường
        if (idNumber.isEmpty()) {
            val passportRegex = Regex("""\b([A-Z]\d{7,8})\b""")
            for (line in lines) {
                val match = passportRegex.find(line)
                if (match != null) {
                    idNumber = match.value
                    break
                }
            }
        }

        if (fullName.isEmpty()) {
            for (line in lines) {
                val lower = line.lowercase()
                if (isUppercaseName(line) && !lower.contains("passport") && !lower.contains("hộ chiếu") && !lower.contains("việt nam") && !lower.contains("cộng hòa")) {
                    fullName = line
                    break
                }
            }
        }

        return ExtractedDocumentData(
            idNumber = idNumber.ifEmpty { "Chưa rõ số hộ chiếu" },
            fullName = fullName.ifEmpty { "Chưa rõ họ tên" },
            dateOfBirth = dateOfBirth.ifEmpty { "Chưa rõ" },
            gender = gender.ifEmpty { "Chưa rõ" },
            nationality = nationality,
            placeOfOrigin = "",
            placeOfResidence = "",
            expiryDate = expiryDate.ifEmpty { "Theo quy định" },
            issueDate = "Theo quy định",
            mrzLines = mrzLines.toTypedArray(),
            rawText = lines.toTypedArray()
        )
    }

    private fun isUppercaseName(str: String): Boolean {
        val trimmed = str.trim()
        val words = trimmed.split(" ").filter { it.isNotEmpty() }
        if (words.size !in 2..6) return false
        return words.all { word ->
            word.all { it.isLetter() && (it.isUpperCase() || !it.isLowerCase()) }
        }
    }

    private fun emptyResult(): ExtractedDocumentData {
        return ExtractedDocumentData(
            idNumber = "Chưa nhận diện được",
            fullName = "Chưa nhận diện được",
            dateOfBirth = "Chưa rõ",
            gender = "Chưa rõ",
            nationality = "Việt Nam",
            placeOfOrigin = "Chưa rõ",
            placeOfResidence = "Chưa rõ",
            expiryDate = "Chưa rõ",
            issueDate = "Chưa rõ",
            mrzLines = arrayOf(),
            rawText = arrayOf()
        )
    }

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

    private fun rotateImageIfRequired(img: Bitmap, path: String): Bitmap {
        val clean = if (path.startsWith("file://")) path.substring(7) else path
        val file = File(clean)
        if (!file.exists()) return img

        return try {
            val ei = ExifInterface(clean)
            val orientation = ei.getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)
            val degree = when (orientation) {
                ExifInterface.ORIENTATION_ROTATE_90 -> 90f
                ExifInterface.ORIENTATION_ROTATE_180 -> 180f
                ExifInterface.ORIENTATION_ROTATE_270 -> 270f
                else -> 0f
            }
            if (degree != 0f) {
                val matrix = Matrix()
                matrix.postRotate(degree)
                Bitmap.createBitmap(img, 0, 0, img.width, img.height, matrix, true)
            } else {
                img
            }
        } catch (_: Exception) {
            img
        }
    }
}
