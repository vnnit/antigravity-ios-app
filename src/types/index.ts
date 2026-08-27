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
}

export interface ScanResult {
  url: string;
  deviceName?: string;
}
