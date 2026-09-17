import Foundation
import NitroModules

class HybridDocumentScanner: HybridDocumentScannerSpec {
  func getNativeVersion() throws -> String {
    return "0.1.0-ios"
  }

  func ping(message: String) throws -> String {
    return "iOS Pong: \(message)"
  }
}
