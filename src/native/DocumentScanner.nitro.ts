import type { HybridObject } from "react-native-nitro-modules";

export interface NativeCapturedDocument {
  imageUri: string;
  width: number;
  height: number;
  orientation: number;
  isCropped: boolean;
}

export interface NativeCaptureOptions {
  enableFlash?: boolean;
  quality?: number;
  /** Bật tự động cắt ảnh theo khung giấy tờ */
  autoCrop?: boolean;
  /** Loại giấy tờ để tính Aspect Ratio cắt ('cccd' | 'passport') */
  documentType?: string;
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
   * Chụp ảnh giấy tờ từ Camera Native (có hỗ trợ Auto-Crop)
   */
  capturePhoto(options: NativeCaptureOptions): Promise<NativeCapturedDocument>;
}
