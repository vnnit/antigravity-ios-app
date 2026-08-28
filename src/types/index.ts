export interface RemoteDevice {
  id: string;
  name: string;
  url: string;
  lastConnectedAt: number;
  isFavorite?: boolean;
  notes?: string;
}

export interface AppSettings {
  autoConnectLastDevice: boolean;
  keepAwakeEnabled: boolean;
  hapticFeedback: boolean;
  desktopMode: boolean;
  cloudSyncToken?: string;
  autoCloudSync?: boolean;
}

export interface ScanResult {
  url: string;
  deviceName?: string;
}

export interface BackupData {
  version: number;
  exportedAt: number;
  devices: RemoteDevice[];
  settings: AppSettings;
  lastConnectedDevice?: RemoteDevice | null;
}
