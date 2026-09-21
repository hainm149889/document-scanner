import UIKit
import CoreImage
import Vision

extension UIImage {
    /// Chuẩn hóa orientation của UIImage về .up để đảm bảo raw pixel buffer luôn đúng chiều
    func normalizedOrientation() -> UIImage {
        if imageOrientation == .up { return self }
        UIGraphicsBeginImageContextWithOptions(size, false, scale)
        draw(in: CGRect(origin: .zero, size: size))
        let normalized = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()
        return normalized ?? self
    }
}

class VisionEdgeDetector {
    
    // Tái sử dụng CIContext duy nhất để tránh tạo lại GPU Context tốn bộ nhớ & CPU/GPU Overhead
    private static let sharedCIContext = CIContext(options: [.useSoftwareRenderer: false])
    
    /// Nắn thẳng ảnh nghiêng dựa vào 4 tọa độ góc (Đã tối ưu bộ nhớ với Autoreleasepool)
    static func perspectiveCorrect(image: UIImage, corners: [CGPoint]) -> UIImage? {
        guard corners.count == 4 else { return nil }
        
        return autoreleasepool { () -> UIImage? in
            let normalizedImage = image.normalizedOrientation()
            guard let ciImage = CIImage(image: normalizedImage) else { return nil }
            
            let h = ciImage.extent.height
            // Chuyển đổi hệ tọa độ UIKit (gốc 0,0 ở Top-Left) sang Core Image (gốc 0,0 ở Bottom-Left)
            // để tránh bị lộn ngược ảnh 180 độ
            let topLeft = CGPoint(x: corners[0].x, y: h - corners[0].y)
            let topRight = CGPoint(x: corners[1].x, y: h - corners[1].y)
            let bottomRight = CGPoint(x: corners[2].x, y: h - corners[2].y)
            let bottomLeft = CGPoint(x: corners[3].x, y: h - corners[3].y)
            
            guard let filter = CIFilter(name: "CIPerspectiveCorrection") else { return nil }
            filter.setValue(ciImage, forKey: kCIInputImageKey)
            filter.setValue(CIVector(cgPoint: topLeft), forKey: "inputTopLeft")
            filter.setValue(CIVector(cgPoint: topRight), forKey: "inputTopRight")
            filter.setValue(CIVector(cgPoint: bottomRight), forKey: "inputBottomRight")
            filter.setValue(CIVector(cgPoint: bottomLeft), forKey: "inputBottomLeft")
            
            guard let outputCIImage = filter.outputImage else { return nil }
            
            guard let cgImage = sharedCIContext.createCGImage(outputCIImage, from: outputCIImage.extent) else { return nil }
            
            return UIImage(cgImage: cgImage, scale: normalizedImage.scale, orientation: .up)
        }
    }
}

