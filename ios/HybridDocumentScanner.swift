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
}
