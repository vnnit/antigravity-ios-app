import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { RemoteDevice, AppSettings, BackupData } from '../types';

const STORAGE_KEYS = {
  DEVICES: '@antigravity_devices_v1',
  LAST_CONNECTED: '@antigravity_last_device_v1',
  SETTINGS: '@antigravity_settings_v1',
  WEB_SESSIONS: '@antigravity_web_sessions_v1',
};

const KEYCHAIN_KEYS = {
  DEVICES_BACKUP: 'antigravity_keychain_devices_v1',
  SETTINGS_BACKUP: 'antigravity_keychain_settings_v1',
  WEB_SESSIONS_BACKUP: 'antigravity_keychain_sessions_v1',
};

const DEFAULT_SETTINGS: AppSettings = {
  autoConnectLastDevice: true,
  keepAwakeEnabled: true,
  hapticFeedback: true,
  desktopMode: false,
};

const BACKUP_FILENAME = 'antigravity_history.json';
const BACKUP_PREFIX = 'AG_BACKUP:v1:';

const getBackupFile = () => {
  return new File(Paths.document, BACKUP_FILENAME);
};

export const StorageService = {
  /**
   * Triple-layer storage loader:
   * 1. AsyncStorage
   * 2. iOS Secure Keychain (Persists even when app is deleted and reinstalled!)
   * 3. Local Filesystem (antigravity_history.json in Files app)
   */
  async getDevices(): Promise<RemoteDevice[]> {
    try {
      const deviceMap = new Map<string, RemoteDevice>();

      // 1. Load from AsyncStorage
      try {
        const asyncData = await AsyncStorage.getItem(STORAGE_KEYS.DEVICES);
        if (asyncData) {
          const parsed: RemoteDevice[] = JSON.parse(asyncData);
          for (const d of parsed) {
            if (d && d.url) deviceMap.set(d.url, d);
          }
        }
      } catch (err) {
        console.warn('AsyncStorage read error:', err);
      }

      // 2. Load from iOS Keychain (Survives app deletion/reinstallation)
      try {
        const keychainData = await SecureStore.getItemAsync(KEYCHAIN_KEYS.DEVICES_BACKUP);
        if (keychainData) {
          const parsed: RemoteDevice[] = JSON.parse(keychainData);
          for (const d of parsed) {
            if (d && d.url) {
              const existing = deviceMap.get(d.url);
              if (!existing || (d.lastConnectedAt && d.lastConnectedAt > existing.lastConnectedAt)) {
                deviceMap.set(d.url, d);
              }
            }
          }
        }
      } catch (kcErr) {
        console.warn('Keychain read error:', kcErr);
      }

      // 3. Load from local Filesystem folder (antigravity_history.json)
      try {
        const file = getBackupFile();
        if (file.exists) {
          const fileContent = await file.text();
          if (fileContent) {
            const parsed = JSON.parse(fileContent);
            const list: RemoteDevice[] = Array.isArray(parsed)
              ? parsed
              : parsed.devices && Array.isArray(parsed.devices)
              ? parsed.devices
              : [];
            for (const d of list) {
              if (d && d.url) {
                const existing = deviceMap.get(d.url);
                if (!existing || (d.lastConnectedAt && d.lastConnectedAt > existing.lastConnectedAt)) {
                  deviceMap.set(d.url, d);
                }
              }
            }
          }
        }
      } catch (fileErr) {
        console.warn('Filesystem read error:', fileErr);
      }

      const mergedDevices = Array.from(deviceMap.values()).sort(
        (a, b) => b.lastConnectedAt - a.lastConnectedAt
      );

      // If we recovered data from Keychain / Files that was missing in AsyncStorage, sync back
      if (mergedDevices.length > 0) {
        await AsyncStorage.setItem(STORAGE_KEYS.DEVICES, JSON.stringify(mergedDevices));
        await this.syncToKeychain(mergedDevices);
        await this.saveToFileSystem(mergedDevices);
      }

      return mergedDevices;
    } catch (e) {
      console.error('Failed to get devices:', e);
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

      // 1. Save to AsyncStorage
      await AsyncStorage.setItem(STORAGE_KEYS.DEVICES, JSON.stringify(newDevices));
      await this.setLastConnectedDevice(updatedDevice);

      // 2. Save to iOS Keychain (Persists across uninstalls)
      await this.syncToKeychain(newDevices);

      // 3. Save to Filesystem (On My iPhone > Antigravity)
      await this.saveToFileSystem(newDevices);

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
      await this.syncToKeychain(filtered);
      await this.saveToFileSystem(filtered);

      const lastDevice = await this.getLastConnectedDevice();
      if (lastDevice && lastDevice.id === id) {
        await AsyncStorage.removeItem(STORAGE_KEYS.LAST_CONNECTED);
      }
    } catch (e) {
      console.error('Failed to delete device:', e);
    }
  },

  async syncToKeychain(devices: RemoteDevice[]): Promise<void> {
    try {
      await SecureStore.setItemAsync(
        KEYCHAIN_KEYS.DEVICES_BACKUP,
        JSON.stringify(devices),
        { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK }
      );
    } catch (e) {
      console.warn('Failed to save to Keychain:', e);
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
   * Save devices payload directly to iOS "On My iPhone > Antigravity" folder (antigravity_history.json)
   */
  async saveToFileSystem(devices: RemoteDevice[]): Promise<string> {
    try {
      if (devices.length === 0) return '';
      const file = getBackupFile();
      const payload: BackupData = {
        version: 1,
        exportedAt: Date.now(),
        devices,
        settings: await this.getSettings(),
        lastConnectedDevice: await this.getLastConnectedDevice(),
      };
      await file.write(JSON.stringify(payload, null, 2));
      return file.uri;
    } catch (e) {
      console.error('Failed to write to FileSystem:', e);
      return '';
    }
  },

  /**
   * Open iOS Document Picker to select any .json backup file from iCloud Drive, Downloads, or Files app
   */
  async pickAndRestoreJsonFile(): Promise<{ devicesCount: number; fileName: string }> {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/plain', '*/*'],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      throw new Error('Đã hủy chọn tệp.');
    }

    const asset = result.assets[0];
    const pickedFile = new File(asset.uri);
    const content = await pickedFile.text();
    const parsed = JSON.parse(content);
    const importRes = await this.importBackup(parsed);

    return { devicesCount: importRes.devicesCount, fileName: asset.name };
  },

  /**
   * Reload data directly from the iOS Files app folder (antigravity_history.json)
   */
  async restoreFromFileSystem(): Promise<{ devicesCount: number; path: string }> {
    const file = getBackupFile();
    if (!file.exists) {
      throw new Error(`Chưa tìm thấy file "${BACKUP_FILENAME}" trong thư mục Antigravity.`);
    }

    const content = await file.text();
    const parsed = JSON.parse(content);
    const result = await this.importBackup(parsed);

    return { devicesCount: result.devicesCount, path: file.uri };
  },

  /**
   * Export all devices & settings to a portable backup JSON
   */
  async exportBackupPayload(): Promise<BackupData> {
    const [devices, settings, lastConnectedDevice] = await Promise.all([
      this.getDevices(),
      this.getSettings(),
      this.getLastConnectedDevice(),
    ]);

    return {
      version: 1,
      exportedAt: Date.now(),
      devices,
      settings,
      lastConnectedDevice,
    };
  },

  /**
   * Export backup as a Base64 code string for quick copying
   */
  async exportBackupString(): Promise<string> {
    const payload = await this.exportBackupPayload();
    const jsonStr = JSON.stringify(payload);
    let base64 = '';
    try {
      base64 = btoa(unescape(encodeURIComponent(jsonStr)));
    } catch {
      base64 = encodeURIComponent(jsonStr);
    }
    return `${BACKUP_PREFIX}${base64}`;
  },

  /**
   * Import backup from JSON object or string
   */
  async importBackup(input: string | BackupData | RemoteDevice[]): Promise<{ devicesCount: number }> {
    let data: BackupData;

    if (Array.isArray(input)) {
      data = {
        version: 1,
        exportedAt: Date.now(),
        devices: input,
        settings: DEFAULT_SETTINGS,
      };
    } else if (typeof input === 'string') {
      let clean = input.trim();
      if (clean.startsWith(BACKUP_PREFIX)) {
        clean = clean.substring(BACKUP_PREFIX.length);
        let jsonStr = '';
        try {
          jsonStr = decodeURIComponent(escape(atob(clean)));
        } catch {
          jsonStr = decodeURIComponent(clean);
        }
        data = JSON.parse(jsonStr);
      } else {
        data = JSON.parse(clean);
      }
    } else {
      data = input;
    }

    if (!data.devices || !Array.isArray(data.devices)) {
      throw new Error('Dữ liệu không hợp lệ (không tìm thấy danh sách thiết bị).');
    }

    const currentDevices = await this.getDevices();
    const deviceMap = new Map<string, RemoteDevice>();

    for (const d of currentDevices) {
      if (d && d.url) deviceMap.set(d.url, d);
    }

    for (const d of data.devices) {
      if (d && d.url) {
        deviceMap.set(d.url, {
          id: d.id || `dev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: d.name || 'Remote Device',
          url: d.url,
          lastConnectedAt: d.lastConnectedAt || Date.now(),
          notes: d.notes,
        });
      }
    }

    const mergedDevices = Array.from(deviceMap.values()).sort(
      (a, b) => b.lastConnectedAt - a.lastConnectedAt
    );

    // Save across all 3 layers
    await AsyncStorage.setItem(STORAGE_KEYS.DEVICES, JSON.stringify(mergedDevices));
    await this.syncToKeychain(mergedDevices);
    await this.saveToFileSystem(mergedDevices);

    if (data.lastConnectedDevice && data.lastConnectedDevice.url) {
      await this.setLastConnectedDevice(data.lastConnectedDevice);
    }

    if (data.settings) {
      await this.saveSettings(data.settings);
    }

    return { devicesCount: mergedDevices.length };
  },

  /**
   * Parse input from QR code, pasted link, or device name
   */
  parseRemoteInput(input: string): { url: string; deviceName: string } {
    let cleanInput = input.trim();

    if (cleanInput.startsWith(BACKUP_PREFIX)) {
      return {
        url: cleanInput,
        deviceName: 'Backup Code',
      };
    }

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

    if (/^[a-zA-Z0-9.-]+:[0-9]+(\/.*)?$/.test(cleanInput)) {
      return {
        url: `http://${cleanInput}`,
        deviceName: cleanInput.split(':')[0],
      };
    }

    return {
      url: `https://antigravity.google.com/remote?device=${encodeURIComponent(cleanInput)}`,
      deviceName: cleanInput,
    };
  },

  /**
   * Save web localStorage and auth session data (saved in AsyncStorage & iOS Keychain)
   */
  async saveWebSession(originUrl: string, data: Record<string, string>): Promise<void> {
    try {
      if (!data || Object.keys(data).length === 0) return;
      const key = originUrl.split('?')[0].toLowerCase();
      
      let allSessions: Record<string, Record<string, string>> = {};
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEYS.WEB_SESSIONS);
        if (stored) allSessions = JSON.parse(stored);
      } catch {}

      allSessions[key] = {
        ...(allSessions[key] || {}),
        ...data,
      };

      const serialized = JSON.stringify(allSessions);
      await AsyncStorage.setItem(STORAGE_KEYS.WEB_SESSIONS, serialized);
      
      try {
        await SecureStore.setItemAsync(KEYCHAIN_KEYS.WEB_SESSIONS_BACKUP, serialized, {
          keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
        });
      } catch (kcErr) {
        console.warn('Could not save session to Keychain:', kcErr);
      }
    } catch (e) {
      console.error('Failed to save web session:', e);
    }
  },

  /**
   * Retrieve saved web localStorage and auth session data
   */
  async getWebSession(originUrl: string): Promise<Record<string, string> | null> {
    try {
      const key = originUrl.split('?')[0].toLowerCase();
      let allSessions: Record<string, Record<string, string>> = {};

      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEYS.WEB_SESSIONS);
        if (stored) allSessions = JSON.parse(stored);
      } catch {}

      if (!allSessions[key]) {
        try {
          const kcStored = await SecureStore.getItemAsync(KEYCHAIN_KEYS.WEB_SESSIONS_BACKUP);
          if (kcStored) {
            allSessions = JSON.parse(kcStored);
            await AsyncStorage.setItem(STORAGE_KEYS.WEB_SESSIONS, kcStored);
          }
        } catch {}
      }

      return allSessions[key] || null;
    } catch (e) {
      console.error('Failed to get web session:', e);
      return null;
    }
  },
};
