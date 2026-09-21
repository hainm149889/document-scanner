import Foundation
import UIKit
import Vision
#if canImport(NitroModules)
import NitroModules
#endif

public final class DocumentOcrAnalyzer {

    public static func extractData(imageUri: String, documentType: String) -> ExtractedDocumentData {
        guard let image = loadImage(uriString: imageUri),
              let cgImage = image.cgImage else {
            return emptyResult()
        }

        var detectedLines: [String] = []
        let semaphore = DispatchSemaphore(value: 0)

        let request = VNRecognizeTextRequest { request, error in
            defer { semaphore.signal() }
            guard error == nil,
                  let observations = request.results as? [VNRecognizedTextObservation] else {
                return
            }

            for observation in observations {
                if let topCandidate = observation.topCandidates(1).first {
                    let text = topCandidate.string.trimmingCharacters(in: .whitespacesAndNewlines)
                    if !text.isEmpty {
                        detectedLines.append(text)
                    }
                }
            }
        }

        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = true

        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        do {
            try handler.perform([request])
            semaphore.wait()
        } catch {
            return emptyResult()
        }

        if documentType == "passport" {
            return parsePassport(lines: detectedLines)
        } else {
            return parseCccd(lines: detectedLines)
        }
    }

    private static func parseCccd(lines: [String]) -> ExtractedDocumentData {
        var idNumber = ""
        var fullName = ""
        var dateOfBirth = ""
        var gender = ""
        var nationality = "Việt Nam"
        var placeOfOrigin = ""
        var placeOfResidence = ""
        var expiryDate = ""
        let issueDate = "Theo quy định"

        let idPattern = "\\b(\\d{12})\\b"
        let oldIdPattern = "\\b(\\d{9})\\b"
        let datePattern = "\\b(\\d{2}[/.-]\\d{2}[/.-]\\d{4})\\b"

        for (index, line) in lines.enumerated() {
            let lower = line.lowercased()

            // 1. Số CCCD
            if idNumber.isEmpty {
                if let match = matchRegex(pattern: idPattern, in: line) ?? matchRegex(pattern: oldIdPattern, in: line) {
                    idNumber = match
                } else if lower.contains("số") || lower.contains("no") {
                    let digits = line.filter { $0.isNumber }
                    if digits.count >= 9 && digits.count <= 12 {
                        idNumber = digits
                    }
                }
            }

            // 2. Họ và tên
            if fullName.isEmpty {
                if lower.contains("họ và tên") || lower.contains("full name") || lower.contains("họ tên") {
                    let cleaned = line.replacingOccurrences(of: "(?i)(họ và tên|full name|họ tên|[:;.,-])", with: "", options: .regularExpression).trimmingCharacters(in: .whitespacesAndNewlines)
                    if cleaned.count >= 3 && cleaned.rangeOfCharacter(from: .letters) != nil {
                        fullName = cleaned
                    } else if index + 1 < lines.count {
                        let nextLine = lines[index + 1].trimmingCharacters(in: .whitespacesAndNewlines)
                        if nextLine.count >= 3 && isUppercaseName(nextLine) {
                            fullName = nextLine
                        }
                    }
                } else if isUppercaseName(line) && !lower.contains("cộng hòa") && !lower.contains("độc lập") && !lower.contains("căn cước") && !lower.contains("việt nam") {
                    fullName = line
                }
            }

            // 3. Ngày sinh
            if dateOfBirth.isEmpty {
                if lower.contains("ngày sinh") || lower.contains("date of birth") || lower.contains("sinh ngày") {
                    if let match = matchRegex(pattern: datePattern, in: line) {
                        dateOfBirth = match
                    } else if index + 1 < lines.count, let nextMatch = matchRegex(pattern: datePattern, in: lines[index + 1]) {
                        dateOfBirth = nextMatch
                    }
                } else if let match = matchRegex(pattern: datePattern, in: line) {
                    dateOfBirth = match
                }
            }

            // 4. Giới tính
            if gender.isEmpty {
                if lower.contains("nam") && !lower.contains("việt nam") {
                    gender = "Nam"
                } else if lower.contains("nữ") || lower.contains("nu") {
                    gender = "Nữ"
                }
            }

            // 5. Quốc tịch
            if lower.contains("quốc tịch") || lower.contains("nationality") {
                if lower.contains("việt nam") || lower.contains("viet nam") {
                    nationality = "Việt Nam"
                }
            }

            // 6. Quê quán
            if placeOfOrigin.isEmpty && (lower.contains("quê quán") || lower.contains("place of origin")) {
                let cleaned = line.replacingOccurrences(of: "(?i)(quê quán|place of origin|[:;])", with: "", options: .regularExpression).trimmingCharacters(in: .whitespacesAndNewlines)
                if !cleaned.isEmpty {
                    placeOfOrigin = cleaned
                } else if index + 1 < lines.count {
                    placeOfOrigin = lines[index + 1].trimmingCharacters(in: .whitespacesAndNewlines)
                }
            }

            // 7. Nơi thường trú
            if placeOfResidence.isEmpty && (lower.contains("thường trú") || lower.contains("place of residence") || lower.contains("nơi thường trú")) {
                let cleaned = line.replacingOccurrences(of: "(?i)(nơi thường trú|thường trú|place of residence|[:;])", with: "", options: .regularExpression).trimmingCharacters(in: .whitespacesAndNewlines)
                if !cleaned.isEmpty {
                    placeOfResidence = cleaned
                } else if index + 1 < lines.count {
                    placeOfResidence = lines[index + 1].trimmingCharacters(in: .whitespacesAndNewlines)
                }
            }

            // 8. Hạn sử dụng
            if expiryDate.isEmpty && (lower.contains("giá trị đến") || lower.contains("expiry") || lower.contains("có giá trị")) {
                if let match = matchRegex(pattern: datePattern, in: line) {
                    expiryDate = match
                } else if lower.contains("không thời hạn") || lower.contains("vô thời hạn") {
                    expiryDate = "Không thời hạn"
                }
            }
        }

        return ExtractedDocumentData(
            idNumber: idNumber.isEmpty ? "Chưa nhận diện được số" : idNumber,
            fullName: fullName.isEmpty ? "Chưa nhận diện được họ tên" : fullName,
            dateOfBirth: dateOfBirth.isEmpty ? "Chưa rõ" : dateOfBirth,
            gender: gender.isEmpty ? "Chưa rõ" : gender,
            nationality: nationality,
            placeOfOrigin: placeOfOrigin.isEmpty ? "Chưa rõ" : placeOfOrigin,
            placeOfResidence: placeOfResidence.isEmpty ? "Chưa rõ" : placeOfResidence,
            expiryDate: expiryDate.isEmpty ? "Theo quy định" : expiryDate,
            issueDate: issueDate,
            mrzLines: [],
            rawText: lines
        )
    }

