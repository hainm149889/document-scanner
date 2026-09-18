import type { HybridObject } from "react-native-nitro-modules";

export interface Point {
  x: number;
  y: number;
}

export interface DocumentCorners {
  topLeft: Point;
  topRight: Point;
  bottomLeft: Point;
  bottomRight: Point;
}

export interface NativeCapturedDocument {
  imageUri: string;
  width: number;
  height: number;
  orientation: number;
  isCropped: boolean;
  corners?: DocumentCorners;
}

export interface NativeCaptureOptions {
  enableFlash?: boolean;
  quality?: number;
  /** Bật tự động cắt ảnh theo khung giấy tờ */
  autoCrop?: boolean;
  /** Bật phát hiện và nắn thẳng góc giấy tờ (Perspective Correction) */
  detectPerspective?: boolean;
  /** Loại giấy tờ để tính Aspect Ratio cắt ('cccd' | 'passport') */
  documentType?: string;
}

export interface ImageValidationResult {
  /** Có phát hiện khuôn mặt người (chân dung) hay không */
  hasFace: boolean;
  /** Mã băm nhận dạng ảnh (perceptual hash 64-bit hex) */
  imageHash: string;
}

export interface DocumentScanner
  extends HybridObject<{
    ios: "swift";
    android: "kotlin";
  }> {
  /**
   * Lấy phiên bản của Native Module để test kết nối JS <-> Native
   */
  getNativeVersion(): string;

  /**
   * Phương thức test gửi tin nhắn từ JS sang Native và nhận phản hồi
   */
  ping(message: string): string;

  /**
   * Lấy trạng thái quyền truy cập Camera hiện tại
   * @returns "granted" | "denied" | "not-determined" | "restricted"
   */
  getCameraPermissionStatus(): string;

  /**
   * Yêu cầu cấp quyền truy cập Camera từ người dùng
   * @returns true nếu được cấp quyền, false nếu bị từ chối
   */
  requestCameraPermission(): Promise<boolean>;

  /**
   * Chụp ảnh giấy tờ từ Camera Native (Hỗ trợ Auto-Crop & Perspective Correction)
   */
  capturePhoto(options: NativeCaptureOptions): Promise<NativeCapturedDocument>;

  /**
   * Kiểm tra đặc trưng ảnh (phát hiện khuôn mặt chân dung & sinh mã hash dHash)
   */
  validateDocumentImage(imageUri: string): Promise<ImageValidationResult>;

  /**
   * So sánh độ tương đồng giữa 2 ảnh dựa vào khoảng cách Hamming của dHash
   * @returns Tỷ lệ tương đồng từ 0.0 (hoàn toàn khác) đến 1.0 (trùng lặp hoàn toàn)
   */
  compareImages(imageUri1: string, imageUri2: string): Promise<number>;

  /**
   * Xoá toàn bộ các file ảnh tạm (.jpg) đã tạo trong quá trình chụp để giải phóng dung lượng đĩa.
   */
  cleanCache(): Promise<boolean>;
}
