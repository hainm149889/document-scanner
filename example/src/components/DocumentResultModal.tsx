import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
export interface DocumentImageInfo {
  imageUri: string;
  width: number;
  height: number;
  isCropped?: boolean;
}

export interface DocumentExtractedData {
  documentType: 'cccd' | 'passport';
  idNumber: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  placeOfOrigin?: string;
  placeOfResidence?: string;
  expiryDate: string;
  issueDate?: string;
  mrzLines?: string[];
  hasFace?: boolean;
  similarity?: number | null;
  frontImage?: DocumentImageInfo | null;
  backImage?: DocumentImageInfo | null;
}

interface DocumentResultModalProps {
  visible: boolean;
  data: DocumentExtractedData | null;
  onClose: () => void;
  onRetake: () => void;
}

export function DocumentResultModal({
  visible,
  data,
  onClose,
  onRetake,
}: DocumentResultModalProps) {
  const insets = useSafeAreaInsets();

  if (!data) return null;

  const isCccd = data.documentType === 'cccd';

  const handleShare = async () => {
    try {
      const summary = `
KẾT QUẢ QUÉT ${isCccd ? 'CCCD / CMND' : 'HỘ CHIẾU (PASSPORT)'}
- Số: ${data.idNumber}
- Họ và tên: ${data.fullName}
- Ngày sinh: ${data.dateOfBirth}
- Giới tính: ${data.gender}
- Quốc tịch: ${data.nationality}
${data.placeOfResidence ? `- Nơi thường trú: ${data.placeOfResidence}\n` : ''}${data.expiryDate ? `- Có giá trị đến: ${data.expiryDate}\n` : ''}${data.mrzLines ? `- MRZ: ${data.mrzLines.join(' | ')}\n` : ''}
Trích xuất bởi thư viện rn-document-scanner (Nitro Modules)
      `.trim();

      await Share.share({ message: summary });
    } catch (e: any) {
      Alert.alert('Lỗi chia sẻ', e?.message || 'Không thể chia sẻ kết quả');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.container,
          {
            paddingTop: Math.max(insets.top, 16),
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        {/* Header Modal */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.closeBtnText}>✕ Đóng</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Kết Quả Trích Xuất</Text>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.shareBtnText}>Chia sẻ</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Status Badge & Title */}
          <View style={styles.topStatusCard}>
            <View style={styles.docIconBox}>
              <Text style={styles.docIcon}>{isCccd ? '🪪' : '🛂'}</Text>
            </View>
            <View style={styles.statusTextBox}>
              <Text style={styles.docTypeTitle}>
                {isCccd ? 'Căn Cước Công Dân (CCCD)' : 'Hộ Chiếu (Passport)'}
              </Text>
              <View style={styles.verifiedRow}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Đã xác thực & trích xuất thành công</Text>
              </View>
            </View>
          </View>

          {/* Captured Images Preview */}
          <Text style={styles.sectionTitle}>Hình Ảnh Đã Quét</Text>
          <View style={styles.imagesRow}>
            {data.frontImage && (
              <View style={styles.imageItemBox}>
                <Image
                  source={{ uri: data.frontImage.imageUri }}
                  style={styles.thumbImage}
                  resizeMode="cover"
                />
                <Text style={styles.imageItemLabel}>
                  {isCccd ? 'Mặt trước' : 'Trang hộ chiếu'} ({Math.round(data.frontImage.width)}x{Math.round(data.frontImage.height)})
                </Text>
              </View>
            )}
            {data.backImage && (
              <View style={styles.imageItemBox}>
                <Image
                  source={{ uri: data.backImage.imageUri }}
                  style={styles.thumbImage}
                  resizeMode="cover"
                />
                <Text style={styles.imageItemLabel}>
                  Mặt sau ({Math.round(data.backImage.width)}x{Math.round(data.backImage.height)})
                </Text>
              </View>
            )}
          </View>

          {/* Details Table */}
          <Text style={styles.sectionTitle}>Thông Tin Chi Tiết</Text>
          <View style={styles.tableCard}>
            <View style={styles.tableRow}>
              <Text style={styles.tableKey}>Số {isCccd ? 'CCCD / Số thẻ' : 'Hộ chiếu'}:</Text>
              <Text style={[styles.tableVal, styles.highlightVal]}>{data.idNumber}</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.tableRow}>
              <Text style={styles.tableKey}>Họ và tên:</Text>
              <Text style={[styles.tableVal, styles.boldVal]}>{data.fullName.toUpperCase()}</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.tableRow}>
              <Text style={styles.tableKey}>Ngày sinh:</Text>
              <Text style={styles.tableVal}>{data.dateOfBirth}</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.tableRow}>
              <Text style={styles.tableKey}>Giới tính:</Text>
              <Text style={styles.tableVal}>{data.gender}</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.tableRow}>
              <Text style={styles.tableKey}>Quốc tịch:</Text>
              <Text style={styles.tableVal}>{data.nationality}</Text>
            </View>
            <View style={styles.divider} />

            {data.placeOfOrigin && (
              <>
                <View style={styles.tableRow}>
                  <Text style={styles.tableKey}>Quê quán:</Text>
                  <Text style={styles.tableVal}>{data.placeOfOrigin}</Text>
                </View>
                <View style={styles.divider} />
              </>
            )}

            {data.placeOfResidence && (
              <>
                <View style={styles.tableRow}>
                  <Text style={styles.tableKey}>Nơi thường trú:</Text>
                  <Text style={styles.tableVal}>{data.placeOfResidence}</Text>
                </View>
                <View style={styles.divider} />
              </>
            )}

            <View style={styles.tableRow}>
              <Text style={styles.tableKey}>Có giá trị đến:</Text>
              <Text style={styles.tableVal}>{data.expiryDate}</Text>
            </View>

            {data.issueDate && (
              <>
                <View style={styles.divider} />
                <View style={styles.tableRow}>
                  <Text style={styles.tableKey}>Ngày cấp:</Text>
                  <Text style={styles.tableVal}>{data.issueDate}</Text>
                </View>
              </>
            )}
          </View>

          {/* Machine Readable Zone (MRZ) if available */}
          {data.mrzLines && data.mrzLines.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Mã MRZ (Chuẩn ICAO Doc 9303)</Text>
              <View style={styles.mrzBox}>
                {data.mrzLines.map((line, idx) => (
                  <Text key={idx} style={styles.mrzText}>
                    {line}
                  </Text>
                ))}
              </View>
            </>
          )}

          {/* Technical Validation Badges */}
          <Text style={styles.sectionTitle}>Chỉ Số Xác Thực Kỹ Thuật</Text>
          <View style={styles.securityGrid}>
            <View style={styles.securityBadge}>
              <Text style={styles.securityIcon}>
                {data.hasFace ? '👤✅' : '👤⚠️'}
              </Text>
              <Text style={styles.securityTitle}>Khuôn Mặt</Text>
              <Text style={styles.securityStatus}>
                {data.hasFace ? 'Phát hiện chân dung' : 'Chưa nhận diện'}
              </Text>
            </View>

            {data.similarity !== undefined && data.similarity !== null && (
              <View style={styles.securityBadge}>
                <Text style={styles.securityIcon}>
                  {data.similarity < 0.85 ? '🛡️✅' : '⚠️❌'}
                </Text>
                <Text style={styles.securityTitle}>Kiểm Tra 2 Mặt</Text>
                <Text style={styles.securityStatus}>
                  {data.similarity < 0.85
                    ? `Độc lập (${(data.similarity * 100).toFixed(0)}%)`
                    : `Cảnh báo trùng (${(data.similarity * 100).toFixed(0)}%)`}
                </Text>
              </View>
            )}

            <View style={styles.securityBadge}>
              <Text style={styles.securityIcon}>📐✅</Text>
              <Text style={styles.securityTitle}>Khung Viền</Text>
              <Text style={styles.securityStatus}>Auto-Crop chuẩn tỉ lệ</Text>
            </View>
          </View>
        </ScrollView>

        {/* Action Footer */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.retakeBtn} onPress={onRetake}>
            <Text style={styles.retakeBtnText}>Quét lại</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>Hoàn tất</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0c',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1c1c1e',
  },
  closeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#2c2c2e',
    borderRadius: 12,
  },
  closeBtnText: {
    color: '#ff453a',
    fontSize: 13,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  shareBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#007AFF',
    borderRadius: 12,
  },
  shareBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  topStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2c2c2e',
  },
  docIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#2c2c2e',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  docIcon: {
    fontSize: 26,
  },
  statusTextBox: {
    flex: 1,
  },
  docTypeTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34C759',
    marginRight: 6,
  },
  statusText: {
    color: '#34C759',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    color: '#8e8e93',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
  },
  imagesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  imageItemBox: {
    flex: 1,
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2c2c2e',
  },
  thumbImage: {
    width: '100%',
    height: 110,
    backgroundColor: '#000',
  },
  imageItemLabel: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 6,
    backgroundColor: '#1c1c1e',
  },
  tableCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2c2c2e',
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  tableKey: {
    color: '#8e8e93',
    fontSize: 13,
    flex: 1,
  },
  tableVal: {
    color: '#ffffff',
    fontSize: 13,
    flex: 2,
    textAlign: 'right',
    fontWeight: '500',
  },
  highlightVal: {
    color: '#64D2FF',
    fontWeight: 'bold',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  boldVal: {
    fontWeight: 'bold',
    color: '#ffffff',
  },
  divider: {
    height: 1,
    backgroundColor: '#2c2c2e',
  },
  mrzBox: {
    backgroundColor: '#000000',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  mrzText: {
    color: '#34C759',
    fontFamily: 'monospace',
    fontSize: 12,
    letterSpacing: 1.5,
    marginVertical: 2,
  },
  securityGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  securityBadge: {
    flex: 1,
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2c2c2e',
  },
  securityIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  securityTitle: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  securityStatus: {
    color: '#8e8e93',
    fontSize: 10,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1c1c1e',
  },
  retakeBtn: {
    flex: 1,
    backgroundColor: '#2c2c2e',
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
  },
  retakeBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  doneBtn: {
    flex: 1.5,
    backgroundColor: '#34C759',
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
