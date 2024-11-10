const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs').promises

// Use dynamic import for electron-store
let Store;
let store;
(async () => {
  Store = (await import('electron-store')).default;
  store = new Store();
})();

const isDev = process.env.NODE_ENV === 'development'

let mainWindow = null

// IPC Handlers
function setupIPCHandlers() {
  // App version
  ipcMain.handle('get-app-version', () => app.getVersion())

  // Window controls
  ipcMain.on('minimize-window', () => {
    if (mainWindow) mainWindow.minimize()
  })

  ipcMain.on('maximize-window', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize()
      } else {
        mainWindow.maximize()
      }
    }
  })

  ipcMain.on('close-window', () => {
    if (mainWindow) mainWindow.close()
  })

  ipcMain.handle('is-maximized', () => {
    return mainWindow ? mainWindow.isMaximized() : false
  })

  // Session management
  ipcMain.handle('store-session', async (event, session) => {
    try {
      store.set('session', session)
      return true
    } catch (error) {
      console.error('Failed to store session:', error)
      throw error
    }
  })

  ipcMain.handle('get-stored-session', () => {
    try {
      return store.get('session')
    } catch (error) {
      console.error('Failed to get stored session:', error)
      throw error
    }
  })

  ipcMain.handle('clear-session', () => {
    try {
      store.delete('session')
      return true
    } catch (error) {
      console.error('Failed to clear session:', error)
      throw error
    }
  })

  // File operations
  ipcMain.handle('read-file', async (event, filePath) => {
    try {
      const data = await fs.readFile(filePath, 'utf8')
      return data
    } catch (error) {
      console.error('Failed to read file:', error)
      throw error
    }
  })

  ipcMain.handle('write-file', async (event, filePath, data) => {
    try {
      await fs.writeFile(filePath, data, 'utf8')
      return true
    } catch (error) {
      console.error('Failed to write file:', error)
      throw error
    }
  })

  ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    })
    return result.filePaths[0]
  })

  // System info
  ipcMain.handle('get-system-info', () => {
    return {
      platform: process.platform,
      arch: process.arch,
      version: app.getVersion(),
      electronVersion: process.versions.electron,
      chromeVersion: process.versions.chrome,
      nodeVersion: process.versions.node
    }
  })

  // Notifications
  ipcMain.handle('send-notification', (event, options) => {
    const notification = new Notification(options)
    notification.show()
    return true
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady()
  .then(() => {
    setupIPCHandlers()
    createWindow()
  })
  .catch(console.error)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