    private static func parsePassport(lines: [String]) -> ExtractedDocumentData {
        var idNumber = ""
        var fullName = ""
        var dateOfBirth = ""
        var gender = ""
        var nationality = "Việt Nam"
        var expiryDate = ""
        var mrzLines: [String] = []

        for line in lines {
            let clean = line.replacingOccurrences(of: " ", with: "").uppercased()
            if clean.hasPrefix("P<") || clean.hasPrefix("P<<") || (clean.count >= 30 && clean.contains("<<")) {
                mrzLines.append(clean)
            } else if clean.count >= 30 && clean.contains("<") && clean.rangeOfCharacter(from: .decimalDigits) != nil {
                mrzLines.append(clean)
            }
        }

        if mrzLines.count >= 2 {
            let line1 = mrzLines[0]
            let line2 = mrzLines[1]

            // Line 1
            if line1.count >= 5 {
                let country = String(line1.prefix(5).suffix(3))
                nationality = (country == "VNM") ? "Việt Nam" : country
                let namesPart = String(line1.dropFirst(5)).replacingOccurrences(of: "<", with: " ").trimmingCharacters(in: .whitespacesAndNewlines)
                fullName = namesPart.components(separatedBy: "  ").filter { !$0.isEmpty }.joined(separator: " ")
            }

            // Line 2
            if line2.count >= 20 {
                let passNum = String(line2.prefix(9)).replacingOccurrences(of: "<", with: "")
                idNumber = passNum

                // DOB
                if line2.count >= 19 {
                    let dobIndexStart = line2.index(line2.startIndex, offsetBy: 13)
                    let dobIndexEnd = line2.index(line2.startIndex, offsetBy: 19)
                    let dobRaw = String(line2[dobIndexStart..<dobIndexEnd])
                    if dobRaw.count == 6 && dobRaw.allSatisfy({ $0.isNumber }) {
                        let yy = String(dobRaw.prefix(2))
                        let mm = String(dobRaw.dropFirst(2).prefix(2))
                        let dd = String(dobRaw.suffix(2))
                        let yearPrefix = (Int(yy) ?? 0 > 30) ? "19" : "20"
                        dateOfBirth = "\(dd)/\(mm)/\(yearPrefix)\(yy)"
                    }
                }

                // Sex
                if line2.count >= 21 {
                    let sexIndex = line2.index(line2.startIndex, offsetBy: 20)
                    let sexChar = line2[sexIndex]
                    gender = (sexChar == "M") ? "Nam" : (sexChar == "F" ? "Nữ" : "Chưa rõ")
                }

                // Expiry
                if line2.count >= 27 {
                    let expIndexStart = line2.index(line2.startIndex, offsetBy: 21)
                    let expIndexEnd = line2.index(line2.startIndex, offsetBy: 27)
                    let expRaw = String(line2[expIndexStart..<expIndexEnd])
                    if expRaw.count == 6 && expRaw.allSatisfy({ $0.isNumber }) {
                        let yy = String(expRaw.prefix(2))
                        let mm = String(expRaw.dropFirst(2).prefix(2))
                        let dd = String(expRaw.suffix(2))
                        expiryDate = "\(dd)/\(mm)/20\(yy)"
                    }
                }
            }
        }

        if idNumber.isEmpty {
            for line in lines {
                if let match = matchRegex(pattern: "\\b([A-Z]\\d{7,8})\\b", in: line) {
                    idNumber = match
                    break
                }
            }
        }

        return ExtractedDocumentData(
            idNumber: idNumber.isEmpty ? "Chưa rõ số hộ chiếu" : idNumber,
            fullName: fullName.isEmpty ? "Chưa rõ họ tên" : fullName,
            dateOfBirth: dateOfBirth.isEmpty ? "Chưa rõ" : dateOfBirth,
            gender: gender.isEmpty ? "Chưa rõ" : gender,
            nationality: nationality,
            placeOfOrigin: "",
            placeOfResidence: "",
            expiryDate: expiryDate.isEmpty ? "Theo quy định" : expiryDate,
            issueDate: "Theo quy định",
            mrzLines: mrzLines,
            rawText: lines
        )
    }

