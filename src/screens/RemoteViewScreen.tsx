import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import { AlertCircle, RotateCcw, ArrowLeft, WifiOff } from 'lucide-react-native';
import { FloatingToolbar } from '../components/FloatingToolbar';
import { StorageService } from '../services/StorageService';
import { RemoteDevice } from '../types';

interface RemoteViewScreenProps {
  device: RemoteDevice;
  onDisconnect: () => void;
}

const SAFARI_USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1';

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
  const [savedSession, setSavedSession] = useState<Record<string, string> | null>(null);

  // Load any previously saved auth/localStorage session for this host
  useEffect(() => {
    StorageService.getWebSession(device.url).then((session) => {
      if (session) {
        setSavedSession(session);
      }
    });
  }, [device.url]);

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
      nativeEvent.description ||
        'Không thể kết nối đến Remote Server. Vui lòng kiểm tra mạng hoặc bật lại Remote Control trên máy tính.'
    );
  };

  // Pre-load restored localStorage keys into window before webpage scripts run
  const injectedBeforeContentLoaded = `
    (function() {
      try {
        var restored = ${JSON.stringify(savedSession || {})};
        for (var key in restored) {
          if (restored.hasOwnProperty(key)) {
            try {
              if (!window.localStorage.getItem(key)) {
                window.localStorage.setItem(key, restored[key]);
              }
            } catch(e) {}
          }
        }
      } catch(e) {}
    })();
    true;
  `;

  // Continuous listener to persist localStorage & session state into app & keychain
  const injectedJavaScript = `
    (function() {
      // 1. Mobile responsive viewport
      var meta = document.querySelector('meta[name="viewport"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'viewport';
        meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
        document.getElementsByTagName('head')[0].appendChild(meta);
      }

      // 2. Continuous session syncing
      function syncStorage() {
        try {
          if (window.ReactNativeWebView && window.localStorage && window.localStorage.length > 0) {
            var data = {};
            for (var i = 0; i < window.localStorage.length; i++) {
              var key = window.localStorage.key(i);
              if (key) {
                data[key] = window.localStorage.getItem(key);
              }
            }
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'SAVE_SESSION',
              data: data
            }));
          }
        } catch(e) {}
      }

      syncStorage();
      setInterval(syncStorage, 2500);
      window.addEventListener('storage', syncStorage);
    })();
    true;
  `;

  const handleMessage = (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'SAVE_SESSION' && msg.data) {
        StorageService.saveWebSession(device.url, msg.data);
      }
    } catch (e) {
      // Ignore
    }
  };

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
          sharedCookiesEnabled={true}
          thirdPartyCookiesEnabled={true}
          cacheEnabled={true}
          incognito={false}
          saveFormDataDisabled={false}
          javaScriptCanOpenWindowsAutomatically={true}
          userAgent={SAFARI_USER_AGENT}
          startInLoadingState={true}
          scalesPageToFit={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          allowsBackForwardNavigationGestures={true}
          injectedJavaScriptBeforeContentLoaded={injectedBeforeContentLoaded}
          injectedJavaScript={injectedJavaScript}
          onMessage={handleMessage}
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    zIndex: 999,
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
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorCard: {
    backgroundColor: '#131b2e',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorDescription: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
  },
  errorUrl: {
    fontSize: 12,
    color: '#64748b',
    backgroundColor: '#0a0f1d',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 20,
    fontFamily: 'Courier',
    maxWidth: '100%',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
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
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  backButtonText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
});
