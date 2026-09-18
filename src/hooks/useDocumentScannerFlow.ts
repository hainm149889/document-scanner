import { useState, useCallback } from "react";
import { DocumentScannerNative } from "../index";
import type { NativeCaptureOptions, ImageValidationResult } from "../native/DocumentScanner.nitro";
import type { CapturedDocument, DocumentType } from "../types/scanner";

export type ScanStep = "front" | "back" | "review";

export interface UseDocumentScannerFlowOptions {
  /**
   * Loại giấy tờ: 'cccd' (2 mặt: trước -> sau -> review) hoặc 'passport' (1 mặt -> review)
   * Mặc định: 'cccd'
   */
  documentType?: DocumentType;
  /**
   * Tự động kiểm tra mặt trước có chứa khuôn mặt không (mặc định: true)
   */
  validateFaceOnFront?: boolean;
  /**
   * Ngưỡng độ tương đồng (0.0 -> 1.0) để cảnh báo trùng lặp mặt trước và mặt sau.
   * Mặc định: 0.85 (85%)
   */
  duplicateThreshold?: number;
  /**
   * Tự động crop theo khung scan
   */
  autoCrop?: boolean;
  /**
   * Tự động nhận diện 4 góc và nắn thẳng
   */
  detectPerspective?: boolean;
}

export interface UseDocumentScannerFlowReturn {
  /** Bước hiện tại của luồng scan */
  step: ScanStep;
  /** Tiêu đề hướng dẫn bước hiện tại */
  stepTitle: string;
  /** Mô tả phụ hướng dẫn người dùng */
  stepDescription: string;
  /** Thông tin ảnh mặt trước */
  frontDocument: CapturedDocument | null;
  /** Thông tin ảnh mặt sau (đối với CCCD) */
  backDocument: CapturedDocument | null;
  /** Kết quả kiểm tra ảnh mặt trước (khuôn mặt, hash) */
  frontValidation: ImageValidationResult | null;
  /** Kết quả kiểm tra ảnh mặt sau */
  backValidation: ImageValidationResult | null;
  /** Độ tương đồng giữa mặt trước và mặt sau (0.0 -> 1.0) */
  similarity: number | null;
  /** Trạng thái đang chụp hoặc đang phân tích kiểm tra */
  isProcessing: boolean;
  /** Lỗi phát sinh trong quá trình chụp / kiểm tra (nếu có) */
  errorMessage: string | null;
  /** Xóa thông báo lỗi */
  clearError: () => void;
  /** Thực hiện chụp bước hiện tại */
  captureCurrentStep: (options?: Partial<NativeCaptureOptions>) => Promise<CapturedDocument | null>;
  /** Chụp lại mặt trước */
  retakeFront: () => void;
  /** Chụp lại mặt sau */
  retakeBack: () => void;
  /** Reset toàn bộ luồng về trạng thái ban đầu */
  resetFlow: () => void;
  /** Chuyển trực tiếp sang một bước */
  goToStep: (step: ScanStep) => void;
  /** Lấy toàn bộ dữ liệu 2 mặt để chuẩn bị gửi API OCR / Phân tích */
  getFinalDocuments: () => {
    documentType: DocumentType;
    front: CapturedDocument;
    back: CapturedDocument | null;
  } | null;
}

