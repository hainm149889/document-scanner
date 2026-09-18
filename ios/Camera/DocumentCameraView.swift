import UIKit
import AVFoundation

@objc(DocumentCameraView)
class DocumentCameraView: UIView, AVCapturePhotoCaptureDelegate {
    private var captureSession: AVCaptureSession?
    private var previewLayer: AVCaptureVideoPreviewLayer?
    private var videoDeviceInput: AVCaptureDeviceInput?
    private var photoOutput: AVCapturePhotoOutput?

    private var currentCompletion: ((Result<[String: Any], Error>) -> Void)?
    private var currentAutoCrop: Bool = false
    private var currentDocumentType: String = "cccd"

    // Static reference để HybridObject có thể gọi trực tiếp
    static weak var sharedCurrentView: DocumentCameraView?

    @objc var enableFlash: Bool = false {
        didSet {
            toggleFlash(on: enableFlash)
        }
    }

    override init(frame: CGRect) {
        super.init(frame: frame)
        checkPermissionAndSetup()
        DocumentCameraView.sharedCurrentView = self
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        checkPermissionAndSetup()
        DocumentCameraView.sharedCurrentView = self
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

        let output = AVCapturePhotoOutput()
        if session.canAddOutput(output) {
            session.addOutput(output)
            self.photoOutput = output
        }

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

    func capture(enableFlash: Bool, autoCrop: Bool, documentType: String, completion: @escaping (Result<[String: Any], Error>) -> Void) {
        guard let photoOutput = self.photoOutput else {
            completion(.failure(NSError(domain: "DocumentCameraView", code: -1, userInfo: [NSLocalizedDescriptionKey: "Photo output unavailable"])))
            return
        }

        self.currentCompletion = completion
        self.currentAutoCrop = autoCrop
        self.currentDocumentType = documentType

        let settings = AVCapturePhotoSettings()
        if videoDeviceInput?.device.hasFlash == true {
            settings.flashMode = enableFlash ? .on : .off
        }

        photoOutput.capturePhoto(with: settings, delegate: self)
    }

    func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: Error?) {
        if let error = error {
            currentCompletion?(.failure(error))
            currentCompletion = nil
            return
        }

        guard let imageData = photo.fileDataRepresentation(),
              var image = UIImage(data: imageData) else {
            currentCompletion?(.failure(NSError(domain: "DocumentCameraView", code: -2, userInfo: [NSLocalizedDescriptionKey: "Failed to process image data"])))
            currentCompletion = nil
            return
        }

        var isCropped = false

        // Thực hiện Cắt Ảnh (Auto-Crop) nếu được bật
        if currentAutoCrop {
            let aspectRatio: CGFloat = currentDocumentType == "passport" ? 1.42 : 1.585
            if let cropped = cropImageToFrame(image: image, targetAspectRatio: aspectRatio) {
                image = cropped
                isCropped = true
            }
        }

        let fileName = "scan_\(UUID().uuidString).jpg"
        let fileURL = FileManager.default.temporaryDirectory.appendingPathComponent(fileName)

        if let finalData = image.jpegData(compressionQuality: 0.9) {
            do {
                try finalData.write(to: fileURL)
                let result: [String: Any] = [
                    "imageUri": fileURL.absoluteString,
                    "width": Double(image.size.width * image.scale),
                    "height": Double(image.size.height * image.scale),
                    "orientation": 0,
                    "isCropped": isCropped
                ]
                currentCompletion?(.success(result))
            } catch {
                currentCompletion?(.failure(error))
            }
        } else {
            currentCompletion?(.failure(NSError(domain: "DocumentCameraView", code: -3, userInfo: [NSLocalizedDescriptionKey: "Failed to compress cropped image"])))
        }

        currentCompletion = nil
    }

    private func cropImageToFrame(image: UIImage, targetAspectRatio: CGFloat) -> UIImage? {
        guard let cgImage = image.cgImage else { return nil }

        let imgWidth = CGFloat(cgImage.width)
        let imgHeight = CGFloat(cgImage.height)

        // Tính toán kích thước vùng crop dựa theo Aspect Ratio trung tâm (85% chiều rộng)
        let cropWidth = imgWidth * 0.85
        let cropHeight = cropWidth / targetAspectRatio

        let originX = (imgWidth - cropWidth) / 2.0
        let originY = (imgHeight - cropHeight) / 2.0

        let cropRect = CGRect(x: originX, y: originY, width: cropWidth, height: cropHeight)

        guard let croppedCgImage = cgImage.cropping(to: cropRect) else { return nil }
        return UIImage(cgImage: croppedCgImage, scale: image.scale, orientation: image.imageOrientation)
    }

    deinit {
        captureSession?.stopRunning()
        if DocumentCameraView.sharedCurrentView === self {
            DocumentCameraView.sharedCurrentView = nil
        }
    }
}