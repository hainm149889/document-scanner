import UIKit
import CoreImage
import Vision

class VisionEdgeDetector {
    
    // Tái sử dụng CIContext duy nhất để tránh tạo lại GPU Context tốn bộ nhớ & CPU/GPU Overhead
    private static let sharedCIContext = CIContext(options: [.useSoftwareRenderer: false])
    
    /// Nắn thẳng ảnh nghiêng dựa vào 4 tọa độ góc (Đã tối ưu bộ nhớ với Autoreleasepool)
    static func perspectiveCorrect(image: UIImage, corners: [CGPoint]) -> UIImage? {
        guard corners.count == 4 else { return nil }
        
        return autoreleasepool { () -> UIImage? in
            guard let ciImage = CIImage(image: image) else { return nil }
            
            let topLeft = corners[0]
            let topRight = corners[1]
            let bottomRight = corners[2]
            let bottomLeft = corners[3]
            
            guard let filter = CIFilter(name: "CIPerspectiveCorrection") else { return nil }
            filter.setValue(ciImage, forKey: kCIInputImageKey)
            filter.setValue(CIVector(cgPoint: topLeft), forKey: "inputTopLeft")
            filter.setValue(CIVector(cgPoint: topRight), forKey: "inputTopRight")
            filter.setValue(CIVector(cgPoint: bottomRight), forKey: "inputBottomRight")
            filter.setValue(CIVector(cgPoint: bottomLeft), forKey: "inputBottomLeft")
            
            guard let outputCIImage = filter.outputImage else { return nil }
            
            guard let cgImage = sharedCIContext.createCGImage(outputCIImage, from: outputCIImage.extent) else { return nil }
            
            return UIImage(cgImage: cgImage, scale: image.scale, orientation: .up)
        }
    }
}
