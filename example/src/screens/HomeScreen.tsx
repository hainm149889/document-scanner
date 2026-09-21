import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import {
  DocumentScannerNative,
  RNDocumentScannerVersion,
} from 'rn-document-scanner';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface HomeScreenProps {
  onNavigate: (screen: 'cccd' | 'passport' | 'custom') => void;
}

export function HomeScreen({ onNavigate }: HomeScreenProps) {
  const insets = useSafeAreaInsets();
  const [nativeVersion, setNativeVersion] = useState<string>('Đang tải...');

  const handlePing = () => {
    try {
      const response = DocumentScannerNative.ping('Ping từ React Native UI');
      Alert.alert('Kết nối Nitro Modules', response);
    } catch (error: any) {
      Alert.alert('Lỗi', error?.message || 'Không thể ping Native Engine');
    }
  };

  const handleCleanCache = async () => {
    try {
      const success = await DocumentScannerNative.cleanCache();
      if (success) {
        Alert.alert('Thành công', 'Đã dọn dẹp các file ảnh tạm (.jpg) trong thư mục cache!');
      } else {
        Alert.alert('Thông báo', 'Không có file tạm hoặc thư mục cache đã sạch.');
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error?.message || 'Dọn cache thất bại');
    }
  };

  useEffect(() => {
    try {
      const version = DocumentScannerNative.getNativeVersion();
      setNativeVersion(version);
    } catch (e) {
      console.warn('Get version error', e);
    }
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Math.max(insets.top, 16),
          paddingBottom: Math.max(insets.bottom + 16, 24),
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerIcon}>📄📷</Text>
        <Text style={styles.title}>rn-document-scanner</Text>
        <Text style={styles.subtitle}>
          v{RNDocumentScannerVersion} | Nitro Modules JSI
        </Text>
      </View>

      {/* System Status Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Thông tin Native Engine</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Engine:</Text>
          <Text style={styles.infoValue} numberOfLines={1}>
            {nativeVersion}
          </Text>
        </View>

        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.smallButton} onPress={handlePing}>
            <Text style={styles.smallButtonText}>Test Ping Native</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.smallButton, styles.cleanBtn]} onPress={handleCleanCache}>
            <Text style={styles.smallButtonText}>🧹 Dọn Cache</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Navigation Feature Cards */}
      <Text style={styles.sectionHeader}>Chọn Quy Trình Quét Giấy Tờ</Text>

      {/* 1. CCCD Flow */}
      <TouchableOpacity
        style={[styles.flowCard, styles.cardCccd]}
        onPress={() => onNavigate('cccd')}
        activeOpacity={0.8}
      >
        <View style={styles.flowIconBox}>
          <Text style={styles.flowIcon}>🪪</Text>
        </View>
        <View style={styles.flowContent}>
          <Text style={styles.flowTitle}>1. Quét CCCD / CMND (2 Mặt)</Text>
          <Text style={styles.flowDesc}>
            Luồng eKYC hoàn chỉnh: Mặt trước (check chân dung) → Mặt sau (check trùng lặp dHash 64-bit) → Xem lại & Phân tích.
          </Text>
          <View style={styles.tagRow}>
            <Text style={styles.tag}>2 Bước</Text>
            <Text style={styles.tag}>Face Detection</Text>
            <Text style={styles.tag}>Duplicate Check</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* 2. Passport Flow */}
      <TouchableOpacity
        style={[styles.flowCard, styles.cardPassport]}
        onPress={() => onNavigate('passport')}
        activeOpacity={0.8}
      >
        <View style={styles.flowIconBox}>
          <Text style={styles.flowIcon}>🛂</Text>
        </View>
        <View style={styles.flowContent}>
          <Text style={styles.flowTitle}>2. Quét Hộ Chiếu (Passport)</Text>
          <Text style={styles.flowDesc}>
            Tự động căn chỉnh theo tỷ lệ khung 1.42 chuẩn ICAO: Chụp trang thông tin → Xem lại ảnh → Phân tích thông tin.
          </Text>
          <View style={styles.tagRow}>
            <Text style={styles.tag}>1 Bước</Text>
            <Text style={styles.tag}>Khung 1.42</Text>
            <Text style={styles.tag}>Auto-Crop</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* 3. Custom / Single Scanner Flow */}
      <TouchableOpacity
        style={[styles.flowCard, styles.cardCustom]}
        onPress={() => onNavigate('custom')}
        activeOpacity={0.8}
      >
        <View style={styles.flowIconBox}>
          <Text style={styles.flowIcon}>⚙️</Text>
        </View>
        <View style={styles.flowContent}>
          <Text style={styles.flowTitle}>3. Tùy Biến / Chụp Đơn Lẻ</Text>
          <Text style={styles.flowDesc}>
            Thử nghiệm bật/tắt từng tính năng: Auto-Crop, Nắn góc nghiêng (Perspective), Bật Flash và kiểm tra ảnh nguyên bản.
          </Text>
          <View style={styles.tagRow}>
            <Text style={styles.tag}>Perspective Transform</Text>
            <Text style={styles.tag}>Flash Torch</Text>
          </View>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0c',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginVertical: 16,
  },
  headerIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 13,
    color: '#8e8e93',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2c2c2e',
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLabel: {
    color: '#8e8e93',
    fontSize: 13,
  },
  infoValue: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '500',
    maxWidth: '65%',
  },
  textSuccess: {
    color: '#34C759',
  },
  textWarning: {
    color: '#FF9500',
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 8,
  },
  smallButton: {
    flex: 1,
    backgroundColor: '#2c2c2e',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  cleanBtn: {
    backgroundColor: '#3a3a3c',
  },
  smallButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  sectionHeader: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  flowCard: {
    flexDirection: 'row',
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#2c2c2e',
    alignItems: 'center',
  },
  cardCccd: {
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  cardPassport: {
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
  },
  cardCustom: {
    borderLeftWidth: 4,
    borderLeftColor: '#AF52DE',
  },
  flowIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2c2c2e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  flowIcon: {
    fontSize: 24,
  },
  flowContent: {
    flex: 1,
  },
  flowTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  flowDesc: {
    color: '#8e8e93',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: '#2c2c2e',
    color: '#64D2FF',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
});
