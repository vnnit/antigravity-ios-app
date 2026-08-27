import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import {
  ChevronLeft,
  RotateCw,
  Sun,
  Moon,
  Copy,
  ChevronUp,
  ChevronDown,
  Monitor,
  Check,
} from 'lucide-react-native';

interface FloatingToolbarProps {
  deviceName: string;
  url: string;
  isKeepAwake: boolean;
  onToggleKeepAwake: () => void;
  onReload: () => void;
  onDisconnect: () => void;
}

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  deviceName,
  url,
  isKeepAwake,
  onToggleKeepAwake,
  onReload,
  onDisconnect,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Ignore
    }
  };

  const handleCopy = async () => {
    triggerHaptic();
    await Clipboard.setStringAsync(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={styles.floatingContainer} pointerEvents="box-none">
      <View style={styles.pillCard}>
        {/* Top Header Row of Floating Island */}
        <View style={styles.islandHeader}>
          {/* Disconnect Button */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              triggerHaptic();
              onDisconnect();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeft color="#94a3b8" size={18} />
            <Text style={styles.actionBtnText}>Thoát</Text>
          </TouchableOpacity>

          {/* Connected Device Info */}
          <TouchableOpacity
            style={styles.deviceIndicator}
            onPress={() => {
              triggerHaptic();
              setExpanded(!expanded);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.onlineDot} />
            <Text style={styles.deviceText} numberOfLines={1}>
              {deviceName}
            </Text>
            {expanded ? (
              <ChevronDown color="#64748b" size={14} style={styles.iconMargin} />
            ) : (
              <ChevronUp color="#64748b" size={14} style={styles.iconMargin} />
            )}
          </TouchableOpacity>

          {/* Reload Button */}
          <TouchableOpacity
            style={styles.circleActionBtn}
            onPress={() => {
              triggerHaptic();
              onReload();
            }}
          >
            <RotateCw color="#00f2fe" size={16} />
          </TouchableOpacity>
        </View>

        {/* Expanded Controls Drawer */}
        {expanded && (
          <View style={styles.expandedContent}>
            <View style={styles.divider} />

            <View style={styles.drawerRow}>
              {/* Keep Awake Toggle */}
              <TouchableOpacity
                style={[
                  styles.drawerButton,
                  isKeepAwake ? styles.activeDrawerButton : styles.inactiveDrawerButton,
                ]}
                onPress={() => {
                  triggerHaptic();
                  onToggleKeepAwake();
                }}
              >
                {isKeepAwake ? (
                  <Sun color="#facc15" size={16} />
                ) : (
                  <Moon color="#64748b" size={16} />
                )}
                <Text
                  style={[
                    styles.drawerButtonText,
                    isKeepAwake ? styles.activeButtonText : styles.inactiveButtonText,
                  ]}
                >
                  {isKeepAwake ? 'Sáng màn hình' : 'Tự tắt màn'}
                </Text>
              </TouchableOpacity>

              {/* Copy URL */}
              <TouchableOpacity
                style={[styles.drawerButton, styles.inactiveDrawerButton]}
                onPress={handleCopy}
              >
                {copied ? <Check color="#4ade80" size={16} /> : <Copy color="#cbd5e1" size={16} />}
                <Text style={styles.drawerButtonText}>
                  {copied ? 'Đã sao chép' : 'Copy link'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* URL Snippet */}
            <Text style={styles.urlSnippet} numberOfLines={1}>
              {url}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
  },
  pillCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxWidth: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  islandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 34,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  actionBtnText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 2,
  },
  deviceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    flexShrink: 1,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#22c55e',
    marginRight: 6,
  },
  deviceText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
    maxWidth: 160,
  },
  iconMargin: {
    marginLeft: 4,
  },
  circleActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedContent: {
    paddingTop: 8,
    paddingBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 8,
  },
  drawerRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 8,
    marginBottom: 6,
  },
  drawerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
  },
  activeDrawerButton: {
    backgroundColor: 'rgba(250, 204, 21, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.4)',
  },
  inactiveDrawerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  drawerButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
    color: '#cbd5e1',
  },
  activeButtonText: {
    color: '#facc15',
  },
  inactiveButtonText: {
    color: '#94a3b8',
  },
  urlSnippet: {
    color: '#64748b',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 4,
  },
});
