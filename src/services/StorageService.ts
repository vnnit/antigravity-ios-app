import AsyncStorage from '@react-native-async-storage/async-storage';
import { RemoteDevice, AppSettings, BackupData } from '../types';

const STORAGE_KEYS = {
  DEVICES: '@antigravity_devices_v1',
  LAST_CONNECTED: '@antigravity_last_device_v1',
  SETTINGS: '@antigravity_settings_v1',
  CLOUD_TOKEN: '@antigravity_cloud_token_v1',
  LAST_SYNC_TIME: '@antigravity_last_sync_v1',
};

const DEFAULT_SETTINGS: AppSettings = {
  autoConnectLastDevice: true,
  keepAwakeEnabled: true,
  hapticFeedback: true,
  desktopMode: false,
  autoCloudSync: false,
};

const BACKUP_PREFIX = 'AG_BACKUP:v1:';
const GIST_FILENAME = 'antigravity_remote_backup.json';
const GIST_DESCRIPTION = 'Antigravity Remote iOS - Device History & Settings Backup';

const toBase64 = (str: string): string => {
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch {
    return encodeURIComponent(str);
  }
};

const fromBase64 = (str: string): string => {
  try {
    return decodeURIComponent(escape(atob(str)));
  } catch {
    return decodeURIComponent(str);
  }
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

      // Auto cloud sync if enabled
      this.triggerAutoCloudSync().catch(() => {});

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

      // Auto cloud sync if enabled
      this.triggerAutoCloudSync().catch(() => {});
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

  async getCloudToken(): Promise<string> {
    try {
      return (await AsyncStorage.getItem(STORAGE_KEYS.CLOUD_TOKEN)) || '';
    } catch {
      return '';
    }
  },

  async saveCloudToken(token: string): Promise<void> {
    try {
      if (token && token.trim()) {
        await AsyncStorage.setItem(STORAGE_KEYS.CLOUD_TOKEN, token.trim());
      } else {
        await AsyncStorage.removeItem(STORAGE_KEYS.CLOUD_TOKEN);
      }
    } catch (e) {
      console.error('Failed to save cloud token:', e);
    }
  },

  async getLastSyncTime(): Promise<number | null> {
    try {
      const t = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC_TIME);
      return t ? parseInt(t, 10) : null;
    } catch {
      return null;
    }
  },

  async setLastSyncTime(timestamp: number): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC_TIME, timestamp.toString());
    } catch (e) {
      console.error('Failed to set last sync time:', e);
    }
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
   * Export backup as a Base64 code string for easy copying
   */
  async exportBackupString(): Promise<string> {
    const payload = await this.exportBackupPayload();
    const jsonStr = JSON.stringify(payload);
    const base64 = toBase64(jsonStr);
    return `${BACKUP_PREFIX}${base64}`;
  },

  /**
   * Import backup from JSON object or Base64 string
   */
  async importBackup(input: string | BackupData): Promise<{ devicesCount: number }> {
    let data: BackupData;

    if (typeof input === 'string') {
      let clean = input.trim();
      if (clean.startsWith(BACKUP_PREFIX)) {
        clean = clean.substring(BACKUP_PREFIX.length);
        const jsonStr = fromBase64(clean);
        data = JSON.parse(jsonStr);
      } else {
        data = JSON.parse(clean);
      }
    } else {
      data = input;
    }

    if (!data.devices || !Array.isArray(data.devices)) {
      throw new Error('Dữ liệu sao lưu không hợp lệ (không tìm thấy danh sách thiết bị).');
    }

    // Merge with existing devices
    const currentDevices = await this.getDevices();
    const deviceMap = new Map<string, RemoteDevice>();

    // Put current first
    for (const d of currentDevices) {
      deviceMap.set(d.url, d);
    }

    // Overlay imported
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

    await AsyncStorage.setItem(STORAGE_KEYS.DEVICES, JSON.stringify(mergedDevices));

    if (data.lastConnectedDevice && data.lastConnectedDevice.url) {
      await this.setLastConnectedDevice(data.lastConnectedDevice);
    }

    if (data.settings) {
      await this.saveSettings(data.settings);
    }

    return { devicesCount: mergedDevices.length };
  },

  /**
   * Sync backup payload to GitHub Gist
   */
  async syncToGitHubGist(tokenOverride?: string): Promise<{ gistId: string; count: number }> {
    const token = tokenOverride || (await this.getCloudToken());
    if (!token || !token.trim()) {
      throw new Error('Chưa có GitHub Token để đồng bộ đám mây.');
    }

    const payload = await this.exportBackupPayload();
    const backupContent = JSON.stringify(payload, null, 2);

    // 1. Search for existing gist
    const listRes = await fetch('https://api.github.com/gists', {
      headers: {
        Authorization: `token ${token.trim()}`,
        'User-Agent': 'Antigravity-iOS',
      },
    });

    if (!listRes.ok) {
      throw new Error(`Lỗi kết nối GitHub (${listRes.status}): Token không hợp lệ hoặc đã hết hạn.`);
    }

    const gists: any[] = await listRes.json();
    const existingGist = gists.find(
      (g) => g.files && g.files[GIST_FILENAME] !== undefined
    );

    let gistId = '';

    if (existingGist) {
      // Update existing gist
      gistId = existingGist.id;
      const patchRes = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `token ${token.trim()}`,
          'User-Agent': 'Antigravity-iOS',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: GIST_DESCRIPTION,
          files: {
            [GIST_FILENAME]: {
              content: backupContent,
            },
          },
        }),
      });

      if (!patchRes.ok) {
        throw new Error(`Không thể cập nhật Gist (${patchRes.status}).`);
      }
    } else {
      // Create new secret gist
      const createRes = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: {
          Authorization: `token ${token.trim()}`,
          'User-Agent': 'Antigravity-iOS',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: GIST_DESCRIPTION,
          public: false,
          files: {
            [GIST_FILENAME]: {
              content: backupContent,
            },
          },
        }),
      });

      if (!createRes.ok) {
        throw new Error(`Không thể tạo Gist mới (${createRes.status}).`);
      }

      const created = await createRes.json();
      gistId = created.id;
    }

    await this.saveCloudToken(token.trim());
    await this.setLastSyncTime(Date.now());

    return { gistId, count: payload.devices.length };
  },

  /**
   * Pull and restore backup from GitHub Gist
   */
  async syncFromGitHubGist(tokenOverride?: string): Promise<{ devicesCount: number; updatedAt: string }> {
    const token = tokenOverride || (await this.getCloudToken());
    if (!token || !token.trim()) {
      throw new Error('Chưa có GitHub Token để khôi phục.');
    }

    const listRes = await fetch('https://api.github.com/gists', {
      headers: {
        Authorization: `token ${token.trim()}`,
        'User-Agent': 'Antigravity-iOS',
      },
    });

    if (!listRes.ok) {
      throw new Error(`Lỗi kết nối GitHub (${listRes.status}): Token không hợp lệ.`);
    }

    const gists: any[] = await listRes.json();
    const existingGist = gists.find(
      (g) => g.files && g.files[GIST_FILENAME] !== undefined
    );

    if (!existingGist || !existingGist.files[GIST_FILENAME].raw_url) {
      throw new Error('Không tìm thấy bản sao lưu Antigravity nào trên tài khoản GitHub này.');
    }

    // Fetch raw content
    const rawRes = await fetch(existingGist.files[GIST_FILENAME].raw_url);
    if (!rawRes.ok) {
      throw new Error('Không thể tải nội dung bản sao lưu từ Gist.');
    }

    const backupJson: BackupData = await rawRes.json();
    const result = await this.importBackup(backupJson);

    await this.saveCloudToken(token.trim());
    await this.setLastSyncTime(Date.now());

    return {
      devicesCount: result.devicesCount,
      updatedAt: existingGist.updated_at,
    };
  },

  async triggerAutoCloudSync(): Promise<void> {
    try {
      const settings = await this.getSettings();
      if (settings.autoCloudSync) {
        const token = await this.getCloudToken();
        if (token) {
          await this.syncToGitHubGist(token);
        }
      }
    } catch {
      // Background sync silent fail
    }
  },

  /**
   * Parse input from QR code, pasted link, or device name
   */
  parseRemoteInput(input: string): { url: string; deviceName: string } {
    let cleanInput = input.trim();

    // Check if input is a Backup string
    if (cleanInput.startsWith(BACKUP_PREFIX)) {
      return {
        url: cleanInput,
        deviceName: 'Backup Code',
      };
    }

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
