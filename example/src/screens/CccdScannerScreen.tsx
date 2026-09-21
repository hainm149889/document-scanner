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

interface CccdScannerScreenProps {
  onBack: () => void;
}

export function CccdScannerScreen({ onBack }: CccdScannerScreenProps) {
  const insets = useSafeAreaInsets();
  const { hasPermission, isChecking, requestPermission } =
    useCameraPermission();
  const [enableFlash, setEnableFlash] = useState<boolean>(false);
  const [showResultModal, setShowResultModal] = useState<boolean>(false);
  const [resultData, setResultData] = useState<DocumentExtractedData | null>(
    null,
  );
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

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
    documentType: 'cccd',
    autoCrop: true,
    detectPerspective: false,
    validateFaceOnFront: true,
    duplicateThreshold: 0.85,
  });

  const handleCapture = async () => {
    if (isProcessing) return;
    await captureCurrentStep({ enableFlash });
  };

  const handleAnalyze = async () => {
    const finalData = getFinalDocuments();
    console.log('🚀 ~ handleAnalyze ~ finalData:', finalData);
    if (!finalData) {
      Alert.alert('Chưa đủ dữ liệu', 'Vui lòng hoàn thành chụp cả 2 mặt CCCD.');
      return;
    }

    try {
      setIsAnalyzing(true);
      // Gọi On-Device OCR bóc tách thông tin thực tế từ ảnh vừa chụp
      const ocrData = await DocumentScannerNative.extractDocumentData(
        finalData.front.imageUri,
        'cccd',
      );

      setResultData({
        documentType: 'cccd',
        idNumber: ocrData.idNumber,
        fullName: ocrData.fullName,
        dateOfBirth: ocrData.dateOfBirth,
        gender: ocrData.gender,
        nationality: ocrData.nationality,
        placeOfOrigin: ocrData.placeOfOrigin,
        placeOfResidence: ocrData.placeOfResidence,
        expiryDate: ocrData.expiryDate,
        issueDate: ocrData.issueDate,
        hasFace: frontValidation?.hasFace ?? true,
        similarity: similarity,
        frontImage: finalData.front,
        backImage: finalData.back,
      });
      setShowResultModal(true);
    } catch (e: any) {
      Alert.alert(
        'Lỗi nhận diện OCR',
        e?.message || 'Không thể trích xuất văn bản từ ảnh.',
      );
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
          {
            paddingTop: Math.max(insets.top, 24),
            paddingBottom: Math.max(insets.bottom, 24),
          },
        ]}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.backButtonText}>← Quay lại</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quyền Camera</Text>
          <View style={{ width: 60 }} />
        </View>

        <View style={styles.permissionContent}>
          <Text style={styles.permissionIcon}>📷</Text>
          <Text style={styles.permissionTitle}>Cần quyền truy cập Camera</Text>
          <Text style={styles.permissionDesc}>
            Để quét mặt trước và mặt sau thẻ CCCD/CMND, ứng dụng cần quyền sử
            dụng máy ảnh của thiết bị.
          </Text>
          <TouchableOpacity
            style={styles.grantBtn}
            onPress={requestPermission}
            activeOpacity={0.8}
          >
            <Text style={styles.grantBtnText}>Cấp quyền Camera</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View
        style={[
          styles.header,
          { paddingTop: Math.max(insets.top, 14), paddingBottom: 12 },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backButtonText}>← Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quét eKYC CCCD</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* 3-Step Progress Bar */}
      <View style={styles.progressBar}>
        <View
          style={[styles.stepChip, step === 'front' && styles.stepChipActive]}
        >
          <Text
            style={[
              styles.stepChipText,
              step === 'front' && styles.stepChipTextActive,
            ]}
          >
            1. Mặt trước {frontDocument ? '✓' : ''}
          </Text>
        </View>
        <Text style={styles.stepArrow}>→</Text>
        <View
          style={[styles.stepChip, step === 'back' && styles.stepChipActive]}
        >
          <Text
            style={[
              styles.stepChipText,
              step === 'back' && styles.stepChipTextActive,
            ]}
          >
            2. Mặt sau {backDocument ? '✓' : ''}
          </Text>
        </View>
        <Text style={styles.stepArrow}>→</Text>
        <View
          style={[styles.stepChip, step === 'review' && styles.stepChipActive]}
        >
          <Text
            style={[
              styles.stepChipText,
              step === 'review' && styles.stepChipTextActive,
            ]}
          >
            3. Phân tích
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
        <TouchableOpacity
          style={styles.errorBanner}
          onPress={clearError}
          activeOpacity={0.8}
        >
          <Text style={styles.errorBannerText}>{errorMessage}</Text>
          <Text style={styles.errorBannerDismiss}>Đóng</Text>
        </TouchableOpacity>
      )}

      {/* Main View: Camera or Review */}
      <View style={styles.mainContainer}>
        {step === 'review' ? (
          <ScrollView contentContainerStyle={styles.reviewContent}>
            {/* Front Image Card */}
            {frontDocument && (
              <View style={styles.reviewCard}>
                <View style={styles.reviewCardHeader}>
                  <Text style={styles.cardTitle}>Mặt trước CCCD</Text>
                  {frontValidation && (
                    <View
                      style={[
                        styles.badge,
                        frontValidation.hasFace
                          ? styles.badgeSuccess
                          : styles.badgeWarning,
                      ]}
                    >
                      <Text style={styles.badgeText}>
                        {frontValidation.hasFace
                          ? 'Có chân dung ✓'
                          : 'Chưa thấy chân dung ⚠️'}
                      </Text>
                    </View>
                  )}
                </View>
                <Image
                  source={{ uri: frontDocument.imageUri }}
                  style={styles.reviewImage}
                  resizeMode="contain"
                />
                <View style={styles.cardFooter}>
                  <Text style={styles.dimText}>
                    {Math.round(frontDocument.width)}x
                    {Math.round(frontDocument.height)} px
                  </Text>
                  <TouchableOpacity
                    style={styles.smallActionBtn}
                    onPress={retakeFront}
                  >
                    <Text style={styles.smallActionText}>Chụp lại</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Back Image Card */}
            {backDocument && (
              <View style={styles.reviewCard}>
                <View style={styles.reviewCardHeader}>
                  <Text style={styles.cardTitle}>Mặt sau CCCD</Text>
                  {similarity !== null && (
                    <View
                      style={[
                        styles.badge,
                        similarity >= 0.85
                          ? styles.badgeWarning
                          : styles.badgeSuccess,
                      ]}
                    >
                      <Text style={styles.badgeText}>
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
                <View style={styles.cardFooter}>
                  <Text style={styles.dimText}>
                    {Math.round(backDocument.width)}x
                    {Math.round(backDocument.height)} px
                  </Text>
                  <TouchableOpacity
                    style={styles.smallActionBtn}
                    onPress={retakeBack}
                  >
                    <Text style={styles.smallActionText}>Chụp lại</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Duplicate Warning Box */}
            {similarity !== null && similarity >= 0.85 && (
              <View style={styles.similarityAlert}>
                <Text style={styles.similarityTitle}>
                  ⚠️ Cảnh báo trùng lặp mặt trước & sau
                </Text>
                <Text style={styles.similarityDesc}>
                  Hai ảnh có độ tương đồng {(similarity * 100).toFixed(1)}%. Có
                  thể bạn vừa chụp mặt trước 2 lần. Vui lòng lật thẻ sang mặt
                  sau và chụp lại.
                </Text>
              </View>
            )}

            {/* Analyze Button */}
            <TouchableOpacity
              style={[styles.analyzeBtn, isAnalyzing && styles.btnDisabled]}
              onPress={handleAnalyze}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.analyzeBtnText}>
                  Phân tích thông tin CCCD (OCR)
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <View style={StyleSheet.absoluteFill}>
            <DocumentCameraView
              style={StyleSheet.absoluteFill}
              enableFlash={enableFlash}
            />
            <ScannerOverlayFrame documentType="cccd" showCloseButton={false} />

            {/* Mini thumbnail of front image when scanning back */}
            {step === 'back' && frontDocument && (
              <View style={styles.miniThumbContainer}>
                <Image
                  source={{ uri: frontDocument.imageUri }}
                  style={styles.miniThumbImage}
                />
                <Text style={styles.miniThumbLabel}>Mặt trước ✓</Text>
              </View>
            )}
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
            <Text style={styles.btnText}>Quét lại từ đầu</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.flashBtn, enableFlash && styles.flashBtnActive]}
              onPress={() => setEnableFlash(prev => !prev)}
            >
              <Text style={styles.btnText}>
                Flash: {enableFlash ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.captureBtn, isProcessing && styles.btnDisabled]}
              disabled={isProcessing}
              onPress={handleCapture}
            >
              {isProcessing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.captureBtnText}>
                  {step === 'front' ? 'Chụp mặt trước' : 'Chụp mặt sau'}
                </Text>
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
    color: '#007AFF',
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#2c2c2e',
  },
  stepChipActive: {
    backgroundColor: '#007AFF',
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
    marginHorizontal: 6,
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
    position: 'relative',
  },
  miniThumbContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    padding: 4,
    alignItems: 'center',
  },
  miniThumbImage: {
    width: 60,
    height: 38,
    borderRadius: 4,
  },
  miniThumbLabel: {
    color: '#34C759',
    fontSize: 9,
    fontWeight: 'bold',
    marginTop: 2,
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
    height: 160,
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
    color: '#007AFF',
    fontSize: 11,
    fontWeight: '600',
  },
  similarityAlert: {
    backgroundColor: 'rgba(255, 69, 58, 0.15)',
    borderColor: '#ff453a',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  similarityTitle: {
    color: '#ff453a',
    fontWeight: 'bold',
    fontSize: 12,
  },
  similarityDesc: {
    color: '#ffffff',
    fontSize: 11,
    marginTop: 2,
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
    backgroundColor: '#007AFF',
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
    backgroundColor: '#007AFF',
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
