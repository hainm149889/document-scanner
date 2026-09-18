import Foundation
import NitroModules
import AVFoundation

class HybridDocumentScanner: HybridDocumentScannerSpec {
  func getNativeVersion() throws -> String {
    return "iOS AVFoundation & Vision Native Engine v1.0.0"
  }

  func ping(message: String) throws -> String {
    return "iOS Swift received: '\(message)'"
  }

  func getCameraPermissionStatus() throws -> String {
    switch AVCaptureDevice.authorizationStatus(for: .video) {
    case .authorized:
      return "granted"
    case .denied:
      return "denied"
    case .restricted:
      return "restricted"
    case .notDetermined:
      return "not-determined"
    @unknown default:
      return "not-determined"
    }
  }

  func requestCameraPermission() throws -> Promise<Bool> {
    let promise = Promise<Bool>()
    let status = AVCaptureDevice.authorizationStatus(for: .video)
    switch status {
    case .authorized:
      promise.resolve(withResult: true)
    case .denied, .restricted:
      promise.resolve(withResult: false)
    case .notDetermined:
      AVCaptureDevice.requestAccess(for: .video) { granted in
        promise.resolve(withResult: granted)
      }
    @unknown default:
      promise.resolve(withResult: false)
    }
    return promise
  }

  func capturePhoto(options: NativeCaptureOptions) throws -> Promise<NativeCapturedDocument> {
    let promise = Promise<NativeCapturedDocument>()

    DispatchQueue.main.async {
      guard let cameraView = DocumentCameraView.sharedCurrentView else {
        promise.reject(withError: NSError(
          domain: "HybridDocumentScanner",
          code: -1,
          userInfo: [NSLocalizedDescriptionKey: "Camera view active instance not found"]
        ))
        return
      }

      let enableFlash = options.enableFlash ?? false
      let autoCrop = options.autoCrop ?? false
      let detectPerspective = options.detectPerspective ?? false
      let documentType = options.documentType ?? "cccd"

      cameraView.capture(enableFlash: enableFlash, autoCrop: autoCrop, detectPerspective: detectPerspective, documentType: documentType) { result in
        switch result {
        case .success(let dict):
          let doc = NativeCapturedDocument(
            imageUri: dict["imageUri"] as? String ?? "",
            width: dict["width"] as? Double ?? 0.0,
            height: dict["height"] as? Double ?? 0.0,
            orientation: dict["orientation"] as? Double ?? 0.0,
            isCropped: dict["isCropped"] as? Bool ?? false,
            corners: nil
          )
          promise.resolve(withResult: doc)
        case .failure(let error):
          promise.reject(withError: error)
        }
      }
    }

    return promise
  }

  func validateDocumentImage(imageUri: String) throws -> Promise<ImageValidationResult> {
    let promise = Promise<ImageValidationResult>()
    DispatchQueue.global(qos: .userInitiated).async {
      let res = ImageValidator.validate(imageUri: imageUri)
      let result = ImageValidationResult(hasFace: res.hasFace, imageHash: res.hash)
      promise.resolve(withResult: result)
    }
    return promise
  }

  func compareImages(imageUri1: String, imageUri2: String) throws -> Promise<Double> {
    let promise = Promise<Double>()
    DispatchQueue.global(qos: .userInitiated).async {
      let sim = ImageValidator.compare(imageUri1: imageUri1, imageUri2: imageUri2)
      promise.resolve(withResult: sim)
    }
    return promise
  }

  func cleanCache() throws -> Promise<Bool> {
    let promise = Promise<Bool>()
    DispatchQueue.global(qos: .utility).async {
      let success = DocumentCameraView.clearCacheFiles()
      promise.resolve(withResult: success)
    }
    return promise
  }
}
