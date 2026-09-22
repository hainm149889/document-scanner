import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ColorValue,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
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
  /** Callback khi người dùng bấm nút Close */
  onClose?: () => void;
  /** Hiển thị nút Close (mặc định: true nếu truyền onClose) */
  showCloseButton?: boolean;
  /** Custom style cho nút Close */
  closeButtonStyle?: StyleProp<ViewStyle>;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const ScannerOverlayFrame = React.memo<ScannerOverlayFrameProps>(({
  documentType = "cccd",
  frameOptions,
  instructionText,
  maskColor = "rgba(0, 0, 0, 0.6)",
  onClose,
  showCloseButton,
  closeButtonStyle,
}) => {
  // Tính toán Aspect Ratio và kích thước khung với useMemo để tránh re-calc mỗi render
  const { frameWidth, frameHeight, defaultInstruction } = useMemo(() => {
    const defaultAspectRatio = documentType === "passport" ? 1.42 : 1.585;
    const aspectRatio = frameOptions?.aspectRatio ?? defaultAspectRatio;
    const width =
      typeof frameOptions?.width === "number"
        ? frameOptions.width
        : SCREEN_WIDTH * 0.85;
    const height = width / aspectRatio;
    const instruction =
      documentType === "passport"
        ? "Đặt trang thông tin Hộ Chiếu vào trong khung"
        : "Đặt mặt trước/mặt sau CCCD vào trong khung";
    return { frameWidth: width, frameHeight: height, defaultInstruction: instruction };
  }, [documentType, frameOptions?.aspectRatio, frameOptions?.width]);

  const borderColor = frameOptions?.borderColor ?? "#00FF66";
  const borderWidth = frameOptions?.borderWidth ?? 3;
  const borderRadius = frameOptions?.borderRadius ?? 12;
  const cornerSize = 24;

  const shouldShowClose = showCloseButton ?? !!onClose;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Vùng mờ bao quanh khung (Cutout Mask) */}
      <View style={styles.maskContainer} pointerEvents="none">
        <View style={[styles.topMask, { backgroundColor: maskColor }]}>
          <Text style={styles.instructionText}>
            {instructionText ?? defaultInstruction}
          </Text>
        </View>

        <View style={[styles.middleRow, { height: frameHeight }]}>
          <View style={[styles.sideMask, { backgroundColor: maskColor }]} />
          <View style={{ width: frameWidth, height: frameHeight }} />
          <View style={[styles.sideMask, { backgroundColor: maskColor }]} />
        </View>

        <View style={[styles.bottomMask, { backgroundColor: maskColor }]} />
      </View>

      {/* Khung quét chính căn giữa tuyệt đối */}
      <View
        style={[styles.frame, { width: frameWidth, height: frameHeight }]}
        pointerEvents="none"
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

      {/* Nút Close ở góc trên bên trái - nằm an toàn trên vùng mask */}
      {shouldShowClose && (
        <TouchableOpacity
          style={[styles.closeButton, closeButtonStyle]}
          onPress={onClose}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Đóng camera"
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  maskContainer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "column",
  },
  topMask: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  middleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  sideMask: {
    flex: 1,
    height: "100%",
  },
  bottomMask: {
    flex: 1,
  },
  frame: {
    position: "absolute",
    backgroundColor: "transparent",
  },
  instructionText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
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
    top: 14,
    left: 14,
    zIndex: 99,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
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
