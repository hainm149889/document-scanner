import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  Text,
  StyleSheet,
  View,
  TouchableOpacity,
  StatusBar,
  PermissionsAndroid,
  Platform,
  Image,
  ActivityIndicator,
  Switch,
  Alert,
} from 'react-native';
import {
  DocumentCameraView,
  ScannerOverlayFrame,
  DocumentScannerNative,
  RNDocumentScannerVersion,
  DocumentType,
  NativeCapturedDocument,
} from 'rn-document-scanner';

function App(): React.JSX.Element {
  const [nativeVersion, setNativeVersion] = useState<string>('Loading...');
  const [enableFlash, setEnableFlash] = useState<boolean>(false);
  const [autoCrop, setAutoCrop] = useState<boolean>(true);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [documentType, setDocumentType] = useState<DocumentType>('cccd');
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [capturedImage, setCapturedImage] = useState<NativeCapturedDocument | null>(null);

  useEffect(() => {
    const requestCameraPermission = async () => {
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.CAMERA,
            {
              title: 'Cấp quyền Camera',
              message: 'Ứng dụng cần truy cập Camera để quét tài liệu CCCD/Passport.',
              buttonPositive: 'Đồng ý',
              buttonNegative: 'Hủy',
            }
          );
          setHasPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
        } catch (err) {
          console.warn('Lỗi xin quyền Android:', err);
          setHasPermission(false);
        }
      } else {
        setHasPermission(true);
      }
    };

    requestCameraPermission();

    try {
      if (DocumentScannerNative) {
        const version = DocumentScannerNative.getNativeVersion();
        setNativeVersion(version);
      }
    } catch (error) {
      console.error('Failed to get Native Version:', error);
    }
  }, []);

  const handleCapture = async () => {
    if (!DocumentScannerNative || isCapturing) return;
    try {
      setIsCapturing(true);
      const result = await DocumentScannerNative.capturePhoto({
        enableFlash,
        autoCrop,
        documentType,
      });
      console.log('Kết quả chụp ảnh:', result);
      setCapturedImage(result);
    } catch (error) {
      console.error('Lỗi chụp ảnh:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.title}>RN Document Scanner</Text>
        <Text style={styles.subtitle}>
          v{RNDocumentScannerVersion} | {nativeVersion}
        </Text>
      </View>

      <View style={styles.cameraContainer}>
        {capturedImage ? (
          <View style={StyleSheet.absoluteFill}>
            <Image source={{ uri: capturedImage.imageUri }} style={styles.previewImage} resizeMode="contain" />
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>
                {capturedImage.isCropped ? 'Đã Auto-Crop' : 'Ảnh Nguyên Bản'} ({Math.round(capturedImage.width)}x{Math.round(capturedImage.height)})
              </Text>
            </View>
          </View>
        ) : hasPermission ? (
          <View style={StyleSheet.absoluteFill}>
            <DocumentCameraView style={StyleSheet.absoluteFill} enableFlash={enableFlash} />
            <ScannerOverlayFrame
              documentType={documentType}
              onClose={() =>
                Alert.alert(
                  'Đóng Scanner',
                  'Bạn có muốn đóng trình quét tài liệu không?',
                  [
                    { text: 'Hủy', style: 'cancel' },
                    { text: 'Đồng ý', onPress: () => console.log('Đã đóng scanner') },
                  ]
                )
              }
            />
          </View>
        ) : (
          <View style={styles.permissionDenied}>
            <Text style={styles.permissionText}>Chưa có quyền truy cập Camera</Text>
          </View>
        )}
      </View>

      {/* Control Switch Row */}
      {!capturedImage && (
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Auto-Crop khung giấy tờ:</Text>
          <Switch value={autoCrop} onValueChange={setAutoCrop} trackColor={{ false: '#767577', true: '#34C759' }} />
        </View>
      )}

      <View style={styles.controls}>
        {capturedImage ? (
          <TouchableOpacity style={styles.captureButton} onPress={() => setCapturedImage(null)}>
            <Text style={styles.buttonText}>Chụp lại</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={styles.button}
              onPress={() => setDocumentType((prev) => (prev === 'cccd' ? 'passport' : 'cccd'))}
            >
              <Text style={styles.buttonText}>{documentType.toUpperCase()}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.captureButton, isCapturing && styles.buttonDisabled]}
              disabled={isCapturing || !hasPermission}
              onPress={handleCapture}
            >
              {isCapturing ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Chụp Ảnh</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, enableFlash && styles.flashButtonActive]}
              onPress={() => setEnableFlash((prev) => !prev)}
            >
              <Text style={styles.buttonText}>Flash: {enableFlash ? 'ON' : 'OFF'}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 12,
    color: '#8e8e93',
    marginTop: 4,
  },
  cameraContainer: {
    flex: 1,
    marginVertical: 10,
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 16,
    position: 'relative',
    backgroundColor: '#111',
  },
  permissionDenied: {
    flex: 1,
    backgroundColor: '#2c2c2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionText: {
    color: '#8e8e93',
    fontSize: 14,
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
    color: '#00FF66',
    fontWeight: 'bold',
    fontSize: 12,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  switchLabel: {
    color: '#ffffff',
    marginRight: 10,
    fontSize: 14,
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
    borderWidth: 1,
    borderColor: '#3a3a3c',
    alignItems: 'center',
  },
  captureButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
  },
  flashButtonActive: {
    backgroundColor: '#ffcc00',
    borderColor: '#ffcc00',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});

export default App;
