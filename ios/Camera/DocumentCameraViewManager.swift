import Foundation
import React

@objc(DocumentCameraViewManager)
class DocumentCameraViewManager: RCTViewManager {

    override func view() -> UIView! {
        return DocumentCameraView()
    }

    override static func requiresMainQueueSetup() -> Bool {
        return true
    }
}