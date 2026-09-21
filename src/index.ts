/**
 * rn-document-scanner
 * Public Entry Point
 */

import { NitroModules } from "react-native-nitro-modules";
import type { DocumentScanner } from "./native/DocumentScanner.nitro";

export const RNDocumentScannerVersion = "1.0.0";

// Khởi tạo Nitro Module Hybrid Object an toàn với lazy evaluation
let _instance: DocumentScanner | null = null;

function getDocumentScannerNative(): DocumentScanner {
  if (!_instance) {
    _instance =
      NitroModules.createHybridObject<DocumentScanner>("DocumentScanner");
  }
  return _instance;
}

export const DocumentScannerNative: DocumentScanner = new Proxy(
  {} as DocumentScanner,
  {
    get(_target, prop) {
      const instance = getDocumentScannerNative();
      const val = (instance as any)[prop];
      if (typeof val === "function") {
        return val.bind(instance);
      }
      return val;
    },
  },
);

export type { DocumentScanner };
export type {
  NativeCapturedDocument,
  NativeCaptureOptions,
  Point,
  DocumentCorners,
  ImageValidationResult,
  ExtractedDocumentData,
} from "./native/DocumentScanner.nitro";
// Public Types Export
export * from "./types";
// Camera UI Component Export
export * from "./components/DocumentCameraView";
export * from "./components/ScannerOverlayFrame";
// Hooks Export
export * from "./hooks/useDocumentScannerFlow";
