import type { HybridObject } from "react-native-nitro-modules";

export interface DocumentScanner extends HybridObject<{
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
}
