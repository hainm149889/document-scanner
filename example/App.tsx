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
} from 'react-native';
import {
  DocumentCameraView,
  DocumentScannerNative,
  RNDocumentScannerVersion,
} from 'rn-document-scanner';

function App(): React.JSX.Element {
  const [nativeVersion, setNativeVersion] = useState<string>('Loading...');
  const [enableFlash, setEnableFlash] = useState<boolean>(false);
  const [hasPermission, setHasPermission] = useState<boolean>(false);

  useEffect(() => {
    // 1. Kiểm tra và Yêu cầu quyền Camera
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
        // Trên iOS: Kiểm tra và yêu cầu quyền Camera qua DocumentScannerNative
        try {
          const granted = await DocumentScannerNative.requestCameraPermission();
          setHasPermission(granted);
        } catch (err) {
          console.warn('Lỗi xin quyền iOS:', err);
          setHasPermission(false);
        }
      }
    };

    requestCameraPermission();

    // 2. Lấy phiên bản Native Engine từ Nitro
    try {
      if (DocumentScannerNative) {
        const version = DocumentScannerNative.getNativeVersion();
        setNativeVersion(version);
      }
    } catch (error) {
      console.error('Failed to get Native Version:', error);
    }
  }, []);

  const toggleFlash = () => {
    setEnableFlash(prev => !prev);
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

      {/* Native Camera Preview View (Chỉ hiển thị khi đã được cấp quyền) */}
      <View style={styles.cameraContainer}>
        {hasPermission ? (
          <DocumentCameraView style={styles.camera} enableFlash={enableFlash} />
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
        <TouchableOpacity
          style={[
            styles.flashButton,
            enableFlash && styles.flashButtonActive,
            !hasPermission && styles.buttonDisabled,
          ]}
          disabled={!hasPermission}
          onPress={toggleFlash}
        >
          <Text style={styles.buttonText}>
            Flash: {enableFlash ? 'ON' : 'OFF'}
          </Text>
        </TouchableOpacity>
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
  },
  camera: {
    flex: 1,
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
  controls: {
    padding: 20,
    alignItems: 'center',
  },
  flashButton: {
    backgroundColor: '#2c2c2e',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3a3a3c',
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
