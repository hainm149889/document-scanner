# rn-document-scanner 📄📷

Thư viện quét tài liệu, CCCD (Vietnamese Citizen ID), và Passport hiệu năng cao dành cho **React Native**, được xây dựng trên nền tảng **Nitro Modules (JSI)**, sử dụng **AVFoundation (iOS)** và **CameraX (Android)** với kiến trúc New Architecture.

---

## ✨ Tính năng nổi bật

- 🚀 **Nitro Modules (JSI)**: Tốc độ gọi trực tiếp mã Native C++/Swift/Kotlin với độ trễ cực thấp (< 1ms).
- 📐 **Auto-Crop Khung Hình**: Tự động tính toán tọa độ và cắt ảnh chuẩn theo tỷ lệ CCCD (1.585) hoặc Passport (1.42).
- 🔄 **Perspective Correction (Nắn Thẳng Tứ Giác)**: Tự động điều chỉnh góc chụp chéo/nghiêng của giấy tờ, trả về ảnh chữ nhật phẳng vuông vắn.
- 👤 **Phát hiện Khuôn Mặt (Face Detection)**: Kiểm tra ảnh chân dung trên mặt trước CCCD hoặc trang thông tin Hộ chiếu bằng Apple Vision (iOS) và FaceDetector (Android) không cần thư viện bên thứ ba.
- 🔍 **Phát hiện Trùng lặp (Duplicate Detection via 64-bit dHash)**: Thuật toán Difference Hash 64-bit so sánh khoảng cách Hamming giữa mặt trước và mặt sau để cảnh báo chụp trùng.
- 📱 **Luồng eKYC Đa Bước (`useDocumentScannerFlow`)**: Quản lý sẵn State Machine (Mặt trước $\rightarrow$ Mặt sau $\rightarrow$ Xem lại/Phân tích) kèm ảnh thu nhỏ và nút Phân tích.
- 🔦 **Điều khiển Flash Native**: Bật/tắt đèn pin (Flash/Torch) tức thì trong khi quét.
- 🧹 **Tối ưu Bộ nhớ & Clean Cache**: Quản lý giải phóng Bitmap (`.recycle()`) và `@autoreleasepool`, hỗ trợ hàm `cleanCache()` dọn dẹp các file ảnh tạm.

---

## 📦 Cài đặt

```bash
# Sử dụng Yarn
yarn add rn-document-scanner react-native-nitro-modules

# Hoặc sử dụng NPM
npm install rn-document-scanner react-native-nitro-modules
```

---

## ⚙️ Cấu hình Native

### iOS Setup

Thêm quyền truy cập Camera vào file `ios/YourProject/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>Ứng dụng cần quyền truy cập Camera để quét giấy tờ CCCD/Passport.</string>
```

Cài đặt CocoaPods:

```bash
cd ios && pod install && cd ..
```

### Android Setup

Khai báo quyền Camera trong file `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
```

---

## 🚀 Hướng dẫn sử dụng

### 1. Sử dụng Cơ bản (Single Capture)

```tsx
import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image } from 'react-native';
import {
  DocumentCameraView,
  ScannerOverlayFrame,
  DocumentScannerNative,
  NativeCapturedDocument,
} from 'rn-document-scanner';

export default function BasicScanner() {
  const [captured, setCaptured] = useState<NativeCapturedDocument | null>(null);

  const handleCapture = async () => {
    try {
      const result = await DocumentScannerNative.capturePhoto({
        enableFlash: false,
        autoCrop: true,
        detectPerspective: true,
        documentType: 'cccd',
      });
      setCaptured(result);
    } catch (error) {
      console.error('Lỗi chụp ảnh:', error);
    }
  };

  return (
    <View style={styles.container}>
      {captured ? (
        <View style={styles.preview}>
          <Image source={{ uri: captured.imageUri }} style={styles.image} resizeMode="contain" />
          <TouchableOpacity style={styles.btn} onPress={() => setCaptured(null)}>
            <Text style={styles.btnText}>Chụp lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={StyleSheet.absoluteFill}>
          <DocumentCameraView style={StyleSheet.absoluteFill} enableFlash={false} />
          <ScannerOverlayFrame documentType="cccd" />
          <TouchableOpacity style={styles.captureBtn} onPress={handleCapture}>
            <Text style={styles.btnText}>Chụp Giấy Tờ</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  preview: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  image: { width: '100%', height: '80%' },
  captureBtn: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
  },
  btn: { backgroundColor: '#333', padding: 14, borderRadius: 12, marginTop: 12 },
  btnText: { color: '#FFF', fontWeight: 'bold' },
});
```

---

### 2. Sử dụng Luồng eKYC Đa Bước (`useDocumentScannerFlow`)

