import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Animated,
  Easing,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { X, Zap, ZapOff, Camera as CameraIcon, RefreshCw } from 'lucide-react-native';

interface QRScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScanSuccess: (data: string) => void;
}

const { width } = Dimensions.get('window');
const SCANNER_SIZE = width * 0.72;

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  visible,
  onClose,
  onScanSuccess,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [scanLineAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      setScanned(false);
      startScanLineAnimation();
    } else {
      scanLineAnim.stopAnimation();
    }
  }, [visible]);

  const startScanLineAnimation = () => {
    scanLineAnim.setValue(0);
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const handleBarcodeScanned = (scanningResult: BarcodeScanningResult) => {
    if (scanned || !scanningResult.data) return;
    setScanned(true);

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Ignore if haptics fail
    }

    onScanSuccess(scanningResult.data);
    onClose();
  };

  const translateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCANNER_SIZE - 4],
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />

        {!permission ? (
          <View style={styles.permissionContainer}>
            <Text style={styles.permissionText}>Đang yêu cầu quyền truy cập Camera...</Text>
          </View>
        ) : !permission.granted ? (
          <SafeAreaView style={styles.permissionContainer}>
            <CameraIcon color="#00f2fe" size={54} />
            <Text style={styles.permissionTitle}>Cần quyền truy cập Camera</Text>
            <Text style={styles.permissionText}>
              Ứng dụng cần sử dụng camera để quét mã QR Remote Control hiển thị trên màn hình máy tính của bạn.
            </Text>
            <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
              <Text style={styles.permissionButtonText}>Cấp quyền Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Đóng</Text>
            </TouchableOpacity>
          </SafeAreaView>
        ) : (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            enableTorch={torch}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
            onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          >
            {/* Dark Mask Overlays */}
            <SafeAreaView style={styles.overlayContainer}>
              {/* Header Controls */}
              <View style={styles.topBar}>
                <TouchableOpacity
                  style={styles.circleButton}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <X color="#fff" size={22} />
                </TouchableOpacity>

                <Text style={styles.topTitle}>Quét mã Remote Control</Text>

                <TouchableOpacity
                  style={styles.circleButton}
                  onPress={() => setTorch((prev) => !prev)}
                  activeOpacity={0.7}
                >
                  {torch ? <Zap color="#facc15" size={22} /> : <ZapOff color="#fff" size={22} />}
                </TouchableOpacity>
              </View>

              {/* Viewfinder Section */}
              <View style={styles.viewFinderWrapper}>
                <View style={styles.viewFinder}>
                  {/* Corner accents */}
                  <View style={[styles.corner, styles.topLeft]} />
                  <View style={[styles.corner, styles.topRight]} />
                  <View style={[styles.corner, styles.bottomLeft]} />
                  <View style={[styles.corner, styles.bottomRight]} />

                  {/* Animated laser scan line */}
                  <Animated.View
                    style={[
                      styles.scanLine,
                      {
                        transform: [{ translateY }],
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Footer Instruction */}
              <View style={styles.footerContainer}>
                <Text style={styles.instructionTitle}>Hướng camera vào mã QR</Text>
                <Text style={styles.instructionSubtitle}>
                  Mã QR hiển thị trong bảng Remote Control trên máy tính của bạn
                </Text>
              </View>
            </SafeAreaView>
          </CameraView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#0a0f1d',
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 18,
    marginBottom: 10,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  permissionButton: {
    backgroundColor: '#00d2ff',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  permissionButtonText: {
    color: '#030712',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: '#64748b',
    fontSize: 15,
  },
  overlayContainer: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  topTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(30, 41, 59, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  viewFinderWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewFinder: {
    width: SCANNER_SIZE,
    height: SCANNER_SIZE,
    position: 'relative',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#00f2fe',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 16,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 16,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 16,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 16,
  },
  scanLine: {
    width: '100%',
    height: 3,
    backgroundColor: '#00f2fe',
    shadowColor: '#00f2fe',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  footerContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  instructionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  instructionSubtitle: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
