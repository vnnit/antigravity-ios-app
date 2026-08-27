import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Animated,
} from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import { AlertCircle, RotateCcw, ArrowLeft, WifiOff } from 'lucide-react-native';
import { FloatingToolbar } from '../components/FloatingToolbar';
import { RemoteDevice } from '../types';

interface RemoteViewScreenProps {
  device: RemoteDevice;
  onDisconnect: () => void;
}

export const RemoteViewScreen: React.FC<RemoteViewScreenProps> = ({
  device,
  onDisconnect,
}) => {
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isKeepAwake, setIsKeepAwake] = useState(true);

  // Keep screen awake while in remote chat session
  useEffect(() => {
    if (isKeepAwake) {
      activateKeepAwakeAsync('remote_session');
    } else {
      deactivateKeepAwake('remote_session');
    }

    return () => {
      deactivateKeepAwake('remote_session');
    };
  }, [isKeepAwake]);

  const handleToggleKeepAwake = () => {
    setIsKeepAwake((prev) => !prev);
  };

  const handleReload = () => {
    setHasError(false);
    webViewRef.current?.reload();
  };

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    setLoading(navState.loading);
  };

  const handleError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    setHasError(true);
    setErrorMessage(
      nativeEvent.description || 'Không thể kết nối đến Remote Server. Vui lòng kiểm tra mạng hoặc bật lại Remote Control trên máy tính.'
    );
  };

  // Injected JS to ensure viewport meta exists for responsive mobile rendering
  const injectedJavaScript = `
    (function() {
      var meta = document.querySelector('meta[name="viewport"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'viewport';
        meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
        document.getElementsByTagName('head')[0].appendChild(meta);
      }
    })();
    true;
  `;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" hidden={false} />

      {/* Floating Island Control Bar */}
      <FloatingToolbar
        deviceName={device.name}
        url={device.url}
        isKeepAwake={isKeepAwake}
        onToggleKeepAwake={handleToggleKeepAwake}
        onReload={handleReload}
        onDisconnect={onDisconnect}
      />

      {/* Loading Progress Bar */}
      {loading && loadProgress < 1 && (
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              { width: `${Math.max(loadProgress * 100, 10)}%` },
            ]}
          />
        </View>
      )}

      {/* Main WebView or Error View */}
      {hasError ? (
        <SafeAreaView style={styles.errorContainer}>
          <View style={styles.errorCard}>
            <View style={styles.errorIconCircle}>
              <WifiOff color="#ef4444" size={36} />
            </View>
            <Text style={styles.errorTitle}>Mất kết nối với Agent</Text>
            <Text style={styles.errorDescription}>{errorMessage}</Text>
            <Text style={styles.errorUrl} numberOfLines={2}>
              {device.url}
            </Text>

            <TouchableOpacity style={styles.retryButton} onPress={handleReload}>
              <RotateCcw color="#ffffff" size={18} />
              <Text style={styles.retryButtonText}>Thử lại kết nối</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.backButton} onPress={onDisconnect}>
              <ArrowLeft color="#94a3b8" size={16} />
              <Text style={styles.backButtonText}>Quay lại danh sách thiết bị</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      ) : (
        <WebView
          ref={webViewRef}
          source={{ uri: device.url }}
          style={styles.webView}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          allowsBackForwardNavigationGestures={true}
          injectedJavaScript={injectedJavaScript}
          onLoadProgress={({ nativeEvent }) => setLoadProgress(nativeEvent.progress)}
          onNavigationStateChange={handleNavigationStateChange}
          onError={handleError}
          renderLoading={() => (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#00f2fe" />
              <Text style={styles.loadingText}>Đang tải giao diện điều khiển...</Text>
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1d',
  },
  webView: {
    flex: 1,
    backgroundColor: '#0a0f1d',
  },
  progressBarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'transparent',
    zIndex: 1000,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#00f2fe',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0a0f1d',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#0a0f1d',
  },
  errorCard: {
    backgroundColor: '#131b2e',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorDescription: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 14,
  },
  errorUrl: {
    fontSize: 11,
    color: '#64748b',
    backgroundColor: '#0a0f1d',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    width: '100%',
    gap: 8,
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  backButtonText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
});
