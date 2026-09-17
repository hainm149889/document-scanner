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
  ScannerOverlayFrame,
  DocumentScannerNative,
  RNDocumentScannerVersion,
  DocumentType,
} from 'rn-document-scanner';

function App(): React.JSX.Element {
  const [nativeVersion, setNativeVersion] = useState<string>('Loading...');
  const [enableFlash, setEnableFlash] = useState<boolean>(false);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [documentType, setDocumentType] = useState<DocumentType>('cccd');

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

  const toggleFlash = () => {
    setEnableFlash(prev => !prev);
  };

  const toggleDocumentType = () => {
    setDocumentType(prev => (prev === 'cccd' ? 'passport' : 'cccd'));
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
        {hasPermission ? (
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
        <TouchableOpacity style={styles.button} onPress={toggleDocumentType}>
          <Text style={styles.buttonText}>
            Loại: {documentType.toUpperCase()}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
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
    position: 'relative',
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
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#2c2c2e',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3a3a3c',
    minWidth: 120,
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