    private static func isUppercaseName(_ str: String) -> Bool {
        let words = str.split(separator: " ").filter { !$0.isEmpty }
        if words.count < 2 || words.count > 6 { return false }
        return words.allSatisfy { word in
            word.allSatisfy { $0.isLetter && ($0.isUppercase || !$0.isLowercase) }
        }
    }

    private static func matchRegex(pattern: String, in text: String) -> String? {
        guard let regex = try? NSRegularExpression(pattern: pattern) else { return nil }
        let nsString = text as NSString
        let results = regex.matches(in: text, range: NSRange(location: 0, length: nsString.length))
        guard let first = results.first else { return nil }
        return nsString.substring(with: first.range)
    }

    private static func emptyResult() -> ExtractedDocumentData {
        return ExtractedDocumentData(
            idNumber: "Chưa nhận diện được",
            fullName: "Chưa nhận diện được",
            dateOfBirth: "Chưa rõ",
            gender: "Chưa rõ",
            nationality: "Việt Nam",
            placeOfOrigin: "Chưa rõ",
            placeOfResidence: "Chưa rõ",
            expiryDate: "Chưa rõ",
            issueDate: "Chưa rõ",
            mrzLines: [],
            rawText: []
        )
    }

    private static func loadImage(uriString: String) -> UIImage? {
        let clean = uriString.replacingOccurrences(of: "file://", with: "")
        if FileManager.default.fileExists(atPath: clean) {
            return UIImage(contentsOfFile: clean)
        }
        if let url = URL(string: uriString), let data = try? Data(contentsOf: url) {
            return UIImage(data: data)
        }
        return nil
    }
}
