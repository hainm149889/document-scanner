import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  DocumentCameraView,
  ScannerOverlayFrame,
  DocumentScannerNative,
  useDocumentScannerFlow,
} from 'rn-document-scanner';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCameraPermission } from '../hooks/useCameraPermission';

import {
  DocumentResultModal,
  DocumentExtractedData,
} from '../components/DocumentResultModal';

interface PassportScannerScreenProps {
  onBack: () => void;
}

export function PassportScannerScreen({ onBack }: PassportScannerScreenProps) {
  const insets = useSafeAreaInsets();
  const { hasPermission, isChecking, requestPermission } = useCameraPermission();
  const [enableFlash, setEnableFlash] = useState<boolean>(false);
  const [showResultModal, setShowResultModal] = useState<boolean>(false);
  const [resultData, setResultData] = useState<DocumentExtractedData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  const {
    step,
    stepTitle,
    stepDescription,
    frontDocument,
    frontValidation,
    isProcessing,
    errorMessage,
    clearError,
    captureCurrentStep,
    retakeFront,
    resetFlow,
    getFinalDocuments,
  } = useDocumentScannerFlow({
    documentType: 'passport',
    autoCrop: true,
    detectPerspective: false,
    validateFaceOnFront: true,
  });

  const handleCapture = async () => {
    if (isProcessing) return;
    await captureCurrentStep({ enableFlash });
  };

  const handleAnalyze = async () => {
    const finalData = getFinalDocuments();
    if (!finalData) {
      Alert.alert('Chưa có dữ liệu', 'Vui lòng chụp trang thông tin hộ chiếu.');
      return;
    }

    try {
      setIsAnalyzing(true);
      // Gọi On-Device OCR đọc mã MRZ và thông tin hộ chiếu thực tế từ ảnh
      const ocrData = await DocumentScannerNative.extractDocumentData(
        finalData.front.imageUri,
        'passport'
      );

      setResultData({
        documentType: 'passport',
        idNumber: ocrData.idNumber,
        fullName: ocrData.fullName,
        dateOfBirth: ocrData.dateOfBirth,
        gender: ocrData.gender,
        nationality: ocrData.nationality,
        placeOfResidence: ocrData.placeOfResidence,
        expiryDate: ocrData.expiryDate,
        issueDate: ocrData.issueDate,
        mrzLines: ocrData.mrzLines,
        hasFace: frontValidation?.hasFace ?? true,
        frontImage: finalData.front,
      });
      setShowResultModal(true);
    } catch (e: any) {
      Alert.alert('Lỗi nhận diện OCR', e?.message || 'Không thể trích xuất mã MRZ từ ảnh hộ chiếu.');
    } finally {
      setIsAnalyzing(false);
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
          <Text style={styles.permissionIcon}>🛂</Text>
          <Text style={styles.permissionTitle}>Cần quyền truy cập Camera</Text>
          <Text style={styles.permissionDesc}>
            Để chụp và nhận diện trang thông tin hộ chiếu (Passport), ứng dụng cần quyền sử dụng máy ảnh của thiết bị.
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
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 14), paddingBottom: 12 }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.backButtonText}>← Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quét Hộ Chiếu (Passport)</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBar}>
        <View style={[styles.stepChip, step === 'front' && styles.stepChipActive]}>
          <Text style={[styles.stepChipText, step === 'front' && styles.stepChipTextActive]}>
            1. Trang Hộ Chiếu {frontDocument ? '✓' : ''}
          </Text>
        </View>
        <Text style={styles.stepArrow}>→</Text>
        <View style={[styles.stepChip, step === 'review' && styles.stepChipActive]}>
          <Text style={[styles.stepChipText, step === 'review' && styles.stepChipTextActive]}>
            2. Phân tích
          </Text>
        </View>
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

      {/* Main View: Camera or Review */}
      <View style={styles.mainContainer}>
        {step === 'review' && frontDocument ? (
          <ScrollView contentContainerStyle={styles.reviewContent}>
            <View style={styles.reviewCard}>
              <View style={styles.reviewCardHeader}>
                <Text style={styles.cardTitle}>Trang Nhân Thân Hộ Chiếu</Text>
                {frontValidation && (
                  <View
                    style={[
                      styles.badge,
                      frontValidation.hasFace ? styles.badgeSuccess : styles.badgeWarning,
                    ]}
                  >
                    <Text style={styles.badgeText}>
                      {frontValidation.hasFace ? 'Có ảnh chân dung ✓' : 'Chưa thấy chân dung ⚠️'}
                    </Text>
                  </View>
                )}
              </View>
              <Image source={{ uri: frontDocument.imageUri }} style={styles.reviewImage} resizeMode="contain" />
              <View style={styles.cardFooter}>
                <Text style={styles.dimText}>
                  {Math.round(frontDocument.width)}x{Math.round(frontDocument.height)} px (Tỷ lệ 1.42)
                </Text>
                <TouchableOpacity style={styles.smallActionBtn} onPress={retakeFront}>
                  <Text style={styles.smallActionText}>Chụp lại</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.analyzeBtn, isAnalyzing && styles.btnDisabled]}
              onPress={handleAnalyze}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.analyzeBtnText}>Phân tích thông tin Hộ Chiếu (OCR)</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <View style={StyleSheet.absoluteFill}>
            <DocumentCameraView style={StyleSheet.absoluteFill} enableFlash={enableFlash} />
            <ScannerOverlayFrame documentType="passport" showCloseButton={false} />
          </View>
        )}
      </View>

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
        {step === 'review' ? (
          <TouchableOpacity style={styles.resetBtn} onPress={resetFlow}>
            <Text style={styles.btnText}>Quét lại trang khác</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.flashBtn, enableFlash && styles.flashBtnActive]}
              onPress={() => setEnableFlash((prev) => !prev)}
            >
              <Text style={styles.btnText}>Flash: {enableFlash ? 'ON' : 'OFF'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.captureBtn, isProcessing && styles.btnDisabled]}
              disabled={isProcessing}
              onPress={handleCapture}
            >
              {isProcessing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.captureBtnText}>Chụp Hộ Chiếu</Text>
              )}
            </TouchableOpacity>

            <View style={{ width: 80 }} />
          </>
        )}
      </View>

      {/* Document Details Result Modal */}
      <DocumentResultModal
        visible={showResultModal}
        data={resultData}
        onClose={() => setShowResultModal(false)}
        onRetake={() => {
          setShowResultModal(false);
          resetFlow();
        }}
      />
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
    color: '#34C759',
    fontSize: 13,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: '#161618',
  },
  stepChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#2c2c2e',
  },
  stepChipActive: {
    backgroundColor: '#34C759',
  },
  stepChipText: {
    color: '#8e8e93',
    fontSize: 11,
    fontWeight: '600',
  },
  stepChipTextActive: {
    color: '#ffffff',
  },
  stepArrow: {
    color: '#555555',
    marginHorizontal: 8,
    fontSize: 11,
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
    fontSize: 13,
    fontWeight: 'bold',
  },
  instructionDesc: {
    color: '#8e8e93',
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: '#ff3b30',
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorBannerText: {
    color: '#ffffff',
    fontSize: 11,
    flex: 1,
    marginRight: 8,
  },
  errorBannerDismiss: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  mainContainer: {
    flex: 1,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  reviewContent: {
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
  cardTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeSuccess: {
    backgroundColor: 'rgba(52, 199, 89, 0.2)',
  },
  badgeWarning: {
    backgroundColor: 'rgba(255, 149, 0, 0.2)',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  reviewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#000',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  dimText: {
    color: '#8e8e93',
    fontSize: 11,
  },
  smallActionBtn: {
    backgroundColor: '#2c2c2e',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  smallActionText: {
    color: '#34C759',
    fontSize: 11,
    fontWeight: '600',
  },
  analyzeBtn: {
    backgroundColor: '#34C759',
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
    marginTop: 8,
  },
  analyzeBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  controls: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flashBtn: {
    backgroundColor: '#2c2c2e',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  flashBtnActive: {
    backgroundColor: '#ffcc00',
  },
  captureBtn: {
    backgroundColor: '#34C759',
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
  btnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
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
    backgroundColor: '#34C759',
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
