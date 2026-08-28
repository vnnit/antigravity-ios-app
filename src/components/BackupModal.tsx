import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import {
  X,
  Cloud,
  CloudUpload,
  CloudDownload,
  Copy,
  ClipboardPaste,
  ShieldCheck,
  CheckCircle2,
  Key,
  RefreshCw,
  Sparkles,
} from 'lucide-react-native';
import { StorageService } from '../services/StorageService';

interface BackupModalProps {
  visible: boolean;
  onClose: () => void;
  onDataRestored: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  visible,
  onClose,
  onDataRestored,
}) => {
  const [token, setToken] = useState('');
  const [backupCodeInput, setBackupCodeInput] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [autoCloudSync, setAutoCloudSync] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'cloud' | 'local'>('cloud');

  useEffect(() => {
    if (visible) {
      loadInitialSyncInfo();
    }
  }, [visible]);

  const loadInitialSyncInfo = async () => {
    try {
      const [savedToken, lastSync, settings] = await Promise.all([
        StorageService.getCloudToken(),
        StorageService.getLastSyncTime(),
        StorageService.getSettings(),
      ]);
      if (savedToken) setToken(savedToken);
      setLastSyncTime(lastSync);
      setAutoCloudSync(!!settings.autoCloudSync);
    } catch {
      // Ignore
    }
  };

  const triggerHaptic = (style = Haptics.ImpactFeedbackStyle.Light) => {
    try {
      Haptics.impactAsync(style);
    } catch {
      // Ignore
    }
  };

  const handleUploadToCloud = async () => {
    if (!token.trim()) {
      Alert.alert('Chưa có Token', 'Vui lòng nhập hoặc dán GitHub Personal Access Token để đồng bộ.');
      return;
    }

    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      const result = await StorageService.syncToGitHubGist(token.trim());
      setLastSyncTime(Date.now());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Đã sao lưu lên Đám mây 🎉',
        `Đã lưu trữ an toàn ${result.count} thiết bị vào tài khoản GitHub của bạn.`
      );
    } catch (e: any) {
      Alert.alert('Lỗi sao lưu', e.message || 'Không thể kết nối với GitHub Gist.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreFromCloud = async () => {
    if (!token.trim()) {
      Alert.alert('Chưa có Token', 'Vui lòng nhập GitHub Token của bạn để tải dữ liệu về.');
      return;
    }

    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      const result = await StorageService.syncFromGitHubGist(token.trim());
      setLastSyncTime(Date.now());
      onDataRestored();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Khôi phục thành công! 🚀',
        `Đã nạp lại ${result.devicesCount} thiết bị từ bản sao lưu đám mây gần nhất.`
      );
    } catch (e: any) {
      Alert.alert('Lỗi khôi phục', e.message || 'Không thể tải bản sao lưu từ GitHub.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasteToken = async () => {
    triggerHaptic();
    try {
      const text = await Clipboard.getStringAsync();
      if (text && text.trim()) {
        setToken(text.trim());
      }
    } catch {
      // Ignore
    }
  };

  const handleToggleAutoSync = async (val: boolean) => {
    triggerHaptic();
    setAutoCloudSync(val);
    await StorageService.saveSettings({ autoCloudSync: val });
  };

  const handleExportBackupCode = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const code = await StorageService.exportBackupString();
      await Clipboard.setStringAsync(code);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Đã sao chép mã sao lưu! 📋',
        'Mã sao lưu đã được lưu vào bộ nhớ tạm (Clipboard). Bạn có thể dán vào Ghi chú / Zalo để lưu trữ lâu dài.'
      );
    } catch (e: any) {
      Alert.alert('Lỗi xuất mã', e.message || 'Không thể tạo mã sao lưu.');
    }
  };

  const handleImportBackupCode = async () => {
    if (!backupCodeInput.trim()) {
      Alert.alert('Chưa có mã', 'Vui lòng dán mã sao lưu (bắt đầu bằng AG_BACKUP:...) vào ô bên dưới.');
      return;
    }

    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await StorageService.importBackup(backupCodeInput.trim());
      onDataRestored();
      setBackupCodeInput('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Thành công! 🎉', `Đã phục hồi ${result.devicesCount} thiết bị từ mã sao lưu.`);
    } catch (e: any) {
      Alert.alert('Mã không hợp lệ', e.message || 'Không thể giải mã dữ liệu sao lưu.');
    }
  };

  const handlePasteBackupCode = async () => {
    triggerHaptic();
    try {
      const text = await Clipboard.getStringAsync();
      if (text && text.trim()) {
        setBackupCodeInput(text.trim());
      }
    } catch {
      // Ignore
    }
  };

  const formatLastSync = (ts: number | null) => {
    if (!ts) return 'Chưa từng sao lưu';
    const d = new Date(ts);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />

        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Cloud color="#00f2fe" size={22} />
            <Text style={styles.headerTitle}>Sao lưu & Khôi phục</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X color="#94a3b8" size={20} />
          </TouchableOpacity>
        </View>

        {/* Tab Selection */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'cloud' && styles.activeTabButton]}
            onPress={() => {
              triggerHaptic();
              setActiveTab('cloud');
            }}
          >
            <Cloud color={activeTab === 'cloud' ? '#00f2fe' : '#64748b'} size={16} />
            <Text style={[styles.tabText, activeTab === 'cloud' && styles.activeTabText]}>
              Đám mây GitHub
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'local' && styles.activeTabButton]}
            onPress={() => {
              triggerHaptic();
              setActiveTab('local');
            }}
          >
            <Key color={activeTab === 'local' ? '#00f2fe' : '#64748b'} size={16} />
            <Text style={[styles.tabText, activeTab === 'local' && styles.activeTabText]}>
              Mã sao lưu nhanh
            </Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {activeTab === 'cloud' ? (
              <>
                {/* Info Card */}
                <View style={styles.infoCard}>
                  <View style={styles.infoRow}>
                    <Sparkles color="#38bdf8" size={18} />
                    <Text style={styles.infoTitle}>Tự động lưu vĩnh viễn</Text>
                  </View>
                  <Text style={styles.infoDesc}>
                    Lưu lịch sử thiết bị vào mục Gist riêng tư trên GitHub của bạn. Khi cài lại app hoặc đổi máy, chỉ cần nhập Token là tải lại toàn bộ!
                  </Text>
                  <Text style={styles.syncMetaText}>
                    Lần đồng bộ gần nhất: <Text style={styles.syncMetaBold}>{formatLastSync(lastSyncTime)}</Text>
                  </Text>
                </View>

                {/* Token Input */}
                <View style={styles.section}>
                  <Text style={styles.inputLabel}>GitHub Personal Access Token</Text>
                  <View style={styles.inputBox}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="ghp_xxxxxxxxxxxx..."
                      placeholderTextColor="#64748b"
                      value={token}
                      onChangeText={setToken}
                      autoCapitalize="none"
                      autoCorrect={false}
                      secureTextEntry={false}
                    />
                    <TouchableOpacity style={styles.pasteIconBtn} onPress={handlePasteToken}>
                      <ClipboardPaste color="#94a3b8" size={18} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Auto Cloud Sync Switch */}
                <View style={styles.switchRow}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={styles.switchLabel}>Tự động sao lưu</Text>
                    <Text style={styles.switchDesc}>
                      Tự cập nhật lên Đám mây khi bạn quét thêm thiết bị mới
                    </Text>
                  </View>
                  <Switch
                    value={autoCloudSync}
                    onValueChange={handleToggleAutoSync}
                    trackColor={{ false: '#334155', true: '#0284c7' }}
                    thumbColor={autoCloudSync ? '#38bdf8' : '#94a3b8'}
                  />
                </View>

                {/* Action Buttons */}
                <View style={styles.actionGrid}>
                  <TouchableOpacity
                    style={[styles.primaryActionBtn, styles.uploadBtn]}
                    onPress={handleUploadToCloud}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <>
                        <CloudUpload color="#ffffff" size={18} />
                        <Text style={styles.primaryBtnText}>Lưu lên Đám mây</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.primaryActionBtn, styles.downloadBtn]}
                    onPress={handleRestoreFromCloud}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#00f2fe" size="small" />
                    ) : (
                      <>
                        <CloudDownload color="#00f2fe" size={18} />
                        <Text style={styles.downloadBtnText}>Tải về & Khôi phục</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                {/* Local Backup Section */}
                <View style={styles.infoCard}>
                  <View style={styles.infoRow}>
                    <ShieldCheck color="#4ade80" size={18} />
                    <Text style={styles.infoTitle}>Sao lưu dạng văn bản</Text>
                  </View>
                  <Text style={styles.infoDesc}>
                    Xuất toàn bộ danh sách thiết bị thành một đoạn mã nén. Bạn có thể lưu vào Apple Notes hoặc gửi qua Zalo/Telegram.
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.exportFullBtn}
                  onPress={handleExportBackupCode}
                >
                  <Copy color="#030712" size={18} />
                  <Text style={styles.exportFullBtnText}>Sao chép toàn bộ mã sao lưu</Text>
                </TouchableOpacity>

                <View style={styles.dividerBox}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>HOẶC KHÔI PHỤC TỪ MÃ</Text>
                  <View style={styles.dividerLine} />
                </View>

                <View style={styles.section}>
                  <Text style={styles.inputLabel}>Dán mã sao lưu vào đây</Text>
                  <View style={styles.inputBox}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="AG_BACKUP:v1:..."
                      placeholderTextColor="#64748b"
                      value={backupCodeInput}
                      onChangeText={setBackupCodeInput}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity style={styles.pasteIconBtn} onPress={handlePasteBackupCode}>
                      <ClipboardPaste color="#94a3b8" size={18} />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.restoreFromCodeBtn,
                      !backupCodeInput.trim() && styles.disabledBtn,
                    ]}
                    onPress={handleImportBackupCode}
                    disabled={!backupCodeInput.trim()}
                  >
                    <RefreshCw color="#ffffff" size={16} />
                    <Text style={styles.primaryBtnText}>Khôi phục ngay</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1d',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  closeBtn: {
    padding: 6,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 10,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 6,
  },
  activeTabButton: {
    backgroundColor: 'rgba(0, 242, 254, 0.12)',
    borderColor: 'rgba(0, 242, 254, 0.4)',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  activeTabText: {
    color: '#00f2fe',
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  infoCard: {
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 18,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
  },
  infoDesc: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 19,
    marginBottom: 10,
  },
  syncMetaText: {
    fontSize: 12,
    color: '#64748b',
  },
  syncMetaBold: {
    color: '#38bdf8',
    fontWeight: '600',
  },
  section: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#cbd5e1',
    marginBottom: 8,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0f1d',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
  },
  textInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    paddingVertical: 12,
  },
  pasteIconBtn: {
    padding: 8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#131b2e',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 2,
  },
  switchDesc: {
    fontSize: 12,
    color: '#94a3b8',
  },
  actionGrid: {
    flexDirection: 'column',
    gap: 12,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  uploadBtn: {
    backgroundColor: '#2563eb',
  },
  downloadBtn: {
    backgroundColor: 'rgba(0, 242, 254, 0.1)',
    borderWidth: 1,
    borderColor: '#00f2fe',
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  downloadBtnText: {
    color: '#00f2fe',
    fontSize: 15,
    fontWeight: '700',
  },
  exportFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00f2fe',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginBottom: 16,
  },
  exportFullBtnText: {
    color: '#030712',
    fontSize: 15,
    fontWeight: '700',
  },
  dividerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  dividerText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '700',
    paddingHorizontal: 10,
    letterSpacing: 0.5,
  },
  restoreFromCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284c7',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginTop: 10,
  },
  disabledBtn: {
    opacity: 0.5,
  },
});
