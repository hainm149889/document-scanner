/**
 * Loại giấy tờ hỗ trợ
 */
export type DocumentType = "cccd" | "passport";

/**
 * Cấu hình chế độ quét ảnh
 */
export type ScannerOptions = {
  /** Loại giấy tờ cần quét */
  documentType: DocumentType;
  /** Bật/Tắt đèn Flash (mặc định: false) */
  enableFlash?: boolean;
  /** Tự động crop ảnh theo tỷ lệ khung scan (mặc định: false) */
  cropToFrame?: boolean;
  /** Chất lượng ảnh đầu ra từ 0.0 đến 1.0 (mặc định: 0.9) */
  quality?: number;
};

/**
 * Cấu hình tùy chỉnh Khung cắt chữ nhật (Overlay Frame)
 */
export type FrameOptions = {
  /** Tỷ lệ khung (Chiều rộng / Chiều cao). Mặc định CCCD ~ 1.58 (85.6mm / 53.98mm) */
  aspectRatio?: number;
  /** Chiều rộng khung tính theo % màn hình hoặc px (mặc định: '85%') */
  width?: number | string;
  /** Màu đường viền khung (mặc định: '#00FF00') */
  borderColor?: string;
  /** Độ dày đường viền khung px (mặc định: 2) */
  borderWidth?: number;
  /** Bo góc khung px (mặc định: 12) */
  borderRadius?: number;
};

/**
 * Kết quả thu được sau khi chụp giấy tờ thành công
 */
export type CapturedDocument = {
  /** Đường dẫn file ảnh tạm thời trên thiết bị (file://...) */
  imageUri: string;
  /** Chiều rộng ảnh tính bằng pixel */
  width: number;
  /** Chiều cao ảnh tính bằng pixel */
  height: number;
  /** Độ xoay của ảnh (0, 90, 180, 270) */
  orientation?: number;
  /** Loại giấy tờ đã chụp */
  documentType?: DocumentType;
};
