import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import {
  ChevronLeft,
  RotateCw,
  Sun,
  Moon,
  Copy,
  Check,
  Minimize2,
  Sliders,
} from 'lucide-react-native';

interface FloatingToolbarProps {
  deviceName: string;
  url: string;
  isKeepAwake: boolean;
  onToggleKeepAwake: () => void;
  onReload: () => void;
  onDisconnect: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  deviceName,
  url,
  isKeepAwake,
  onToggleKeepAwake,
  onReload,
  onDisconnect,
}) => {
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  // Position & Opacity animations
  const defaultTop = Math.max(insets.top + 8, Platform.OS === 'ios' ? 48 : 24);
  const defaultRight = 16;

  const pan = useRef(new Animated.ValueXY({ x: SCREEN_WIDTH - 76 - defaultRight, y: defaultTop })).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const expandScaleAnim = useRef(new Animated.Value(0)).current;
  const idleTimerRef = useRef<any>(null);

  const triggerHaptic = (style = Haptics.ImpactFeedbackStyle.Light) => {
    try {
      Haptics.impactAsync(style);
    } catch {
      // Ignore
    }
  };

  // Reset idle fade timer
  const resetIdleTimer = () => {
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    // Fade to subtle translucent badge when idle
    if (!expanded) {
      idleTimerRef.current = setTimeout(() => {
        Animated.timing(opacityAnim, {
          toValue: 0.4,
          duration: 400,
          useNativeDriver: true,
        }).start();
      }, 3000);
    }
  };

  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [expanded]);

  // PanResponder for dragging the mini badge
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4;
      },
      onPanResponderGrant: () => {
        resetIdleTimer();
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: () => {
        pan.flattenOffset();
        resetIdleTimer();

        let targetX = (pan.x as any)._value;
        let targetY = (pan.y as any)._value;

        const minY = insets.top + 6;
        const maxY = SCREEN_HEIGHT - insets.bottom - 70;
        const minX = 12;
        const maxX = SCREEN_WIDTH - 84;

        if (targetX < minX) targetX = minX;
        if (targetX > maxX) targetX = maxX;
        if (targetY < minY) targetY = minY;
        if (targetY > maxY) targetY = maxY;

        Animated.spring(pan, {
          toValue: { x: targetX, y: targetY },
          useNativeDriver: false,
          friction: 6,
        }).start();
      },
    })
  ).current;

  const handleToggleExpand = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    if (!expanded) {
      setExpanded(true);
      Animated.spring(expandScaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 50,
        useNativeDriver: true,
      }).start();
    } else {
      handleCollapse();
    }
  };

  const handleCollapse = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    Animated.timing(expandScaleAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      setExpanded(false);
      resetIdleTimer();
    });
  };

  const handleCopy = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    await Clipboard.setStringAsync(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* 1. Collapsed Floating Mini Badge (Draggable, Non-intrusive) */}
      {!expanded && (
        <Animated.View
          style={[
            styles.floatingMiniBadge,
            {
              transform: [{ translateX: pan.x }, { translateY: pan.y }],
              opacity: opacityAnim,
            },
          ]}
          {...panResponder.panHandlers}
        >
          <TouchableOpacity
            style={styles.miniBadgeTouchable}
            onPress={handleToggleExpand}
            activeOpacity={0.8}
          >
            <View style={styles.onlineDot} />
            <Sliders color="#00f2fe" size={14} />
            <Text style={styles.miniBadgeText}>Menu</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* 2. Expanded Control Card (Tap outside to dismiss) */}
      {expanded && (
        <TouchableWithoutFeedback onPress={handleCollapse}>
          <View style={styles.expandedBackdrop}>
            <TouchableWithoutFeedback>
              <Animated.View
                style={[
                  styles.expandedCard,
                  {
                    top: defaultTop,
                    transform: [
                      {
                        scale: expandScaleAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.85, 1],
                        }),
                      },
                    ],
                  },
                ]}
              >
                {/* Header */}
                <View style={styles.cardHeader}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => {
                      triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
                      onDisconnect();
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <ChevronLeft color="#ef4444" size={18} />
                    <Text style={styles.disconnectBtnText}>Thoát</Text>
                  </TouchableOpacity>

                  <View style={styles.deviceInfoPill}>
                    <View style={styles.onlineDot} />
                    <Text style={styles.deviceTitle} numberOfLines={1}>
                      {deviceName}
                    </Text>
                  </View>

                  <View style={styles.headerRightActions}>
                    <TouchableOpacity
                      style={styles.circleBtn}
                      onPress={() => {
                        triggerHaptic();
                        onReload();
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <RotateCw color="#00f2fe" size={15} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.circleBtn}
                      onPress={handleCollapse}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Minimize2 color="#94a3b8" size={15} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.divider} />

                {/* Quick Controls */}
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[
                      styles.controlButton,
                      isKeepAwake ? styles.activeControlButton : styles.inactiveControlButton,
                    ]}
                    onPress={() => {
                      triggerHaptic();
                      onToggleKeepAwake();
                    }}
                  >
                    {isKeepAwake ? (
                      <Sun color="#facc15" size={15} />
                    ) : (
                      <Moon color="#64748b" size={15} />
                    )}
                    <Text
                      style={[
                        styles.controlButtonText,
                        isKeepAwake ? styles.activeButtonText : styles.inactiveButtonText,
                      ]}
                    >
                      {isKeepAwake ? 'Sáng màn hình' : 'Tự tắt màn'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.controlButton, styles.inactiveControlButton]}
                    onPress={handleCopy}
                  >
                    {copied ? <Check color="#4ade80" size={15} /> : <Copy color="#cbd5e1" size={15} />}
                    <Text style={styles.controlButtonText}>
                      {copied ? 'Đã copy' : 'Copy link'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Subtitle URL */}
                <Text style={styles.urlText} numberOfLines={1}>
                  {url}
                </Text>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  floatingMiniBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 999,
    elevation: 10,
  },
  miniBadgeTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.35)',
    gap: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  miniBadgeText: {
    color: '#00f2fe',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
  },
  expandedBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    zIndex: 999,
    alignItems: 'center',
  },
  expandedCard: {
    position: 'absolute',
    backgroundColor: 'rgba(15, 23, 42, 0.96)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '92%',
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 34,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingRight: 6,
  },
  disconnectBtnText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 2,
  },
  deviceInfoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    maxWidth: 150,
    gap: 6,
  },
  deviceTitle: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  circleBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 10,
    marginBottom: 8,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    flex: 1,
    gap: 6,
  },
  activeControlButton: {
    backgroundColor: 'rgba(250, 204, 21, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.4)',
  },
  inactiveControlButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  controlButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeButtonText: {
    color: '#facc15',
  },
  inactiveButtonText: {
    color: '#cbd5e1',
  },
  urlText: {
    color: '#64748b',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
    paddingHorizontal: 4,
  },
});
