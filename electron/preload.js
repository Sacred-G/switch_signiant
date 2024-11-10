const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    // Window controls
    minimizeWindow: () => ipcRenderer.send('minimize-window'),
    maximizeWindow: () => ipcRenderer.send('maximize-window'),
    closeWindow: () => ipcRenderer.send('close-window'),
    isMaximized: () => ipcRenderer.invoke('is-maximized'),

    // Auth & Session Management
    storeSession: (session) => ipcRenderer.invoke('store-session', session),
    getStoredSession: () => ipcRenderer.invoke('get-stored-session'),
    clearSession: () => ipcRenderer.invoke('clear-session'),

    // App State & Environment
    getPlatform: () => process.platform,
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    isDevelopment: () => process.env.NODE_ENV === 'development',

    // IPC Communication
    send: (channel, data) => {
        // Whitelist channels
        const validChannels = ['toMain', 'auth-event', 'log-out']
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data)
        }
    },
    receive: (channel, func) => {
        // Whitelist channels
        const validChannels = ['fromMain', 'auth-response', 'error']
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, (event, ...args) => func(...args))
        }
    },

    // Deep linking (for OAuth)
    handleAuthCallback: (callback) => {
        ipcRenderer.on('auth-callback', callback)
    },

    // Error Handling
    onError: (callback) => {
        ipcRenderer.on('error', callback)
    },

    // System Information
    getSystemInfo: () => ipcRenderer.invoke('get-system-info'),

    // File Operations
    readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
    writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),
    selectDirectory: () => ipcRenderer.invoke('select-directory'),

    // Notifications
    sendNotification: (options) => ipcRenderer.invoke('send-notification', options)
})