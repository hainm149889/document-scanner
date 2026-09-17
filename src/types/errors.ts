/**
 * Danh sách mã lỗi chuẩn hóa của Document Scanner
 */
export type DocumentScannerErrorCode =
  | "PERMISSION_DENIED"
  | "CAMERA_UNAVAILABLE"
  | "CAMERA_INITIALIZATION_FAILED"
  | "CAPTURE_FAILED"
  | "IMAGE_PICKER_CANCELLED"
  | "OCR_FAILED"
  | "PARSER_FAILED"
  | "INVALID_IMAGE"
  | "UNSUPPORTED_DOCUMENT"
  | "UNKNOWN";

/**
 * Class xử lý Lỗi tùy chỉnh cho Document Scanner
 */
export class DocumentScannerError extends Error {
  code: DocumentScannerErrorCode;
  details?: string;

  constructor(
    code: DocumentScannerErrorCode,
    message: string,
    details?: string,
  ) {
    super(message);
    this.name = "DocumentScannerError";
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, DocumentScannerError.prototype);
  }
}
