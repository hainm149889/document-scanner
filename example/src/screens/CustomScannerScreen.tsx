import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  DocumentCameraView,
  ScannerOverlayFrame,
  DocumentScannerNative,
  NativeCapturedDocument,
  DocumentType,
} from 'rn-document-scanner';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCameraPermission } from '../hooks/useCameraPermission';

interface CustomScannerScreenProps {
  onBack: () => void;
}

export function CustomScannerScreen({ onBack }: CustomScannerScreenProps) {
  const insets = useSafeAreaInsets();
  const { hasPermission, isChecking, requestPermission } = useCameraPermission();
  const [docType, setDocType] = useState<DocumentType>('cccd');
  const [enableFlash, setEnableFlash] = useState<boolean>(false);
  const [autoCrop, setAutoCrop] = useState<boolean>(true);
  const [detectPerspective, setDetectPerspective] = useState<boolean>(true);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [capturedImage, setCapturedImage] = useState<NativeCapturedDocument | null>(null);

  const handleCapture = async () => {
    if (isCapturing) return;
    try {
      setIsCapturing(true);
      const result = await DocumentScannerNative.capturePhoto({
        enableFlash,
        autoCrop,
        detectPerspective,
        documentType: docType,
      });
      setCapturedImage(result);
    } catch (error: any) {
      Alert.alert('Lỗi chụp ảnh', error?.message || 'Không thể chụp ảnh');
    } finally {
      setIsCapturing(false);
    }
  };

  // Màn hình xin quyền nếu chưa có quyền
  if (!hasPermission && !isChecking) {
    return (
      <View
        style={[
          styles.container,
          styles.permissionScreen,
          { paddingTop: Math.max(insets.top, 24), paddingBottom: Math.max(insets.bottom, 24) },
        ]}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.backButtonText}>← Quay lại</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quyền Camera</Text>
          <View style={{ width: 60 }} />
        </View>

        <View style={styles.permissionContent}>
          <Text style={styles.permissionIcon}>⚙️</Text>
          <Text style={styles.permissionTitle}>Cần quyền truy cập Camera</Text>
          <Text style={styles.permissionDesc}>
            Để chụp và thử nghiệm các tính năng quét giấy tờ tùy biến, ứng dụng cần quyền sử dụng máy ảnh của thiết bị.
          </Text>
          <TouchableOpacity style={styles.grantBtn} onPress={requestPermission} activeOpacity={0.8}>
            <Text style={styles.grantBtnText}>Cấp quyền Camera</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 14), paddingBottom: 12 }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.backButtonText}>← Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tùy Biến / Chụp Đơn Lẻ</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Camera / Result View */}
      <View style={styles.mainContainer}>
        {capturedImage ? (
          <View style={StyleSheet.absoluteFill}>
            <Image source={{ uri: capturedImage.imageUri }} style={styles.previewImage} resizeMode="contain" />
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>
                {detectPerspective
                  ? 'Perspective Corrected'
                  : capturedImage.isCropped
                  ? 'Đã Auto-Crop'
                  : 'Ảnh Nguyên Bản'}{' '}
                ({Math.round(capturedImage.width)}x{Math.round(capturedImage.height)})
              </Text>
            </View>
          </View>
        ) : (
          <View style={StyleSheet.absoluteFill}>
            <DocumentCameraView style={StyleSheet.absoluteFill} enableFlash={enableFlash} />
            <ScannerOverlayFrame documentType={docType} showCloseButton={false} />
          </View>
        )}
      </View>

      {/* Settings Switches (when not viewing captured image) */}
      {!capturedImage && (
        <View style={styles.switchContainer}>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Nắn thẳng góc nghiêng (Perspective):</Text>
            <Switch
              value={detectPerspective}
              onValueChange={setDetectPerspective}
              trackColor={{ false: '#767577', true: '#AF52DE' }}
            />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Auto-Crop khung giấy tờ:</Text>
            <Switch
              value={autoCrop}
              onValueChange={setAutoCrop}
              trackColor={{ false: '#767577', true: '#34C759' }}
            />
          </View>
        </View>
      )}

      {/* Bottom Controls */}
      <View
        style={[
          styles.controls,
          {
            paddingBottom: Math.max(insets.bottom + 12, 24),
            paddingTop: 16,
          },
        ]}
      >
        {capturedImage ? (
          <TouchableOpacity style={styles.resetBtn} onPress={() => setCapturedImage(null)}>
            <Text style={styles.btnText}>Chụp Thử Bức Khác</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={styles.button}
              onPress={() => setDocType((prev) => (prev === 'cccd' ? 'passport' : 'cccd'))}
            >
              <Text style={styles.btnText}>{docType.toUpperCase()}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.captureBtn, isCapturing && styles.btnDisabled]}
              disabled={isCapturing}
              onPress={handleCapture}
            >
              {isCapturing ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.captureBtnText}>Chụp Ảnh</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, enableFlash && styles.flashBtnActive]}
              onPress={() => setEnableFlash((prev) => !prev)}
            >
              <Text style={styles.btnText}>Flash: {enableFlash ? 'ON' : 'OFF'}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0c',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1c1c1e',
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#2c2c2e',
    borderRadius: 12,
  },
  backButtonText: {
    color: '#AF52DE',
    fontSize: 13,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  mainContainer: {
    flex: 1,
    marginVertical: 10,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#111',
    position: 'relative',
  },
  previewImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  badgeContainer: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    color: '#64D2FF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  switchContainer: {
    paddingHorizontal: 20,
    marginVertical: 4,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  switchLabel: {
    color: '#ffffff',
    fontSize: 12,
  },
  controls: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#2c2c2e',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  captureBtn: {
    backgroundColor: '#AF52DE',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
  },
  captureBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  resetBtn: {
    flex: 1,
    backgroundColor: '#2c2c2e',
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
  },
  flashBtnActive: {
    backgroundColor: '#ffcc00',
  },
  btnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 12,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  permissionScreen: {
    justifyContent: 'space-between',
  },
  permissionContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  permissionIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  permissionTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionDesc: {
    color: '#8e8e93',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  grantBtn: {
    backgroundColor: '#AF52DE',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 24,
    width: '100%',
    alignItems: 'center',
  },
  grantBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