export function useDocumentScannerFlow(
  options: UseDocumentScannerFlowOptions = {}
): UseDocumentScannerFlowReturn {
  const {
    documentType = "cccd",
    validateFaceOnFront = true,
    duplicateThreshold = 0.85,
    autoCrop = true,
    detectPerspective = false,
  } = options;

  const [step, setStep] = useState<ScanStep>("front");
  const [frontDocument, setFrontDocument] = useState<CapturedDocument | null>(null);
  const [backDocument, setBackDocument] = useState<CapturedDocument | null>(null);
  const [frontValidation, setFrontValidation] = useState<ImageValidationResult | null>(null);
  const [backValidation, setBackValidation] = useState<ImageValidationResult | null>(null);
  const [similarity, setSimilarity] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  const getStepTitles = useCallback((): { title: string; desc: string } => {
    if (documentType === "passport") {
      if (step === "front") {
        return {
          title: "Chụp Hộ chiếu",
          desc: "Căn chỉnh trang thông tin hộ chiếu vừa vặn với khung hình chữ nhật.",
        };
      }
      return {
        title: "Xác nhận Hộ chiếu",
        desc: "Kiểm tra độ rõ nét của trang hộ chiếu trước khi phân tích.",
      };
    }

    // CCCD
    if (step === "front") {
      return {
        title: "Mặt trước CCCD (1/2)",
        desc: "Đặt mặt trước CCCD (có ảnh chân dung) vào giữa khung hình chữ nhật.",
      };
    }
    if (step === "back") {
      return {
        title: "Mặt sau CCCD (2/2)",
        desc: "Lật sang mặt sau CCCD (có mã MRZ / chip) và căn chỉnh trong khung.",
      };
    }
    return {
      title: "Xem lại CCCD",
      desc: "Kiểm tra hình ảnh 2 mặt CCCD và nhấn Phân tích thông tin.",
    };
  }, [documentType, step]);

  const { title: stepTitle, desc: stepDescription } = getStepTitles();

  const captureCurrentStep = useCallback(
    async (captureOptions?: Partial<NativeCaptureOptions>): Promise<CapturedDocument | null> => {
      setIsProcessing(true);
      setErrorMessage(null);

      try {
        const mergedOptions: NativeCaptureOptions = {
          autoCrop,
          detectPerspective,
          documentType,
          ...captureOptions,
        };

        const result = await DocumentScannerNative.capturePhoto(mergedOptions);
        const capturedDoc: CapturedDocument = {
          imageUri: result.imageUri,
          width: result.width,
          height: result.height,
          orientation: result.orientation,
          documentType,
        };

        // Chụp mặt trước
        if (step === "front") {
          // Native validation (Face Detection & dHash)
          const validation = await DocumentScannerNative.validateDocumentImage(capturedDoc.imageUri);
          setFrontValidation(validation);

          if (validateFaceOnFront && documentType === "cccd" && !validation.hasFace) {
            setErrorMessage(
              "Cảnh báo: Không tìm thấy ảnh chân dung trên mặt này. Vui lòng kiểm tra lại xem đã đúng mặt trước CCCD chưa!"
            );
          }

          setFrontDocument(capturedDoc);

          // Nếu là passport -> 1 bước, chuyển thẳng sang review
          if (documentType === "passport") {
            setStep("review");
          } else {
            // CCCD -> chuyển sang chụp mặt sau
            setStep("back");
          }
          return capturedDoc;
        }

        // Chụp mặt sau (chỉ áp dụng với CCCD)
        if (step === "back") {
          const validation = await DocumentScannerNative.validateDocumentImage(capturedDoc.imageUri);
          setBackValidation(validation);

          // So sánh tương đồng với mặt trước để phát hiện chụp trùng
          if (frontDocument?.imageUri) {
            const sim = await DocumentScannerNative.compareImages(
              frontDocument.imageUri,
              capturedDoc.imageUri
            );
            setSimilarity(sim);

            if (sim >= duplicateThreshold) {
              setErrorMessage(
                `Cảnh báo trùng lặp (${Math.round(
                  sim * 100
                )}% tương đồng): Hai ảnh quá giống nhau. Bạn có thể vừa chụp lại mặt trước!`
              );
            }
          }

          setBackDocument(capturedDoc);
          setStep("review");
          return capturedDoc;
        }

        return capturedDoc;
      } catch (err: any) {
        const msg = err?.message || "Đã xảy ra lỗi trong quá trình chụp ảnh.";
        setErrorMessage(msg);
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    [
      autoCrop,
      detectPerspective,
      documentType,
      duplicateThreshold,
      frontDocument?.imageUri,
      step,
      validateFaceOnFront,
    ]
  );

  const retakeFront = useCallback(() => {
    setFrontDocument(null);
    setFrontValidation(null);
    setSimilarity(null);
    setErrorMessage(null);
    setStep("front");
  }, []);

  const retakeBack = useCallback(() => {
    setBackDocument(null);
    setBackValidation(null);
    setSimilarity(null);
    setErrorMessage(null);
    setStep("back");
  }, []);

  const resetFlow = useCallback(() => {
    setFrontDocument(null);
    setBackDocument(null);
    setFrontValidation(null);
    setBackValidation(null);
    setSimilarity(null);
    setErrorMessage(null);
    setStep("front");
  }, []);

  const goToStep = useCallback((targetStep: ScanStep) => {
    setErrorMessage(null);
    setStep(targetStep);
  }, []);

  const getFinalDocuments = useCallback(() => {
    if (!frontDocument) return null;
    if (documentType === "cccd" && !backDocument) return null;

    return {
      documentType,
      front: frontDocument,
      back: backDocument,
    };
  }, [backDocument, documentType, frontDocument]);

  return {
    step,
    stepTitle,
    stepDescription,
    frontDocument,
    backDocument,
    frontValidation,
    backValidation,
    similarity,
    isProcessing,
    errorMessage,
    clearError,
    captureCurrentStep,
    retakeFront,
    retakeBack,
    resetFlow,
    goToStep,
    getFinalDocuments,
  };
}
