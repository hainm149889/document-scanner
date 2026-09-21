import { useState, useEffect, useCallback } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import { DocumentScannerNative } from 'rn-document-scanner';

export interface UseCameraPermissionResult {
  hasPermission: boolean;
  isChecking: boolean;
  requestPermission: () => Promise<boolean>;
}

export function useCameraPermission(): UseCameraPermissionResult {
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(true);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    setIsChecking(true);
    try {
      if (Platform.OS === 'android') {
        // Kiểm tra quyền trước
        const alreadyGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.CAMERA
        );
        if (alreadyGranted) {
          setHasPermission(true);
          setIsChecking(false);
          return true;
        }

        // Nếu chưa có, hiển thị hộp thoại xin quyền hệ thống
        const status = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Quyền truy cập Máy ảnh',
            message: 'Ứng dụng cần quyền Camera để chụp và nhận diện giấy tờ.',
            buttonPositive: 'Cho phép',
            buttonNegative: 'Hủy',
          }
        );

        const granted = status === PermissionsAndroid.RESULTS.GRANTED;
        setHasPermission(granted);
        setIsChecking(false);
        return granted;
      } else {
        // iOS
        const status = DocumentScannerNative.getCameraPermissionStatus();
        if (status === 'granted') {
          setHasPermission(true);
          setIsChecking(false);
          return true;
        }

        const granted = await DocumentScannerNative.requestCameraPermission();
        setHasPermission(granted);
        setIsChecking(false);
        return granted;
      }
    } catch (error) {
      console.warn('Lỗi khi xin quyền Camera:', error);
      setHasPermission(false);
      setIsChecking(false);
      return false;
    }
  }, []);

  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  return {
    hasPermission,
    isChecking,
    requestPermission,
  };
}
