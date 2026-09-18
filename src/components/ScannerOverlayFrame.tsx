import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ColorValue,
  TouchableOpacity,
} from "react-native";
import type { DocumentType, FrameOptions } from "../types";

export interface ScannerOverlayFrameProps {
  /** Loại giấy tờ để tự động tính Aspect Ratio (CCCD ~ 1.585, Passport ~ 1.42) */
  documentType?: DocumentType;
  /** Custom cấu hình khung */
  frameOptions?: FrameOptions;
  /** Dòng chữ hướng dẫn phía trên/dưới khung */
  instructionText?: string;
  /** Màu sắc vùng mờ bên ngoài khung (mặc định: rgba(0, 0, 0, 0.6)) */
  maskColor?: ColorValue;
  /** Callback khi người dùng bấm nút Close ở góc trên bên trái */
  onClose?: () => void;
  /** Hiển thị nút Close (mặc định: true nếu truyền onClose) */
  showCloseButton?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const ScannerOverlayFrame: React.FC<ScannerOverlayFrameProps> = ({
  documentType = "cccd",
  frameOptions,
  instructionText,
  maskColor = "rgba(0, 0, 0, 0.6)",
  onClose,
  showCloseButton,
}) => {
  // Tính toán Aspect Ratio mặc định dựa theo loại giấy tờ
  const defaultAspectRatio = documentType === "passport" ? 1.42 : 1.585;
  const aspectRatio = frameOptions?.aspectRatio ?? defaultAspectRatio;

  // Tính toán chiều rộng và chiều cao khung
  const frameWidth =
    typeof frameOptions?.width === "number"
      ? frameOptions.width
      : SCREEN_WIDTH * 0.85;
  const frameHeight = frameWidth / aspectRatio;

  const borderColor = frameOptions?.borderColor ?? "#00FF66";
  const borderWidth = frameOptions?.borderWidth ?? 3;
  const borderRadius = frameOptions?.borderRadius ?? 12;
  const cornerSize = 24;

  const shouldShowClose = showCloseButton ?? !!onClose;

  const defaultInstruction =
    documentType === "passport"
      ? "Đặt trang thông tin Hộ Chiếu vào trong khung"
      : "Đặt mặt trước/mặt sau CCCD vào trong khung";

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      {/* Nút Close ở góc trên bên trái */}
      {shouldShowClose && (
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Đóng camera"
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      )}

      {/* Vùng mờ phía trên */}
      <View
        style={[styles.mask, { backgroundColor: maskColor }]}
        pointerEvents="none"
      >
        <Text style={styles.instructionText}>
          {instructionText ?? defaultInstruction}
        </Text>
      </View>

      {/* Hàng giữa chứa Khung quét trong suốt */}
      <View style={styles.middleRow}>
        <View style={[styles.mask, { backgroundColor: maskColor }]} />

        {/* Khung quét chính */}
        <View
          style={[styles.frame, { width: frameWidth, height: frameHeight }]}
        >
          {/* Top-Left Corner */}
          <View
            style={[
              styles.corner,
              styles.topLeft,
              {
                borderColor,
                borderTopWidth: borderWidth,
                borderLeftWidth: borderWidth,
                borderTopLeftRadius: borderRadius,
                width: cornerSize,
                height: cornerSize,
              },
            ]}
          />
          {/* Top-Right Corner */}
          <View
            style={[
              styles.corner,
              styles.topRight,
              {
                borderColor,
                borderTopWidth: borderWidth,
                borderRightWidth: borderWidth,
                borderTopRightRadius: borderRadius,
                width: cornerSize,
                height: cornerSize,
              },
            ]}
          />
          {/* Bottom-Left Corner */}
          <View
            style={[
              styles.corner,
              styles.bottomLeft,
              {
                borderColor,
                borderBottomWidth: borderWidth,
                borderLeftWidth: borderWidth,
                borderBottomLeftRadius: borderRadius,
                width: cornerSize,
                height: cornerSize,
              },
            ]}
          />
          {/* Bottom-Right Corner */}
          <View
            style={[
              styles.corner,
              styles.bottomRight,
              {
                borderColor,
                borderBottomWidth: borderWidth,
                borderRightWidth: borderWidth,
                borderBottomRightRadius: borderRadius,
                width: cornerSize,
                height: cornerSize,
              },
            ]}
          />
        </View>

        <View style={[styles.mask, { backgroundColor: maskColor }]} />
      </View>

      {/* Vùng mờ phía dưới */}
      <View style={[styles.mask, { backgroundColor: maskColor }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  mask: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  middleRow: {
    flexDirection: "row",
  },
  frame: {
    position: "relative",
    backgroundColor: "transparent",
  },
  instructionText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  corner: {
    position: "absolute",
  },
  topLeft: {
    top: 0,
    left: 0,
  },
  topRight: {
    top: 0,
    right: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
  },
  closeButton: {
    position: "absolute",
    top: 16,
    left: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    lineHeight: 20,
  },
});
