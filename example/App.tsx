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
  ScrollView,
} from 'react-native';
import {
  DocumentCameraView,
  ScannerOverlayFrame,
  DocumentScannerNative,
  RNDocumentScannerVersion,
  DocumentType,
  useDocumentScannerFlow,
} from 'rn-document-scanner';

function App(): React.JSX.Element {
  const [nativeVersion, setNativeVersion] = useState<string>('Loading...');
  const [enableFlash, setEnableFlash] = useState<boolean>(false);
  const [autoCrop, setAutoCrop] = useState<boolean>(true);
  const [detectPerspective, setDetectPerspective] = useState<boolean>(true);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [docType, setDocType] = useState<DocumentType>('cccd');

  const {
    step,
    stepTitle,
    stepDescription,
    frontDocument,
    backDocument,
    frontValidation,
    similarity,
    isProcessing,
    errorMessage,
    clearError,
    captureCurrentStep,
    retakeFront,
    retakeBack,
    resetFlow,
    getFinalDocuments,
  } = useDocumentScannerFlow({
    documentType: docType,
    autoCrop,
    detectPerspective,
    validateFaceOnFront: true,
    duplicateThreshold: 0.85,
  });

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
    if (!DocumentScannerNative || isProcessing) return;
    await captureCurrentStep({ enableFlash });
  };

  const handleAnalyze = () => {
    const finalData = getFinalDocuments();
    if (!finalData) {
      Alert.alert('Chưa đủ dữ liệu', 'Vui lòng hoàn thành các bước chụp trước khi phân tích.');
      return;
    }

    const simText =
      similarity !== null
        ? `\n- Độ tương đồng 2 mặt: ${(similarity * 100).toFixed(1)}% (${
            similarity >= 0.85 ? '⚠️ Cảnh báo trùng!' : '✅ Hợp lệ'
          })`
        : '';

    const faceText = frontValidation
      ? `\n- Chân dung mặt trước: ${frontValidation.hasFace ? 'Phát hiện ✅' : 'Không có ⚠️'}`
      : '';

    Alert.alert(
      'Phân tích eKYC thành công! 🎉',
      `Loại giấy tờ: ${finalData.documentType.toUpperCase()}` +
        faceText +
        simText +
        `\n- Mặt trước: ${Math.round(finalData.front.width)}x${Math.round(finalData.front.height)} px` +
        (finalData.back ? `\n- Mặt sau: ${Math.round(finalData.back.width)}x${Math.round(finalData.back.height)} px` : '') +
        '\n\nẢnh đã sẵn sàng gửi tới Server Backend OCR & eKYC.',
      [
        { text: 'Quét lại', style: 'destructive', onPress: resetFlow },
        { text: 'Xong', style: 'default' },
      ]
    );
  };

  const toggleDocumentType = () => {
    resetFlow();
    setDocType((prev) => (prev === 'cccd' ? 'passport' : 'cccd'));
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerCloseButton}
          onPress={() =>
            Alert.alert(
              'Đóng Scanner',
              'Bạn có muốn đóng trình quét tài liệu không?',
              [
                { text: 'Hủy', style: 'cancel' },
                { text: 'Đồng ý', onPress: resetFlow },
              ]
            )
          }
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Đóng scanner"
        >
          <Text style={styles.headerCloseButtonText}>✕</Text>
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.title}>eKYC Document Scanner</Text>
          <Text style={styles.subtitle}>
            v{RNDocumentScannerVersion} | {nativeVersion}
          </Text>
        </View>
      </View>

      {/* Multi-step Progress Bar */}
      <View style={styles.stepProgressBar}>
        {docType === 'cccd' ? (
          <>
            <View style={[styles.stepChip, step === 'front' && styles.stepChipActive]}>
              <Text style={[styles.stepChipText, step === 'front' && styles.stepChipTextActive]}>
                1. Mặt trước {frontDocument ? '✓' : ''}
              </Text>
            </View>
            <Text style={styles.stepArrow}>→</Text>
            <View style={[styles.stepChip, step === 'back' && styles.stepChipActive]}>
              <Text style={[styles.stepChipText, step === 'back' && styles.stepChipTextActive]}>
                2. Mặt sau {backDocument ? '✓' : ''}
              </Text>
            </View>
            <Text style={styles.stepArrow}>→</Text>
            <View style={[styles.stepChip, step === 'review' && styles.stepChipActive]}>
              <Text style={[styles.stepChipText, step === 'review' && styles.stepChipTextActive]}>
                3. Phân tích
              </Text>
            </View>
          </>
        ) : (
          <>
            <View style={[styles.stepChip, step === 'front' && styles.stepChipActive]}>
              <Text style={[styles.stepChipText, step === 'front' && styles.stepChipTextActive]}>
                1. Trang hộ chiếu {frontDocument ? '✓' : ''}
              </Text>
            </View>
            <Text style={styles.stepArrow}>→</Text>
            <View style={[styles.stepChip, step === 'review' && styles.stepChipActive]}>
              <Text style={[styles.stepChipText, step === 'review' && styles.stepChipTextActive]}>
                2. Phân tích
              </Text>
            </View>
          </>
        )}
      </View>

      {/* Step Instruction Banner */}
      <View style={styles.instructionBanner}>
        <Text style={styles.instructionTitle}>{stepTitle}</Text>
        <Text style={styles.instructionDesc}>{stepDescription}</Text>
      </View>

      {/* Error / Warning Alert Banner */}
      {errorMessage && (
        <TouchableOpacity style={styles.errorBanner} onPress={clearError} activeOpacity={0.8}>
          <Text style={styles.errorBannerText}>{errorMessage}</Text>
          <Text style={styles.errorBannerDismiss}>Đóng</Text>
        </TouchableOpacity>
      )}

      {/* Camera / Review Content Area */}
      <View style={styles.cameraContainer}>
        {step === 'review' ? (
          <ScrollView contentContainerStyle={styles.reviewScrollContent}>
            {/* Front Card */}
            {frontDocument && (
              <View style={styles.reviewCard}>
                <View style={styles.reviewCardHeader}>
                  <Text style={styles.reviewCardTitle}>
                    {docType === 'cccd' ? 'Mặt trước CCCD' : 'Trang Hộ Chiếu'}
                  </Text>
                  {frontValidation && (
                    <View
                      style={[
                        styles.faceBadge,
                        frontValidation.hasFace ? styles.faceBadgeSuccess : styles.faceBadgeWarning,
                      ]}
                    >
                      <Text style={styles.faceBadgeText}>
                        {frontValidation.hasFace ? 'Có chân dung ✓' : 'Chưa thấy chân dung ⚠️'}
                      </Text>
                    </View>
                  )}
                </View>
                <Image
                  source={{ uri: frontDocument.imageUri }}
                  style={styles.reviewImage}
                  resizeMode="contain"
                />
                <View style={styles.reviewCardFooter}>
                  <Text style={styles.reviewDimText}>
                    {Math.round(frontDocument.width)}x{Math.round(frontDocument.height)} px
                  </Text>
                  <TouchableOpacity style={styles.retakeSmallButton} onPress={retakeFront}>
                    <Text style={styles.retakeSmallText}>Chụp lại</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Back Card (CCCD only) */}
            {docType === 'cccd' && backDocument && (
              <View style={styles.reviewCard}>
                <View style={styles.reviewCardHeader}>
                  <Text style={styles.reviewCardTitle}>Mặt sau CCCD</Text>
                  {similarity !== null && (
                    <View
                      style={[
                        styles.faceBadge,
                        similarity >= 0.85 ? styles.faceBadgeWarning : styles.faceBadgeSuccess,
                      ]}
                    >
                      <Text style={styles.faceBadgeText}>
                        {similarity >= 0.85
                          ? `Trùng lặp: ${(similarity * 100).toFixed(0)}% ⚠️`
                          : `Độc lập: ${(similarity * 100).toFixed(0)}% ✓`}
                      </Text>
                    </View>
                  )}
                </View>
                <Image
                  source={{ uri: backDocument.imageUri }}
                  style={styles.reviewImage}
                  resizeMode="contain"
                />
                <View style={styles.reviewCardFooter}>
                  <Text style={styles.reviewDimText}>
                    {Math.round(backDocument.width)}x{Math.round(backDocument.height)} px
                  </Text>
                  <TouchableOpacity style={styles.retakeSmallButton} onPress={retakeBack}>
                    <Text style={styles.retakeSmallText}>Chụp lại</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Similarity Warning Banner */}
            {similarity !== null && similarity >= 0.85 && (
              <View style={styles.similarityWarningBox}>
                <Text style={styles.similarityWarningTitle}>⚠️ Cảnh báo trùng lặp mặt trước & sau</Text>
                <Text style={styles.similarityWarningDesc}>
                  Hai ảnh có độ tương đồng {(similarity * 100).toFixed(1)}%. Có thể bạn vừa chụp mặt trước 2 lần. Vui lòng kiểm tra lại.
                </Text>
              </View>
            )}

            {/* Action Analyze Button */}
            <TouchableOpacity
              style={styles.analyzeButton}
              onPress={handleAnalyze}
            >
              <Text style={styles.analyzeButtonText}>Phân tích thông tin</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : hasPermission ? (
          <View style={StyleSheet.absoluteFill}>
            <DocumentCameraView style={StyleSheet.absoluteFill} enableFlash={enableFlash} />
            <ScannerOverlayFrame
              documentType={docType}
              showCloseButton={false}
            />

            {/* Mini thumbnail if front is already captured while scanning back */}
            {step === 'back' && frontDocument && (
              <View style={styles.miniThumbnailContainer}>
                <Image source={{ uri: frontDocument.imageUri }} style={styles.miniThumbnailImage} />
                <Text style={styles.miniThumbnailLabel}>Mặt trước ✓</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.permissionDenied}>
            <Text style={styles.permissionText}>Chưa có quyền truy cập Camera</Text>
          </View>
        )}
      </View>

      {/* Switches for options (only during camera scanning) */}
      {step !== 'review' && (
        <View style={styles.switchContainer}>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Nắn thẳng góc nghiêng (Perspective):</Text>
            <Switch
              value={detectPerspective}
              onValueChange={setDetectPerspective}
              trackColor={{ false: '#767577', true: '#007AFF' }}
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
      <View style={styles.controls}>
        {step === 'review' ? (
          <TouchableOpacity style={styles.resetFlowButton} onPress={resetFlow}>
            <Text style={styles.buttonText}>Quét lại từ đầu</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity style={styles.button} onPress={toggleDocumentType}>
              <Text style={styles.buttonText}>{docType.toUpperCase()}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.captureButton, isProcessing && styles.buttonDisabled]}
              disabled={isProcessing || !hasPermission}
              onPress={handleCapture}
            >
              {isProcessing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>
                  {step === 'front' ? 'Chụp mặt 1' : 'Chụp mặt 2'}
                </Text>
              )}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
  },
  headerCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2c2c2e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerCloseButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginRight: 36,
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
  stepProgressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: '#161618',
  },
  stepChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#2c2c2e',
  },
  stepChipActive: {
    backgroundColor: '#007AFF',
  },
  stepChipText: {
    color: '#8e8e93',
    fontSize: 12,
    fontWeight: '600',
  },
  stepChipTextActive: {
    color: '#ffffff',
  },
  stepArrow: {
    color: '#555555',
    marginHorizontal: 6,
    fontSize: 12,
  },
  instructionBanner: {
    backgroundColor: '#1c1c1e',
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2c2c2e',
  },
  instructionTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  instructionDesc: {
    color: '#8e8e93',
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: '#ff3b30',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorBannerText: {
    color: '#ffffff',
    fontSize: 12,
    flex: 1,
    marginRight: 8,
    fontWeight: '500',
  },
  errorBannerDismiss: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
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
  miniThumbnailContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    padding: 4,
    alignItems: 'center',
  },
  miniThumbnailImage: {
    width: 60,
    height: 40,
    borderRadius: 4,
  },
  miniThumbnailLabel: {
    color: '#34C759',
    fontSize: 9,
    fontWeight: 'bold',
    marginTop: 2,
  },
  reviewScrollContent: {
    padding: 16,
    gap: 16,
  },
  reviewCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2c2c2e',
  },
  reviewCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewCardTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  faceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  faceBadgeSuccess: {
    backgroundColor: 'rgba(52, 199, 89, 0.2)',
  },
  faceBadgeWarning: {
    backgroundColor: 'rgba(255, 149, 0, 0.2)',
  },
  faceBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  reviewImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    backgroundColor: '#000',
  },
  reviewCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  reviewDimText: {
    color: '#8e8e93',
    fontSize: 12,
  },
  retakeSmallButton: {
    backgroundColor: '#2c2c2e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  retakeSmallText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '600',
  },
  similarityWarningBox: {
    backgroundColor: 'rgba(255, 69, 58, 0.15)',
    borderColor: '#ff453a',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  similarityWarningTitle: {
    color: '#ff453a',
    fontWeight: 'bold',
    fontSize: 13,
  },
  similarityWarningDesc: {
    color: '#ffffff',
    fontSize: 12,
    marginTop: 4,
  },
  analyzeButton: {
    backgroundColor: '#34C759',
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
    marginTop: 8,
  },
  analyzeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
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
    fontSize: 13,
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
    minWidth: 140,
  },
  resetFlowButton: {
    backgroundColor: '#2c2c2e',
    paddingHorizontal: 28,
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
