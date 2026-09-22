import UIKit
import Vision
import CoreImage

class ImageValidator {

    /// Kiểm tra ảnh: phát hiện khuôn mặt và sinh mã băm dHash (64-bit hex)
    static func validate(imageUri: String) -> (hasFace: Bool, hash: String) {
        return autoreleasepool {
            guard let image = loadImage(from: imageUri), let cgImage = image.cgImage else {
                return (false, "")
            }

            let hasFace = detectFace(cgImage: cgImage)
            let hash = computeDHash(image: image)

            return (hasFace, hash)
        }
    }

    /// So sánh độ tương đồng giữa 2 ảnh (0.0 đến 1.0) dựa trên khoảng cách Hamming của dHash
    static func compare(imageUri1: String, imageUri2: String) -> Double {
        return autoreleasepool {
            guard let img1 = loadImage(from: imageUri1),
                  let img2 = loadImage(from: imageUri2) else {
                return 0.0
            }

            let hash1 = computeDHash(image: img1)
            let hash2 = computeDHash(image: img2)

            return similarity(hash1: hash1, hash2: hash2)
        }
    }

    // MARK: - Private Helpers

    private static func loadImage(from uri: String) -> UIImage? {
        let cleanUri = uri.replacingOccurrences(of: "file://", with: "")
        if let image = UIImage(contentsOfFile: cleanUri) {
            return image
        }
        if let url = URL(string: uri), let data = try? Data(contentsOf: url) {
            return UIImage(data: data)
        }
        return nil
    }

    /// Phát hiện khuôn mặt bằng Vision Framework
    private static func detectFace(cgImage: CGImage) -> Bool {
        var foundFace = false
        let request = VNDetectFaceRectanglesRequest { req, err in
            guard err == nil, let results = req.results as? [VNFaceObservation] else { return }
            foundFace = !results.isEmpty
        }

        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        try? handler.perform([request])
        return foundFace
    }

    /// Tính mã băm Difference Hash (dHash) 64-bit
    private static func computeDHash(image: UIImage) -> String {
        let targetWidth = 9
        let targetHeight = 8

        // Vẽ ảnh về kích thước 9x8 grayscale
        let colorSpace = CGColorSpaceCreateDeviceGray()
        guard let context = CGContext(
            data: nil,
            width: targetWidth,
            height: targetHeight,
            bitsPerComponent: 8,
            bytesPerRow: targetWidth,
            space: colorSpace,
            bitmapInfo: CGImageAlphaInfo.none.rawValue
        ), let cgImage = image.cgImage else {
            return ""
        }

        context.draw(cgImage, in: CGRect(x: 0, y: 0, width: targetWidth, height: targetHeight))
        guard let pixelData = context.data else { return "" }

        let buffer = pixelData.bindMemory(to: UInt8.self, capacity: targetWidth * targetHeight)

        var hash: UInt64 = 0
        for y in 0..<targetHeight {
            for x in 0..<(targetWidth - 1) {
                let leftPixel = buffer[y * targetWidth + x]
                let rightPixel = buffer[y * targetWidth + (x + 1)]
                hash = (hash << 1) | (leftPixel > rightPixel ? 1 : 0)
            }
        }

        return String(format: "%016llx", hash)
    }

    /// Tính độ tương đồng Hamming từ 2 mã băm Hex 64-bit
    private static func similarity(hash1: String, hash2: String) -> Double {
        guard let val1 = UInt64(hash1, radix: 16),
              let val2 = UInt64(hash2, radix: 16) else {
            return 0.0
        }

        let xorVal = val1 ^ val2
        let differingBits = xorVal.nonzeroBitCount
        return max(0.0, 1.0 - (Double(differingBits) / 64.0))
    }
}
