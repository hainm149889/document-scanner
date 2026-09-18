import UIKit
import CoreImage
import Vision

class VisionEdgeDetector {
    
    /// Nắn thẳng ảnh nghiêng dựa vào 4 tọa độ góc
    static func perspectiveCorrect(image: UIImage, corners: [CGPoint]) -> UIImage? {
        guard corners.count == 4, let ciImage = CIImage(image: image) else { return nil }
        
        let topLeft = corners[0]
        let topRight = corners[1]
        let bottomRight = corners[2]
        let bottomLeft = corners[3]
        
        let filter = CIFilter(name: "CIPerspectiveCorrection")
        filter?.setValue(ciImage, forKey: kCIInputImageKey)
        filter?.setValue(CIVector(cgPoint: topLeft), forKey: "inputTopLeft")
        filter?.setValue(CIVector(cgPoint: topRight), forKey: "inputTopRight")
        filter?.setValue(CIVector(cgPoint: bottomRight), forKey: "inputBottomRight")
        filter?.setValue(CIVector(cgPoint: bottomLeft), forKey: "inputBottomLeft")
        
        guard let outputCIImage = filter?.outputImage else { return nil }
        
        let context = CIContext(options: nil)
        guard let cgImage = context.createCGImage(outputCIImage, from: outputCIImage.extent) else { return nil }
        
        return UIImage(cgImage: cgImage, scale: image.scale, orientation: .up)
    }
}
