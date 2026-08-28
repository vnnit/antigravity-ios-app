import React, { useState } from 'react';
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
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import {
  X,
  HardDrive,
  Copy,
  ClipboardPaste,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  FileText,
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
  const [backupCodeInput, setBackupCodeInput] = useState('');

  const triggerHaptic = (style = Haptics.ImpactFeedbackStyle.Light) => {
    try {
      Haptics.impactAsync(style);
    } catch {
      // Ignore
    }
  };

  const handleExportBackupCode = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const code = await StorageService.exportBackupString();
      await Clipboard.setStringAsync(code);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Đã sao chép mã sao lưu! 📋',
        'Toàn bộ lịch sử thiết bị đã được copy vào bộ nhớ tạm. Bạn có thể dán vào ứng dụng Ghi chú (Apple Notes) để lưu trữ.'
      );
    } catch (e: any) {
      Alert.alert('Lỗi xuất mã', e.message || 'Không thể tạo mã sao lưu.');
    }
  };

  const handleQuickRestoreFromClipboard = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const text = await Clipboard.getStringAsync();
      if (!text || !text.trim()) {
        Alert.alert('Bộ nhớ tạm trống', 'Hãy copy mã sao lưu (bắt đầu bằng AG_BACKUP:...) trước khi bấm khôi phục.');
        return;
      }

      const clean = text.trim();
      const result = await StorageService.importBackup(clean);
      onDataRestored();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Khôi phục thành công! 🎉',
        `Đã nạp lại ${result.devicesCount} thiết bị từ bộ nhớ tạm.`,
        [{ text: 'Xong', onPress: onClose }]
      );
    } catch (e: any) {
      Alert.alert('Mã không hợp lệ', 'Nội dung trong bộ nhớ tạm không phải là mã sao lưu hợp lệ của Antigravity.');
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
      Alert.alert(
        'Khôi phục thành công! 🎉',
        `Đã phục hồi ${result.devicesCount} thiết bị từ mã sao lưu.`,
        [{ text: 'Xong', onPress: onClose }]
      );
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
            <HardDrive color="#00f2fe" size={22} />
            <Text style={styles.headerTitle}>Sao lưu Cục bộ (Offline)</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X color="#94a3b8" size={20} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Info Card */}
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <ShieldCheck color="#4ade80" size={18} />
                <Text style={styles.infoTitle}>100% Cục bộ & Bảo mật trên máy</Text>
              </View>
              <Text style={styles.infoDesc}>
                Dữ liệu đăng nhập lưu trữ hoàn toàn trên iPhone của bạn, không truyền lên bất kỳ máy chủ nào. Bạn có thể sao chép mã sao lưu để cất vào Ghi chú (Apple Notes) và khôi phục lại bất kỳ lúc nào sau khi cài lại app.
              </Text>
            </View>

            {/* Quick 1-Tap Restore */}
            <TouchableOpacity
              style={styles.quickRestoreBtn}
              onPress={handleQuickRestoreFromClipboard}
              activeOpacity={0.85}
            >
              <ClipboardPaste color="#030712" size={20} />
              <View style={styles.quickRestoreTextCol}>
                <Text style={styles.quickRestoreTitle}>Khôi phục từ Bộ nhớ tạm</Text>
                <Text style={styles.quickRestoreDesc}>
                  1 chạm nạp lại toàn bộ thiết bị nếu bạn vừa copy mã
                </Text>
              </View>
            </TouchableOpacity>

            {/* Export Code Button */}
            <TouchableOpacity
              style={styles.exportBtn}
              onPress={handleExportBackupCode}
              activeOpacity={0.8}
            >
              <Copy color="#00f2fe" size={18} />
              <Text style={styles.exportBtnText}>Sao chép mã sao lưu ra Ghi chú</Text>
            </TouchableOpacity>

            <View style={styles.dividerBox}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>HOẶC DÁN MÃ THỦ CÔNG</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Manual Code Input */}
            <View style={styles.section}>
              <Text style={styles.inputLabel}>Nhập mã sao lưu</Text>
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
                <Text style={styles.primaryBtnText}>Khôi phục từ mã</Text>
              </TouchableOpacity>
            </View>

            {/* Tip card */}
            <View style={styles.tipCard}>
              <Text style={styles.tipTitle}>💡 Mẹo khi cập nhật app:</Text>
              <Text style={styles.tipText}>
                • Trước khi xoá hoặc cài lại bản mới: Bấm nút <Text style={styles.bold}>"Sao chép mã sao lưu"</Text> ở trên và dán vào Apple Notes.
              </Text>
              <Text style={styles.tipText}>
                • Sau khi cài xong app mới: Mở Notes copy lại mã đó → Mở app bấm <Text style={styles.bold}>"Khôi phục từ Bộ nhớ tạm"</Text> là xong!
              </Text>
            </View>
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
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  infoCard: {
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
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
  },
  quickRestoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00f2fe',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    gap: 12,
    shadowColor: '#00f2fe',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  quickRestoreTextCol: {
    flex: 1,
  },
  quickRestoreTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#030712',
    marginBottom: 2,
  },
  quickRestoreDesc: {
    fontSize: 12,
    color: 'rgba(3, 7, 18, 0.75)',
    fontWeight: '500',
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 242, 254, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.4)',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginBottom: 16,
  },
  exportBtnText: {
    color: '#00f2fe',
    fontSize: 14,
    fontWeight: '700',
  },
  dividerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
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
  section: {
    marginBottom: 20,
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
  restoreFromCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 13,
    borderRadius: 12,
    gap: 8,
    marginTop: 10,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  tipCard: {
    backgroundColor: 'rgba(19, 27, 46, 0.6)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#facc15',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 18,
    marginBottom: 6,
  },
  bold: {
    color: '#f8fafc',
    fontWeight: '700',
  },
});
