import UIKit
import AVFoundation

@objc(DocumentCameraView)
class DocumentCameraView: UIView {
    private var captureSession: AVCaptureSession?
    private var previewLayer: AVCaptureVideoPreviewLayer?
    private var videoDeviceInput: AVCaptureDeviceInput?

    @objc var enableFlash: Bool = false {
        didSet {
            toggleFlash(on: enableFlash)
        }
    }

    override init(frame: CGRect) {
        super.init(frame: frame)
        checkPermissionAndSetup()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        checkPermissionAndSetup()
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        previewLayer?.frame = bounds
    }

    private func checkPermissionAndSetup() {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            setupCamera()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
                DispatchQueue.main.async {
                    if granted {
                        self?.setupCamera()
                    } else {
                        print("[DocumentCameraView] Camera permission denied by user")
                    }
                }
            }
        case .denied, .restricted:
            print("[DocumentCameraView] Camera permission denied or restricted")
        @unknown default:
            break
        }
    }

    private func setupCamera() {
        guard captureSession == nil else { return }

        let session = AVCaptureSession()
        session.beginConfiguration()
        session.sessionPreset = .photo

        guard let videoDevice = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
              let videoInput = try? AVCaptureDeviceInput(device: videoDevice),
              session.canAddInput(videoInput) else {
            session.commitConfiguration()
            return
        }

        session.addInput(videoInput)
        self.videoDeviceInput = videoInput

        let preview = AVCaptureVideoPreviewLayer(session: session)
        preview.videoGravity = .resizeAspectFill
        layer.addSublayer(preview)
        preview.frame = bounds
        self.previewLayer = preview

        session.commitConfiguration()
        self.captureSession = session

        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            self?.captureSession?.startRunning()
        }
    }

    private func toggleFlash(on: Bool) {
        guard let device = videoDeviceInput?.device, device.hasTorch else { return }
        do {
            try device.lockForConfiguration()
            device.torchMode = on ? .on : .off
            device.unlockForConfiguration()
        } catch {
            print("[DocumentCameraView] Torch config error: \(error)")
        }
    }

    deinit {
        captureSession?.stopRunning()
    }
}