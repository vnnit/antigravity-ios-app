import AsyncStorage from '@react-native-async-storage/async-storage';
import { RemoteDevice, AppSettings } from '../types';

const STORAGE_KEYS = {
  DEVICES: '@antigravity_devices_v1',
  LAST_CONNECTED: '@antigravity_last_device_v1',
  SETTINGS: '@antigravity_settings_v1',
};

const DEFAULT_SETTINGS: AppSettings = {
  autoConnectLastDevice: true,
  keepAwakeEnabled: true,
  hapticFeedback: true,
  desktopMode: false,
};

export const StorageService = {
  async getDevices(): Promise<RemoteDevice[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.DEVICES);
      if (!data) return [];
      const parsed: RemoteDevice[] = JSON.parse(data);
      return parsed.sort((a, b) => b.lastConnectedAt - a.lastConnectedAt);
    } catch (e) {
      console.error('Failed to get devices from storage:', e);
      return [];
    }
  },

  async saveDevice(deviceData: {
    id?: string;
    name: string;
    url: string;
    notes?: string;
  }): Promise<RemoteDevice> {
    try {
      const devices = await this.getDevices();
      const id = deviceData.id || `dev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      
      const updatedDevice: RemoteDevice = {
        id,
        name: deviceData.name.trim() || 'Remote Device',
        url: deviceData.url.trim(),
        lastConnectedAt: Date.now(),
        notes: deviceData.notes,
      };

      const existingIndex = devices.findIndex(
        (d) => d.id === id || d.url === updatedDevice.url
      );

      let newDevices: RemoteDevice[];
      if (existingIndex >= 0) {
        newDevices = [...devices];
        newDevices[existingIndex] = {
          ...newDevices[existingIndex],
          ...updatedDevice,
        };
      } else {
        newDevices = [updatedDevice, ...devices];
      }

      await AsyncStorage.setItem(STORAGE_KEYS.DEVICES, JSON.stringify(newDevices));
      await this.setLastConnectedDevice(updatedDevice);
      return updatedDevice;
    } catch (e) {
      console.error('Failed to save device:', e);
      throw e;
    }
  },

  async deleteDevice(id: string): Promise<void> {
    try {
      const devices = await this.getDevices();
      const filtered = devices.filter((d) => d.id !== id);
      await AsyncStorage.setItem(STORAGE_KEYS.DEVICES, JSON.stringify(filtered));

      const lastDevice = await this.getLastConnectedDevice();
      if (lastDevice && lastDevice.id === id) {
        await AsyncStorage.removeItem(STORAGE_KEYS.LAST_CONNECTED);
      }
    } catch (e) {
      console.error('Failed to delete device:', e);
    }
  },

  async getLastConnectedDevice(): Promise<RemoteDevice | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.LAST_CONNECTED);
      if (!data) return null;
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to get last connected device:', e);
      return null;
    }
  },

  async setLastConnectedDevice(device: RemoteDevice): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_CONNECTED, JSON.stringify(device));
    } catch (e) {
      console.error('Failed to set last connected device:', e);
    }
  },

  async getSettings(): Promise<AppSettings> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!data) return DEFAULT_SETTINGS;
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    } catch (e) {
      console.error('Failed to get settings:', e);
      return DEFAULT_SETTINGS;
    }
  },

  async saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    try {
      const current = await this.getSettings();
      const updated = { ...current, ...settings };
      await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.error('Failed to save settings:', e);
      return DEFAULT_SETTINGS;
    }
  },

  /**
   * Parse input from QR code, pasted link, or device name
   */
  parseRemoteInput(input: string): { url: string; deviceName: string } {
    let cleanInput = input.trim();

    // Check if input is JSON
    if (cleanInput.startsWith('{') && cleanInput.endsWith('}')) {
      try {
        const parsed = JSON.parse(cleanInput);
        if (parsed.url) {
          return {
            url: parsed.url,
            deviceName: parsed.deviceName || parsed.name || 'Remote Agent',
          };
        }
      } catch {
        // Fall through
      }
    }

    // If input is standard URL
    if (cleanInput.startsWith('http://') || cleanInput.startsWith('https://')) {
      let deviceName = 'Remote Agent';
      try {
        const urlObj = new URL(cleanInput);
        const deviceParam = urlObj.searchParams.get('device') || urlObj.searchParams.get('deviceName');
        if (deviceParam) {
          deviceName = deviceParam;
        } else {
          deviceName = urlObj.hostname;
        }
      } catch {
        // Fall through
      }
      return { url: cleanInput, deviceName };
    }

    // If user entered IP:PORT or domain:port without protocol
    if (/^[a-zA-Z0-9.-]+:[0-9]+(\/.*)?$/.test(cleanInput)) {
      return {
        url: `http://${cleanInput}`,
        deviceName: cleanInput.split(':')[0],
      };
    }

    // If it looks like a device ID e.g. "win-1vlvsl2a1b9-mighty-corona"
    return {
      url: `https://antigravity.google.com/remote?device=${encodeURIComponent(cleanInput)}`,
      deviceName: cleanInput,
    };
  },
};
