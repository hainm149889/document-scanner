import React, {useEffect, useState} from 'react';
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
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [documentType, setDocumentType] = useState<DocumentType>('cccd');
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [capturedImage, setCapturedImage] =
    useState<NativeCapturedDocument | null>(null);

  useEffect(() => {
    const requestCameraPermission = async () => {
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.CAMERA,
            {
              title: 'Cấp quyền Camera',
              message:
                'Ứng dụng cần truy cập Camera để quét tài liệu CCCD/Passport.',
              buttonPositive: 'Đồng ý',
              buttonNegative: 'Hủy',
            },
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
      });
      console.log('Chụp ảnh thành công:', result);
      setCapturedImage(result);
    } catch (error) {
      console.error('Lỗi chụp ảnh:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleReset = () => {
    setCapturedImage(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header Info */}
      <View style={styles.header}>
        <Text style={styles.title}>RN Document Scanner</Text>
        <Text style={styles.subtitle}>
          v{RNDocumentScannerVersion} | {nativeVersion}
        </Text>
      </View>

      {/* Camera & Overlay Frame Container */}
      <View style={styles.cameraContainer}>
        {capturedImage ? (
          <View style={StyleSheet.absoluteFill}>
            <Image
              source={{uri: capturedImage.imageUri}}
              style={styles.previewImage}
              resizeMode="contain"
            />
          </View>
        ) : hasPermission ? (
          <View style={StyleSheet.absoluteFill}>
            <DocumentCameraView
              style={StyleSheet.absoluteFill}
              enableFlash={enableFlash}
            />
            <ScannerOverlayFrame documentType={documentType} />
          </View>
        ) : (
          <View style={styles.permissionDenied}>
            <Text style={styles.permissionText}>
              Chưa có quyền truy cập Camera
            </Text>
          </View>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {capturedImage ? (
          <TouchableOpacity style={styles.captureButton} onPress={handleReset}>
            <Text style={styles.buttonText}>Chụp lại</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={styles.button}
              onPress={() =>
                setDocumentType(prev =>
                  prev === 'cccd' ? 'passport' : 'cccd',
                )
              }>
              <Text style={styles.buttonText}>
                {documentType.toUpperCase()}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.captureButton,
                isCapturing && styles.buttonDisabled,
              ]}
              disabled={isCapturing || !hasPermission}
              onPress={handleCapture}>
              {isCapturing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Chụp Ảnh</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, enableFlash && styles.flashButtonActive]}
              onPress={() => setEnableFlash(prev => !prev)}>
              <Text style={styles.buttonText}>
                Flash: {enableFlash ? 'ON' : 'OFF'}
              </Text>
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
  controls: {
    padding: 20,
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
