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
  Folder,
} from 'lucide-react-native';
import { QRScannerModal } from '../components/QRScannerModal';
import { BackupModal } from '../components/BackupModal';
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
  const [backupModalVisible, setBackupModalVisible] = useState(false);
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
      console.error('Error loading data:', e);
    }
  };

  const triggerHaptic = (style = Haptics.ImpactFeedbackStyle.Light) => {
    if (settings.hapticFeedback) {
      try {
        Haptics.impactAsync(style);
      } catch {
        // Ignore
      }
    }
  };

  const handleScanSuccess = async (scannedText: string) => {
    setScannerVisible(false);
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);

    const clean = scannedText.trim();

    // If scanned a Backup QR Code
    if (clean.startsWith('AG_BACKUP:v1:')) {
      try {
        const importRes = await StorageService.importBackup(clean);
        await loadData();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Khôi phục thành công! 🎉', `Đã phục hồi ${importRes.devicesCount} thiết bị từ mã QR.`);
        return;
      } catch (e: any) {
        Alert.alert('Lỗi mã sao lưu', e.message);
        return;
      }
    }

    try {
      const parsed = StorageService.parseRemoteInput(clean);
      const savedDevice = await StorageService.saveDevice({
        name: parsed.deviceName || 'Remote Server',
        url: parsed.url,
      });

      await loadData();
      onConnect(savedDevice);
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể lưu thiết bị này.');
    }
  };

  const handleConnectWithUrl = async (rawInput: string, customName?: string) => {
    if (!rawInput || !rawInput.trim()) {
      Alert.alert('Chưa có thông tin', 'Vui lòng quét mã QR hoặc dán link/tên Remote Server.');
      return;
    }

    const clean = rawInput.trim();

    // Check if user pasted a backup string
    if (clean.startsWith('AG_BACKUP:v1:')) {
      try {
        triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
        const importRes = await StorageService.importBackup(clean);
        await loadData();
        setInputUrl('');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Khôi phục thành công! 🎉', `Đã phục hồi ${importRes.devicesCount} thiết bị từ mã sao lưu.`);
        return;
      } catch (e: any) {
        Alert.alert('Lỗi mã sao lưu', e.message || 'Không thể giải mã dữ liệu.');
        return;
      }
    }

    triggerHaptic();
    setLoading(true);

    try {
      const parsed = StorageService.parseRemoteInput(clean);
      const savedDevice = await StorageService.saveDevice({
        name: customName || parsed.deviceName,
        url: parsed.url,
      });

      // Reload devices list in background
      await loadData();
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
        const clean = text.trim();
        setInputUrl(clean);
        if (clean.startsWith('AG_BACKUP:v1:')) {
          Alert.alert(
            'Phát hiện mã sao lưu 📋',
            'Bạn vừa dán mã sao lưu dữ liệu. Nhấn "Khôi phục dữ liệu ngay" để nạp lại toàn bộ thiết bị!',
            [{ text: 'Đồng ý' }]
          );
        }
      } else {
        Alert.alert('Bộ nhớ tạm trống', 'Hãy sao chép link Remote Control hoặc mã sao lưu trước khi dán.');
      }
    } catch {
      // Ignore
    }
  };

  const handleDeleteDevice = (id: string, name: string) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Xóa thiết bị',
      `Bạn có chắc chắn muốn xóa "${name}" khỏi lịch sử kết nối không?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            await StorageService.deleteDevice(id);
            await loadData();
          },
        },
      ]
    );
  };

  const handleToggleAutoConnect = async (value: boolean) => {
    triggerHaptic();
    const updated = await StorageService.saveSettings({ autoConnectLastDevice: value });
    setSettings(updated);
  };

  const handleToggleKeepAwake = async (value: boolean) => {
    triggerHaptic();
    const updated = await StorageService.saveSettings({ keepAwakeEnabled: value });
    setSettings(updated);
  };

  const handleToggleHaptic = async (value: boolean) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    const updated = await StorageService.saveSettings({ hapticFeedback: value });
    setSettings(updated);
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Vừa mới xong';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
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

              {/* Local Files Header Button */}
              <TouchableOpacity
                style={styles.headerBackupBtn}
                onPress={() => {
                  triggerHaptic();
                  setBackupModalVisible(true);
                }}
                activeOpacity={0.8}
              >
                <Folder color="#00f2fe" size={14} />
                <Text style={styles.headerBackupBtnText}>Tệp lưu trữ (Files)</Text>
              </TouchableOpacity>
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
            <Text style={styles.cardTitle}>Hoặc dán Link / Device Name / Mã sao lưu</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="win-1vlvsl2a1b9-..., https://... hoặc AG_BACKUP:..."
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
                styles.primaryButton,
                !inputUrl.trim() && styles.disabledButton,
              ]}
              onPress={() => handleConnectWithUrl(inputUrl)}
              disabled={!inputUrl.trim() || loading}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>
                {inputUrl.trim().startsWith('AG_BACKUP:v1:') ? 'Khôi phục dữ liệu ngay' : 'Kết nối ngay'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Recent Devices History */}
          {devices.length > 0 ? (
            <View style={styles.historySection}>
              <View style={styles.historyHeader}>
                <View style={styles.historyTitleRow}>
                  <Server color="#94a3b8" size={16} />
                  <Text style={styles.sectionTitle}>Lịch sử thiết bị ({devices.length})</Text>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    triggerHaptic();
                    setBackupModalVisible(true);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.quickBackupLink}>Quản lý Tệp (Files)</Text>
                </TouchableOpacity>
              </View>

              {devices.map((device) => (
                <View key={device.id} style={styles.deviceItem}>
                  <TouchableOpacity
                    style={styles.deviceTouchable}
                    onPress={() => {
                      triggerHaptic();
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
          ) : (
            /* Empty State with Files Restore Prompt */
            <TouchableOpacity
              style={styles.restorePromptCard}
              onPress={() => {
                triggerHaptic();
                setBackupModalVisible(true);
              }}
              activeOpacity={0.8}
            >
              <View style={styles.restorePromptIcon}>
                <Folder color="#00f2fe" size={24} />
              </View>
              <View style={styles.restorePromptTextContainer}>
                <Text style={styles.restorePromptTitle}>Đã cài lại app hoặc cập nhật?</Text>
                <Text style={styles.restorePromptDesc}>
                  Nhấn vào đây để nạp lại toàn bộ thiết bị từ thư mục "Trên iPhone &gt; Antigravity"!
                </Text>
              </View>
              <ArrowRight color="#00f2fe" size={18} />
            </TouchableOpacity>
          )}

          {/* Settings Section */}
          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>Tùy chọn ứng dụng</Text>

            <View style={styles.settingItem}>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Tự động kết nối lần sau</Text>
                <Text style={styles.settingDesc}>
                  Tự động mở máy tính kết nối gần nhất khi khởi động app
                </Text>
              </View>
              <Switch
                value={settings.autoConnectLastDevice}
                onValueChange={handleToggleAutoConnect}
                trackColor={{ false: '#334155', true: '#0284c7' }}
                thumbColor={settings.autoConnectLastDevice ? '#38bdf8' : '#94a3b8'}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Giữ màn hình luôn sáng</Text>
                <Text style={styles.settingDesc}>
                  Không tự tắt màn hình khi đang trong phiên điều khiển
                </Text>
              </View>
              <Switch
                value={settings.keepAwakeEnabled}
                onValueChange={handleToggleKeepAwake}
                trackColor={{ false: '#334155', true: '#0284c7' }}
                thumbColor={settings.keepAwakeEnabled ? '#38bdf8' : '#94a3b8'}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Rung phản hồi (Haptics)</Text>
                <Text style={styles.settingDesc}>
                  Tạo cảm giác rung nhẹ khi nhấn nút hoặc quét mã thành công
                </Text>
              </View>
              <Switch
                value={settings.hapticFeedback}
                onValueChange={handleToggleHaptic}
                trackColor={{ false: '#334155', true: '#0284c7' }}
                thumbColor={settings.hapticFeedback ? '#38bdf8' : '#94a3b8'}
              />
            </View>
          </View>

          {/* Quick Guide */}
          <View style={styles.guideCard}>
            <View style={styles.guideHeader}>
              <ShieldCheck color="#22c55e" size={18} />
              <Text style={styles.guideTitle}>Lưu trữ tự động trong Tệp iPhone</Text>
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
                3. App tự động tạo file <Text style={styles.bold}>antigravity_history.json</Text> trong thư mục <Text style={styles.bold}>Trên iPhone &gt; Antigravity</Text> để tự nạp lại khi cài lại app!
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

      {/* Local Files Backup & Restore Modal */}
      <BackupModal
        visible={backupModalVisible}
        onClose={() => setBackupModalVisible(false)}
        onDataRestored={loadData}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 242, 254, 0.12)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.3)',
    gap: 6,
  },
  statusBadgeText: {
    color: '#00f2fe',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerBackupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.3)',
    gap: 6,
  },
  headerBackupBtnText: {
    color: '#00f2fe',
    fontSize: 12,
    fontWeight: '700',
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '900',
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
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  scanIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(3, 7, 18, 0.12)',
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
    color: 'rgba(3, 7, 18, 0.75)',
    lineHeight: 16,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#131b2e',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#cbd5e1',
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
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#1e293b',
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  historySection: {
    marginBottom: 24,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  historyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: 0.2,
  },
  quickBackupLink: {
    fontSize: 13,
    color: '#38bdf8',
    fontWeight: '600',
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  deviceTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 242, 254, 0.1)',
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
    color: '#ffffff',
    marginBottom: 2,
  },
  deviceMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deviceTime: {
    fontSize: 12,
    color: '#64748b',
  },
  deleteBtn: {
    padding: 8,
    marginLeft: 6,
  },
  restorePromptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.25)',
    marginBottom: 24,
    gap: 12,
  },
  restorePromptIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 242, 254, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  restorePromptTextContainer: {
    flex: 1,
  },
  restorePromptTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 2,
  },
  restorePromptDesc: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 16,
  },
  settingsSection: {
    backgroundColor: '#131b2e',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 24,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  settingTextContainer: {
    flex: 1,
    paddingRight: 12,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: 12,
    color: '#94a3b8',
  },
  guideCard: {
    backgroundColor: 'rgba(19, 27, 46, 0.5)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  guideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  guideTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#22c55e',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  stepIcon: {
    marginTop: 2,
    marginRight: 8,
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
  },
  bold: {
    color: '#f8fafc',
    fontWeight: '700',
  },
});
