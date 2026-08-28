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
  Folder,
  Copy,
  ClipboardPaste,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  FileText,
  HardDrive,
  FileCheck,
  FolderOpen,
  Key,
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

  const handlePickAndRestoreJson = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await StorageService.pickAndRestoreJsonFile();
      onDataRestored();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Khôi phục thành công! 🎉',
        `Đã nạp ${result.devicesCount} thiết bị từ tệp "${result.fileName}".`,
        [{ text: 'Đóng', onPress: onClose }]
      );
    } catch (e: any) {
      if (e.message !== 'Đã hủy chọn tệp.') {
        Alert.alert('Lỗi đọc tệp', e.message || 'Không thể giải mã tệp sao lưu JSON.');
      }
    }
  };

  const handleRestoreFromLocalFiles = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await StorageService.restoreFromFileSystem();
      onDataRestored();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Đã nạp từ Tệp iPhone! 🎉',
        `Đã phục hồi thành công ${result.devicesCount} thiết bị từ file "antigravity_history.json".`,
        [{ text: 'Đóng', onPress: onClose }]
      );
    } catch (e: any) {
      Alert.alert('Không tìm thấy file', e.message || 'Chưa có file lưu trữ nào trong thư mục Antigravity.');
    }
  };

  const handleSaveToFilesManually = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const devices = await StorageService.getDevices();
      await StorageService.saveToFileSystem(devices);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Đã lưu vào Tệp! 📁',
        `Toàn bộ ${devices.length} thiết bị đã được ghi vào file "antigravity_history.json" trong thư mục Antigravity trên iPhone.`
      );
    } catch (e: any) {
      Alert.alert('Lỗi lưu file', e.message || 'Không thể ghi file vào thư mục.');
    }
  };

  const handleExportBackupCode = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const code = await StorageService.exportBackupString();
      await Clipboard.setStringAsync(code);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Đã sao chép mã! 📋',
        'Mã sao lưu đã được copy vào bộ nhớ tạm.'
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
        Alert.alert('Bộ nhớ tạm trống', 'Hãy copy mã sao lưu trước khi bấm khôi phục.');
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
      Alert.alert('Mã không hợp lệ', 'Nội dung trong bộ nhớ tạm không phải là mã sao lưu hợp lệ.');
    }
  };

  const handleImportBackupCode = async () => {
    if (!backupCodeInput.trim()) {
      Alert.alert('Chưa có mã', 'Vui lòng dán mã sao lưu vào ô bên dưới.');
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
      Alert.alert('Mã không hợp lệ', e.message || 'Không thể giải mã dữ liệu.');
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
            <Folder color="#00f2fe" size={22} />
            <Text style={styles.headerTitle}>Quản lý Tệp &amp; Khôi phục</Text>
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
                <Key color="#38bdf8" size={20} />
                <Text style={styles.infoTitle}>Tự động ghi nhớ qua iOS Keychain</Text>
              </View>
              <Text style={styles.infoDesc}>
                Lịch sử đăng nhập đã được khóa an toàn vào <Text style={styles.boldWhite}>Móc khóa bảo mật (iOS Keychain)</Text> và thư mục <Text style={styles.boldWhite}>Trên iPhone &gt; Antigravity</Text>. Dữ liệu sẽ tồn tại bền vững ngay cả khi bạn xóa app và cài lại!
              </Text>
            </View>

            {/* Primary Action 1: Open Document Picker */}
            <TouchableOpacity
              style={styles.primaryFilesBtn}
              onPress={handlePickAndRestoreJson}
              activeOpacity={0.85}
            >
              <FolderOpen color="#030712" size={22} />
              <View style={styles.filesBtnTextCol}>
                <Text style={styles.filesBtnTitle}>Chọn file .json từ ứng dụng Tệp</Text>
                <Text style={styles.filesBtnDesc}>
                  Chọn file từ Tải về, iCloud Drive hoặc bất kỳ đâu
                </Text>
              </View>
            </TouchableOpacity>

            {/* Primary Action 2: Read from App Folder */}
            <TouchableOpacity
              style={styles.secondaryFilesBtn}
              onPress={handleRestoreFromLocalFiles}
              activeOpacity={0.8}
            >
              <FileCheck color="#00f2fe" size={18} />
              <Text style={styles.secondaryFilesBtnText}>Nạp từ thư mục Trên iPhone &gt; Antigravity</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionLinkBtn}
              onPress={handleSaveToFilesManually}
              activeOpacity={0.8}
            >
              <FileText color="#94a3b8" size={16} />
              <Text style={styles.actionLinkBtnText}>Ghi đè file antigravity_history.json vào Tệp</Text>
            </TouchableOpacity>

            <View style={styles.dividerBox}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>TÙY CHỌN DỰ PHÒNG KHÁC</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Quick 1-Tap Clipboard Restore */}
            <TouchableOpacity
              style={styles.quickRestoreBtn}
              onPress={handleQuickRestoreFromClipboard}
              activeOpacity={0.85}
            >
              <ClipboardPaste color="#38bdf8" size={18} />
              <Text style={styles.quickRestoreTitle}>Khôi phục từ Bộ nhớ tạm (Clipboard)</Text>
            </TouchableOpacity>

            {/* Export Code Button */}
            <TouchableOpacity
              style={styles.exportBtn}
              onPress={handleExportBackupCode}
              activeOpacity={0.8}
            >
              <Copy color="#94a3b8" size={16} />
              <Text style={styles.exportBtnText}>Sao chép mã sao lưu</Text>
            </TouchableOpacity>

            {/* Manual Code Input */}
            <View style={styles.section}>
              <Text style={styles.inputLabel}>Hoặc dán mã sao lưu thủ công</Text>
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
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
  },
  infoDesc: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 20,
  },
  boldWhite: {
    color: '#38bdf8',
    fontWeight: '700',
  },
  primaryFilesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00f2fe',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    gap: 14,
    shadowColor: '#00f2fe',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  filesBtnTextCol: {
    flex: 1,
  },
  filesBtnTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#030712',
    marginBottom: 2,
  },
  filesBtnDesc: {
    fontSize: 12,
    color: 'rgba(3, 7, 18, 0.75)',
    fontWeight: '500',
  },
  secondaryFilesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 242, 254, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.4)',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginBottom: 10,
  },
  secondaryFilesBtnText: {
    color: '#00f2fe',
    fontSize: 14,
    fontWeight: '700',
  },
  actionLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
    marginBottom: 16,
  },
  actionLinkBtnText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
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
  quickRestoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#131b2e',
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 8,
    marginBottom: 10,
  },
  quickRestoreTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
    marginBottom: 16,
  },
  exportBtnText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
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
});
