import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ConnectScreen } from './src/screens/ConnectScreen';
import { RemoteViewScreen } from './src/screens/RemoteViewScreen';
import { StorageService } from './src/services/StorageService';
import { RemoteDevice } from './src/types';

export default function App() {
  const [activeDevice, setActiveDevice] = useState<RemoteDevice | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    checkAutoConnect();
  }, []);

  const checkAutoConnect = async () => {
    try {
      const [settings, lastDevice] = await Promise.all([
        StorageService.getSettings(),
        StorageService.getLastConnectedDevice(),
      ]);

      if (settings.autoConnectLastDevice && lastDevice && lastDevice.url) {
        setActiveDevice(lastDevice);
      }
    } catch (e) {
      console.error('Error during auto-connect check:', e);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleConnect = (device: RemoteDevice) => {
    setActiveDevice(device);
  };

  const handleDisconnect = () => {
    setActiveDevice(null);
  };

  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00f2fe" />
      </View>
    );
  }

  return (
    <SafeAreaProvider style={styles.container}>
      <StatusBar style="light" />
      {activeDevice ? (
        <RemoteViewScreen
          device={activeDevice}
          onDisconnect={handleDisconnect}
        />
      ) : (
        <ConnectScreen onConnect={handleConnect} />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1d',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0a0f1d',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
