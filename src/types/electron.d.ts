declare global {
  interface ElectronAPI {
    storeSession: (session: any) => Promise<void>;
    getStoredSession: () => Promise<any>;
    clearSession: () => Promise<void>;
    isDevelopment: () => Promise<boolean>;
    send: (channel: string, data?: any) => void;
    handleAuthCallback: (callback: (event: any, data: any) => void) => void;
  }

  interface Window {
    electronAPI: ElectronAPI;
  }
}
