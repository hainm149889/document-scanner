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
    private var currentDetectPerspective: Bool = false
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
        if let connection = previewLayer?.connection, connection.isVideoOrientationSupported {
            connection.videoOrientation = .portrait
        }
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

        // Cấu hình tối ưu độ sắc nét cho cảm biến camera
        do {
            try videoDevice.lockForConfiguration()
            if videoDevice.isFocusModeSupported(.continuousAutoFocus) {
                videoDevice.focusMode = .continuousAutoFocus
            }
            if videoDevice.isExposureModeSupported(.continuousAutoExposure) {
                videoDevice.exposureMode = .continuousAutoExposure
            }
            if videoDevice.isWhiteBalanceModeSupported(.continuousAutoWhiteBalance) {
                videoDevice.whiteBalanceMode = .continuousAutoWhiteBalance
            }
            // Ưu tiên cự ly gần để đọc văn bản rõ nét
            if videoDevice.isAutoFocusRangeRestrictionSupported {
                videoDevice.autoFocusRangeRestriction = .near
            }
            if videoDevice.isLowLightBoostSupported {
                videoDevice.automaticallyEnablesLowLightBoostWhenAvailable = true
            }
            videoDevice.isSubjectAreaChangeMonitoringEnabled = true
            videoDevice.unlockForConfiguration()
        } catch {
            print("[DocumentCameraView] Error configuring device settings: \(error)")
        }

        session.addInput(videoInput)
        self.videoDeviceInput = videoInput

        let output = AVCapturePhotoOutput()
        // Kích hoạt chụp ảnh độ phân giải tối đa của cảm biến phần cứng
        output.isHighResolutionCaptureEnabled = true
        if #available(iOS 13.0, *) {
            output.maxPhotoQualityPrioritization = .quality
        }

        if session.canAddOutput(output) {
            session.addOutput(output)
            self.photoOutput = output
        }

        let preview = AVCaptureVideoPreviewLayer(session: session)
        preview.videoGravity = .resizeAspectFill
        if let connection = preview.connection, connection.isVideoOrientationSupported {
            connection.videoOrientation = .portrait
        }
        layer.addSublayer(preview)
        preview.frame = bounds
        self.previewLayer = preview

        session.commitConfiguration()
        self.captureSession = session

        // Thêm tính năng Tap-to-Focus trực tiếp trên khung preview
        setupTapToFocus()

        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            self?.captureSession?.startRunning()
        }
    }

    private func setupTapToFocus() {
        let tapGesture = UITapGestureRecognizer(target: self, action: #selector(handleTapToFocus(_:)))
        self.addGestureRecognizer(tapGesture)
        self.isUserInteractionEnabled = true
    }

    @objc private func handleTapToFocus(_ gesture: UITapGestureRecognizer) {
        guard let preview = previewLayer, let device = videoDeviceInput?.device else { return }
        let touchPoint = gesture.location(in: self)
        let convertedPoint = preview.captureDevicePointConverted(fromLayerPoint: touchPoint)

        do {
            try device.lockForConfiguration()
            if device.isFocusPointOfInterestSupported && device.isFocusModeSupported(.autoFocus) {
                device.focusPointOfInterest = convertedPoint
                device.focusMode = .autoFocus
            }
            if device.isExposurePointOfInterestSupported && device.isExposureModeSupported(.autoExpose) {
                device.exposurePointOfInterest = convertedPoint
                device.exposureMode = .autoExpose
            }
            device.isSubjectAreaChangeMonitoringEnabled = true
            device.unlockForConfiguration()
        } catch {
            print("[DocumentCameraView] Tap-to-focus error: \(error)")
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

    func capture(enableFlash: Bool, autoCrop: Bool, detectPerspective: Bool, documentType: String, completion: @escaping (Result<[String: Any], Error>) -> Void) {
        guard let photoOutput = self.photoOutput else {
            completion(.failure(NSError(domain: "DocumentCameraView", code: -1, userInfo: [NSLocalizedDescriptionKey: "Photo output unavailable"])))
            return
        }

        // Cố định hướng videoOrientation là portrait cho camera sau khi chụp
        if let connection = photoOutput.connection(with: .video), connection.isVideoOrientationSupported {
            connection.videoOrientation = .portrait
        }

        self.currentCompletion = completion
        self.currentAutoCrop = autoCrop
        self.currentDetectPerspective = detectPerspective
        self.currentDocumentType = documentType

        let settings: AVCapturePhotoSettings
        if photoOutput.availablePhotoCodecTypes.contains(.jpeg) {
            settings = AVCapturePhotoSettings(format: [AVVideoCodecKey: AVVideoCodecType.jpeg])
        } else {
            settings = AVCapturePhotoSettings()
        }

        // Bật High Resolution và ưu tiên chất lượng ảnh cao nhất (Deep Fusion / Smart HDR)
        settings.isHighResolutionPhotoEnabled = true
        if #available(iOS 13.0, *) {
            settings.photoQualityPrioritization = .quality
        }

        if videoDeviceInput?.device.hasFlash == true {
            settings.flashMode = enableFlash ? .on : .off
        }

        // Đảm bảo autofocus và exposure ổn định trước khi kích hoạt capture
        executeCaptureWithStabilityCheck(photoOutput: photoOutput, settings: settings)
    }

    /// Kiểm tra trạng thái lens focus/exposure trước khi chụp để tránh ảnh bị soft/out-of-focus
    private func executeCaptureWithStabilityCheck(photoOutput: AVCapturePhotoOutput, settings: AVCapturePhotoSettings) {
        guard let device = videoDeviceInput?.device else {
            photoOutput.capturePhoto(with: settings, delegate: self)
            return
        }

        // Nếu camera đang ổn định (không hunting focus), chụp ngay lập tức
        if !device.isAdjustingFocus && !device.isAdjustingExposure {
            photoOutput.capturePhoto(with: settings, delegate: self)
            return
        }

        // Nếu camera đang điều chỉnh focus, chờ tối đa 500ms để focus hoàn tất
        let startTime = CACurrentMediaTime()
        let maxWaitDuration: Double = 0.5

        let timer = DispatchSource.makeTimerSource(queue: DispatchQueue.main)
        timer.schedule(deadline: .now() + 0.05, repeating: 0.05)
        timer.setEventHandler { [weak self, weak device, weak photoOutput] in
            guard let self = self, let dev = device, let output = photoOutput else {
                timer.cancel()
                return
            }

            let elapsed = CACurrentMediaTime() - startTime
            let isStable = !dev.isAdjustingFocus
            let isTimeout = elapsed >= maxWaitDuration

            if isStable || isTimeout {
                timer.cancel()
                output.capturePhoto(with: settings, delegate: self)
            }
        }
        timer.resume()
    }

    func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: Error?) {
        if let error = error {
            currentCompletion?(.failure(error))
            currentCompletion = nil
            return
        }

        // Thực hiện toàn bộ luồng xử lý ảnh trong autoreleasepool để giải phóng bộ nhớ RAM ngay lập tức
        autoreleasepool {
            guard let imageData = photo.fileDataRepresentation(),
                  let rawImage = UIImage(data: imageData) else {
                currentCompletion?(.failure(NSError(domain: "DocumentCameraView", code: -2, userInfo: [NSLocalizedDescriptionKey: "Failed to process image data"])))
                currentCompletion = nil
                return
            }

            // Chuẩn hóa pixel buffer về hướng .up thực sự để không bị xoay ngang / lộn ngược khi xử lý và lưu JPEG
            var image = rawImage.normalizedOrientation()

            var isCropped = false

            // Xử lý Perspective Correction hoặc Auto-Crop
            if currentDetectPerspective {
                let imgW = image.size.width
                let imgH = image.size.height
                // Phát hiện / Giả lập góc tứ giác trong vùng khung hình
                let defaultCorners = [
                    CGPoint(x: imgW * 0.1, y: imgH * 0.2),
                    CGPoint(x: imgW * 0.9, y: imgH * 0.18),
                    CGPoint(x: imgW * 0.88, y: imgH * 0.82),
                    CGPoint(x: imgW * 0.12, y: imgH * 0.8)
                ]
                if let perspectiveImage = VisionEdgeDetector.perspectiveCorrect(image: image, corners: defaultCorners) {
                    image = perspectiveImage
                    isCropped = true
                }
            } else if currentAutoCrop {
                let aspectRatio: CGFloat = currentDocumentType == "passport" ? 1.42 : 1.585
                if let cropped = cropImageToFrame(image: image, targetAspectRatio: aspectRatio) {
                    image = cropped
                    isCropped = true
                }
            }

            let fileName = "scan_\(UUID().uuidString).jpg"
            let fileURL = FileManager.default.temporaryDirectory.appendingPathComponent(fileName)

            if let finalData = image.jpegData(compressionQuality: 0.95) {
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
                currentCompletion?(.failure(NSError(domain: "DocumentCameraView", code: -3, userInfo: [NSLocalizedDescriptionKey: "Failed to compress final image"])))
            }

            currentCompletion = nil
        }
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
        return UIImage(cgImage: croppedCgImage, scale: image.scale, orientation: .up)
    }

    /// Clean temporary scanned image files
    static func clearCacheFiles() -> Bool {
        let tmpDirectory = FileManager.default.temporaryDirectory
        do {
            let fileURLs = try FileManager.default.contentsOfDirectory(at: tmpDirectory, includingPropertiesForKeys: nil)
            for fileURL in fileURLs where fileURL.lastPathComponent.hasPrefix("scan_") || fileURL.lastPathComponent.hasPrefix("raw_") {
                try FileManager.default.removeItem(at: fileURL)
            }
            return true
        } catch {
            print("[DocumentCameraView] Clean cache error: \(error)")
            return false
        }
    }

    deinit {
        captureSession?.stopRunning()
        captureSession = nil
        previewLayer?.removeFromSuperlayer()
        previewLayer = nil
        if DocumentCameraView.sharedCurrentView === self {
            DocumentCameraView.sharedCurrentView = nil
        }
    }
}