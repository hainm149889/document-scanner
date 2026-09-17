import Foundation
import NitroModules
import AVFoundation

class HybridDocumentScanner: HybridDocumentScannerSpec {
  func getNativeVersion() throws -> String {
    return "0.1.0-ios"
  }

  func ping(message: String) throws -> String {
    return "iOS Pong: \(message)"
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
      cameraView.capture(enableFlash: enableFlash) { result in
        switch result {
        case .success(let dict):
          let doc = NativeCapturedDocument(
            imageUri: dict["imageUri"] as? String ?? "",
            width: dict["width"] as? Double ?? 0.0,
            height: dict["height"] as? Double ?? 0.0,
            orientation: dict["orientation"] as? Double ?? 0.0
          )
          promise.resolve(withResult: doc)
        case .failure(let error):
          promise.reject(withError: error)
        }
      }
    }

    return promise
  }
}
