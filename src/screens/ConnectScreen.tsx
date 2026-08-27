import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import {
  QrCode,
  ArrowRight,
  Server,
  Trash2,
  Clock,
  Sparkles,
  ClipboardPaste,
  ShieldCheck,
  Smartphone,
  CheckCircle2,
} from 'lucide-react-native';
import { QRScannerModal } from '../components/QRScannerModal';
import { StorageService } from '../services/StorageService';
import { RemoteDevice, AppSettings } from '../types';

interface ConnectScreenProps {
  onConnect: (device: RemoteDevice) => void;
}

export const ConnectScreen: React.FC<ConnectScreenProps> = ({ onConnect }) => {
  const [inputUrl, setInputUrl] = useState('');
  const [devices, setDevices] = useState<RemoteDevice[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    autoConnectLastDevice: true,
    keepAwakeEnabled: true,
    hapticFeedback: true,
    desktopMode: false,
  });
  const [scannerVisible, setScannerVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [storedDevices, storedSettings] = await Promise.all([
        StorageService.getDevices(),
        StorageService.getSettings(),
      ]);
      setDevices(storedDevices);
      setSettings(storedSettings);
    } catch (e) {
      console.error('Error loading initial data:', e);
    }
  };

  const triggerHaptic = (style = Haptics.ImpactFeedbackStyle.Medium) => {
    try {
      if (settings.hapticFeedback) {
        Haptics.impactAsync(style);
      }
    } catch {
      // Ignore
    }
  };

  const handleConnectWithUrl = async (rawInput: string, customName?: string) => {
    if (!rawInput || !rawInput.trim()) {
      Alert.alert('Chưa có thông tin', 'Vui lòng quét mã QR hoặc dán link/tên Remote Server.');
      return;
    }

    triggerHaptic();
    setLoading(true);

    try {
      const parsed = StorageService.parseRemoteInput(rawInput);
      const savedDevice = await StorageService.saveDevice({
        name: customName || parsed.deviceName,
        url: parsed.url,
      });

      // Reload devices list in background
      loadData();
      onConnect(savedDevice);
    } catch (e: any) {
      Alert.alert('Lỗi kết nối', e.message || 'Không thể lưu thông tin kết nối.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasteFromClipboard = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    try {
      const text = await Clipboard.getStringAsync();
      if (text && text.trim()) {
        setInputUrl(text.trim());
      } else {
        Alert.alert('Bộ nhớ tạm trống', 'Hãy sao chép link Remote Control trước khi dán.');
      }
    } catch {
      // Ignore
    }
  };

  const handleScanSuccess = (scannedData: string) => {
    setInputUrl(scannedData);
    handleConnectWithUrl(scannedData);
  };

  const handleDeleteDevice = (id: string, name: string) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert('Xoá thiết bị', `Bạn có chắc muốn xoá "${name}" khỏi lịch sử?`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: async () => {
          await StorageService.deleteDevice(id);
          loadData();
        },
      },
    ]);
  };

  const handleToggleAutoConnect = async (value: boolean) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    const updated = await StorageService.saveSettings({ autoConnectLastDevice: value });
    setSettings(updated);
  };

  const formatTimeAgo = (timestamp: number) => {
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    return `${Math.floor(diff / 86400)} ngày trước`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Brand */}
          <View style={styles.header}>
            <View style={styles.badgeRow}>
              <View style={styles.statusBadge}>
                <Sparkles color="#00f2fe" size={13} />
                <Text style={styles.statusBadgeText}>AI Remote Client</Text>
              </View>
            </View>
            <Text style={styles.mainTitle}>Antigravity Remote</Text>
            <Text style={styles.subtitle}>
              Điều khiển & tương tác trực tiếp với Agent trên màn hình iPhone
            </Text>
          </View>

          {/* Big Action: Scan QR Button */}
          <TouchableOpacity
            style={styles.scanCard}
            onPress={() => {
              triggerHaptic();
              setScannerVisible(true);
            }}
            activeOpacity={0.85}
          >
            <View style={styles.scanIconContainer}>
              <QrCode color="#030712" size={32} />
            </View>
            <View style={styles.scanTextContainer}>
              <Text style={styles.scanCardTitle}>Quét mã QR Remote Control</Text>
              <Text style={styles.scanCardSubtitle}>
                Chĩa camera vào mã QR hiển thị trên máy tính
              </Text>
            </View>
            <ArrowRight color="#030712" size={22} />
          </TouchableOpacity>

          {/* Manual Input Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Hoặc dán Link / Device Name</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="win-1vlvsl2a1b9-... hoặc https://..."
                placeholderTextColor="#64748b"
                value={inputUrl}
                onChangeText={setInputUrl}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.pasteButton}
                onPress={handlePasteFromClipboard}
                activeOpacity={0.7}
              >
                <ClipboardPaste color="#94a3b8" size={18} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.connectBtn,
                !inputUrl.trim() ? styles.connectBtnDisabled : null,
              ]}
              onPress={() => handleConnectWithUrl(inputUrl)}
              disabled={!inputUrl.trim() || loading}
              activeOpacity={0.8}
            >
              <Text style={styles.connectBtnText}>
                {loading ? 'Đang kết nối...' : 'Kết nối ngay'}
              </Text>
              <ArrowRight color="#ffffff" size={18} />
            </TouchableOpacity>
          </View>

          {/* Preferences Box */}
          <View style={styles.settingsCard}>
            <View style={styles.settingsRow}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.settingLabel}>Tự động kết nối lại</Text>
                <Text style={styles.settingDesc}>
                  Mở app là vào thẳng phiên làm việc gần nhất
                </Text>
              </View>
              <Switch
                value={settings.autoConnectLastDevice}
                onValueChange={handleToggleAutoConnect}
                trackColor={{ false: '#334155', true: '#0284c7' }}
                thumbColor={settings.autoConnectLastDevice ? '#38bdf8' : '#94a3b8'}
              />
            </View>
          </View>

          {/* Saved / Recent Devices */}
          {devices.length > 0 && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Server color="#38bdf8" size={18} />
                <Text style={styles.sectionTitle}>Thiết bị đã lưu ({devices.length})</Text>
              </View>

              {devices.map((device) => (
                <View key={device.id} style={styles.deviceItem}>
                  <TouchableOpacity
                    style={styles.deviceInfoArea}
                    onPress={() => {
                      triggerHaptic();
                      StorageService.setLastConnectedDevice(device);
                      onConnect(device);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.deviceIconBox}>
                      <Smartphone color="#00f2fe" size={20} />
                    </View>
                    <View style={styles.deviceDetails}>
                      <Text style={styles.deviceName} numberOfLines={1}>
                        {device.name}
                      </Text>
                      <View style={styles.deviceMetaRow}>
                        <Clock color="#64748b" size={12} />
                        <Text style={styles.deviceTime}>
                          {formatTimeAgo(device.lastConnectedAt)}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteDevice(device.id, device.name)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Trash2 color="#ef4444" size={18} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Quick Guide */}
          <View style={styles.guideCard}>
            <View style={styles.guideHeader}>
              <ShieldCheck color="#22c55e" size={18} />
              <Text style={styles.guideTitle}>Hướng dẫn kích hoạt Remote Control</Text>
            </View>
            <View style={styles.stepRow}>
              <CheckCircle2 color="#38bdf8" size={15} style={styles.stepIcon} />
              <Text style={styles.stepText}>
                1. Mở Antigravity trên máy tính, bật công tắc <Text style={styles.bold}>Enable Remote Control</Text>.
              </Text>
            </View>
            <View style={styles.stepRow}>
              <CheckCircle2 color="#38bdf8" size={15} style={styles.stepIcon} />
              <Text style={styles.stepText}>
                2. Nhấn nút <Text style={styles.bold}>Quét mã QR</Text> ở trên và hướng camera vào mã QR trên màn hình.
              </Text>
            </View>
            <View style={styles.stepRow}>
              <CheckCircle2 color="#38bdf8" size={15} style={styles.stepIcon} />
              <Text style={styles.stepText}>
                3. App sẽ ghi nhớ thiết bị để lần sau bạn không cần quét lại nữa!
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* QR Scanner Modal */}
      <QRScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScanSuccess={handleScanSuccess}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1d',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
    marginTop: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 242, 254, 0.12)',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.3)',
    gap: 6,
  },
  statusBadgeText: {
    color: '#00f2fe',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
  },
  scanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00f2fe',
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#00f2fe',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  scanIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  scanTextContainer: {
    flex: 1,
  },
  scanCardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#030712',
    marginBottom: 3,
  },
  scanCardSubtitle: {
    fontSize: 12,
    color: '#1e293b',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#131b2e',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0f1d',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  textInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    paddingVertical: 12,
  },
  pasteButton: {
    padding: 8,
  },
  connectBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  connectBtnDisabled: {
    backgroundColor: '#1e293b',
    opacity: 0.6,
  },
  connectBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  settingsCard: {
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 20,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: 12,
    color: '#94a3b8',
  },
  sectionContainer: {
    marginBottom: 22,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#cbd5e1',
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 10,
  },
  deviceInfoArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 242, 254, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  deviceDetails: {
    flex: 1,
  },
  deviceName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 4,
  },
  deviceMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deviceTime: {
    fontSize: 11,
    color: '#64748b',
  },
  deleteBtn: {
    padding: 8,
    marginLeft: 6,
  },
  guideCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  guideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  guideTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4ade80',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  stepIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  stepText: {
    flex: 1,
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 18,
  },
  bold: {
    color: '#f1f5f9',
    fontWeight: '700',
  },
});
