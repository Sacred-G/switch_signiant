// setup-electron.js
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function setupElectron() {
    try {
        console.log('🚀 Starting Electron setup...\n');

        // 1. Create necessary directories
        console.log('📁 Creating directories...');
        await fs.mkdir('electron', { recursive: true });
        await fs.mkdir('build', { recursive: true });
        console.log('✅ Directories created\n');

        // 2. Create main.js
        console.log('📝 Creating Electron main.js...');
        const mainJs = `const { app, BrowserWindow } = require('electron')
const path = require('path')

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    })

    if (process.env.NODE_ENV === 'production') {
        win.loadFile('dist/index.html')
    } else {
        win.loadURL('http://localhost:5173')
    }
}

app.whenReady().then(() => {
    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})`;

        await fs.writeFile('electron/main.js', mainJs);
        console.log('✅ main.js created\n');

        // 3. Create electron/package.json
        console.log('📝 Creating Electron package.json...');
        const electronPackageJson = {
            "name": "signiant-dashboard-desktop",
            "version": "1.0.0",
            "description": "Signiant Dashboard Desktop App",
            "main": "main.js",
            "scripts": {
                "start": "electron .",
                "pack": "electron-builder --dir",
                "dist": "electron-builder"
            },
            "build": {
                "appId": "com.signiant.dashboard",
                "productName": "Signiant Dashboard",
                "directories": {
                    "output": "release"
                },
                "files": [
                    "main.js",
                    "dist/**/*",
                    "node_modules/**/*"
                ],
                "win": {
                    "target": "nsis",
                    "icon": "build/icon.ico"
                },
                "mac": {
                    "target": "dmg",
                    "icon": "build/icon.icns"
                },
                "linux": {
                    "target": "AppImage",
                    "icon": "build/icon.png"
                }
            },
            "devDependencies": {
                "electron": "^28.1.0",
                "electron-builder": "^24.9.1"
            }
        };

        await fs.writeFile('electron/package.json', JSON.stringify(electronPackageJson, null, 2));
        console.log('✅ electron/package.json created\n');

        // 4. Update main package.json scripts
        console.log('📝 Updating main package.json...');
        const mainPackageJsonPath = path.join(process.cwd(), 'package.json');
        const mainPackageJson = JSON.parse(await fs.readFile(mainPackageJsonPath, 'utf8'));

        mainPackageJson.scripts = {
            ...mainPackageJson.scripts,
            "electron:dev": "NODE_ENV=development electron electron/main.js",
            "electron:build": "vite build && cd electron && npm run dist"
        };

        await fs.writeFile(mainPackageJsonPath, JSON.stringify(mainPackageJson, null, 2));
        console.log('✅ Main package.json updated\n');

        // 5. Create placeholder icons
        console.log('📝 Creating placeholder icons...');
        // Create empty placeholder files - you'll need to replace these with real icons
        await fs.writeFile('build/icon.ico', '');
        await fs.writeFile('build/icon.icns', '');
        await fs.writeFile('build/icon.png', '');
        console.log('✅ Placeholder icons created\n');

        // 6. Update vite.config.js
        console.log('📝 Updating vite.config.js...');
        const viteConfig = await fs.readFile('vite.config.ts', 'utf8');
        const updatedViteConfig = viteConfig.replace(
            'export default defineConfig({',
            `export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },`
        );
        await fs.writeFile('vite.config.ts', updatedViteConfig);
        console.log('✅ vite.config.js updated\n');

        // 7. Install dependencies
        console.log('📦 Installing Electron dependencies...');
        try {
            await execAsync('npm install electron electron-builder --save-dev');
            console.log('✅ Dependencies installed\n');

            // Also install electron directory dependencies
            console.log('📦 Installing Electron directory dependencies...');
            process.chdir('electron');
            await execAsync('npm install');
            process.chdir('..');
            console.log('✅ Electron directory dependencies installed\n');
        } catch (error) {
            console.error('❌ Error installing dependencies:', error.message);
            throw error;
        }

        console.log('🎉 Setup completed successfully!\n');
        console.log('Next steps:');
        console.log('1. Replace placeholder icons in the build directory with your actual icons:');
        console.log('   - build/icon.ico for Windows');
        console.log('   - build/icon.icns for macOS');
        console.log('   - build/icon.png for Linux');
        console.log('\n2. Test the development build:');
        console.log('   npm run electron:dev');
        console.log('\n3. Create production executable:');
        console.log('   npm run electron:build');
        console.log('\nThe executable will be created in electron/release directory');

    } catch (error) {
        console.error('❌ Setup failed:', error);
        process.exit(1);
    }
}

setupElectron();