```tsx
import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, Alert } from 'react-native';
import {
  DocumentCameraView,
  ScannerOverlayFrame,
  useDocumentScannerFlow,
} from 'rn-document-scanner';

export default function EkycScanner() {
  const {
    step,
    stepTitle,
    stepDescription,
    frontDocument,
    backDocument,
    similarity,
    errorMessage,
    captureCurrentStep,
    resetFlow,
    getFinalDocuments,
  } = useDocumentScannerFlow({
    documentType: 'cccd',
    autoCrop: true,
    detectPerspective: true,
    validateFaceOnFront: true,
    duplicateThreshold: 0.85,
  });

  const handleCapture = async () => {
    await captureCurrentStep();
  };

  const handleAnalyze = () => {
    const data = getFinalDocuments();
    if (data) {
      Alert.alert('eKYC Ready', `Mặt trước: ${data.front.imageUri}\nMặt sau: ${data.back?.imageUri}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{stepTitle}</Text>
      <Text style={styles.subHeader}>{stepDescription}</Text>

      {step === 'review' ? (
        <View style={styles.reviewBox}>
          {frontDocument && <Image source={{ uri: frontDocument.imageUri }} style={styles.thumb} />}
          {backDocument && <Image source={{ uri: backDocument.imageUri }} style={styles.thumb} />}
          <TouchableOpacity style={styles.analyzeBtn} onPress={handleAnalyze}>
            <Text style={styles.btnText}>Phân tích thông tin</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.cameraBox}>
          <DocumentCameraView style={StyleSheet.absoluteFill} />
          <ScannerOverlayFrame documentType="cccd" />
          <TouchableOpacity style={styles.captureBtn} onPress={handleCapture}>
            <Text style={styles.btnText}>Chụp ảnh</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', paddingTop: 50 },
  header: { color: '#FFF', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  subHeader: { color: '#888', fontSize: 12, textAlign: 'center', marginBottom: 12 },
  cameraBox: { flex: 1 },
  reviewBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  thumb: { width: 300, height: 180, borderRadius: 10 },
  captureBtn: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 24,
  },
  analyzeBtn: { backgroundColor: '#34C759', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 24 },
  btnText: { color: '#FFF', fontWeight: 'bold' },
});
```

---

## 📖 API Reference

### 1. `DocumentScannerNative` (Hybrid Object)

| Phương thức | Tham số | Kiểu trả về | Mô tả |
| :--- | :--- | :--- | :--- |
| `getNativeVersion()` | Không | `string` | Lấy tên và phiên bản Engine Native đang chạy. |
| `ping(message)` | `string` | `string` | Kiểm tra kết nối Nitro Module giữa JS và Native. |
| `getCameraPermissionStatus()` | Không | `string` | Kiểm tra quyền Camera (`granted`, `denied`, `not-determined`, `restricted`). |
| `requestCameraPermission()` | Không | `Promise<boolean>` | Yêu cầu người dùng cấp quyền truy cập Camera. |
| `capturePhoto(options)` | `NativeCaptureOptions` | `Promise<NativeCapturedDocument>` | Chụp ảnh & xử lý cắt khung, nắn góc. |
| `validateDocumentImage(imageUri)` | `string` | `Promise<ImageValidationResult>` | Phát hiện khuôn mặt (`hasFace`) và sinh mã perceptual hash 64-bit (`imageHash`). |
| `compareImages(uri1, uri2)` | `string, string` | `Promise<number>` | So sánh độ tương đồng giữa 2 ảnh từ 0.0 (khác nhau) đến 1.0 (trùng lặp). |
| `cleanCache()` | Không | `Promise<boolean>` | Xóa sạch các file ảnh tạm (`scan_*.jpg`, `raw_*.jpg`) trong cache. |

---

### 2. `NativeCaptureOptions`

| Thuộc tính | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `enableFlash` | `boolean` | `false` | Bật/tắt đèn flash/torch khi chụp. |
| `quality` | `number` | `0.85` | Chất lượng nén ảnh JPEG (từ 0.0 đến 1.0). |
| `autoCrop` | `boolean` | `true` | Tự động cắt ảnh theo khung viền giấy tờ. |
| `detectPerspective` | `boolean` | `false` | Tự động phát hiện 4 góc và nắn thẳng hình ảnh. |
| `documentType` | `'cccd' \| 'passport'` | `'cccd'` | Loại tài liệu để tính tỷ lệ khung cắt phù hợp. |

---

### 3. `NativeCapturedDocument`

| Thuộc tính | Kiểu dữ liệu | Mô tả |
| :--- | :--- | :--- |
| `imageUri` | `string` | Đường dẫn URI file ảnh trên thiết bị (`file://...`). |
| `width` | `number` | Chiều rộng ảnh tính bằng pixel. |
| `height` | `number` | Chiều cao ảnh tính bằng pixel. |
| `orientation` | `number` | Góc xoay của ảnh (0, 90, 180, 270). |
| `isCropped` | `boolean` | Đánh dấu ảnh đã được cắt khung hoặc nắn góc hay chưa. |
| `corners` | `DocumentCorners?` | Tọa độ 4 góc tứ giác giấy tờ (nếu có). |

---

### 4. `ImageValidationResult`

| Thuộc tính | Kiểu dữ liệu | Mô tả |
| :--- | :--- | :--- |
| `hasFace` | `boolean` | `true` nếu phát hiện khuôn mặt người (ảnh chân dung). |
| `imageHash` | `string` | Chuỗi 16 ký tự Hex đại diện cho mã băm dHash 64-bit. |

---

### 5. `DocumentCameraView` Props

| Prop | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `enableFlash` | `boolean` | `false` | Bật hoặc tắt đèn flash của Camera. |
| `style` | `StyleProp<ViewStyle>` | - | Style bố cục của khung Camera. |

---

### 6. `ScannerOverlayFrame` Props

| Prop | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `documentType` | `'cccd' \| 'passport'` | `'cccd'` | Tỷ lệ khung (CCCD ~ 1.585, Passport ~ 1.42). |
| `borderColor` | `string` | `'#00FF00'` | Màu sắc đường viền khung căn chỉnh. |
| `borderWidth` | `number` | `2` | Độ dày đường viền khung (px). |
| `borderRadius` | `number` | `12` | Bo tròn 4 góc khung (px). |
| `showCloseButton` | `boolean` | `false` | Hiển thị nút đóng khung quét. |
| `onClose` | `() => void` | - | Callback khi người dùng nhấn nút đóng. |

---

## 📄 License

MIT License © 2026