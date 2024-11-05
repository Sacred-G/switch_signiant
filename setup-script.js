import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function setupSigniantDashboard() {
    try {
        // Files to remove
        const filesToRemove = [
            'src/assets',
            'src/App.css',
            'public/vite.svg',
            'src/index.css',
            'src/App.jsx',
        ];

        // Directories to create
        const dirsToCreate = [
            'src/components',
            'src/lib',
            'src/components/ui'
        ];

        // Clean up unnecessary files
        console.log('🗑️  Removing unnecessary files...');
        for (const file of filesToRemove) {
            try {
                await fs.rm(file, { recursive: true, force: true });
                console.log(`   Removed ${file}`);
            } catch (error) {
                console.log(`   Skipped ${file} (not found)`);
            }
        }

        // Create new directories
        console.log('\n📁 Creating directory structure...');
        for (const dir of dirsToCreate) {
            try {
                await fs.mkdir(dir, { recursive: true });
                console.log(`   Created ${dir}`);
            } catch (error) {
                console.log(`   Skipped ${dir} (already exists)`);
            }
        }

        // Create necessary files
        console.log('\n📝 Creating new files...');

        // Create .env
        const envContent = `VITE_SIGNIANT_CLIENT_ID=your_client_id_here
VITE_SIGNIANT_CLIENT_SECRET=your_client_secret_here
VITE_SIGNIANT_API_URL=https://platform-api-service.services.cloud.signiant.com`;
        
        await fs.writeFile('.env', envContent);
        console.log('   Created .env');

        // Create .gitignore
        const gitignoreContent = `# dependencies
/node_modules

# environment variables
.env
.env.local
.env.*.local

# build output
/dist

# logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?`;

        await fs.writeFile('.gitignore', gitignoreContent);
        console.log('   Created .gitignore');

        // Create index.css
        const indexCssContent = `@tailwind base;
@tailwind components;
@tailwind utilities;`;

        await fs.writeFile('src/index.css', indexCssContent);
        console.log('   Created src/index.css');

        // Create SigniantAuth class
        const signiantAuthContent = `export class SigniantAuth {
  constructor() {
    this.clientId = import.meta.env.VITE_SIGNIANT_CLIENT_ID;
    this.clientSecret = import.meta.env.VITE_SIGNIANT_CLIENT_SECRET;
    this.baseUrl = import.meta.env.VITE_SIGNIANT_API_URL;
    this.tokenUrl = \`\${this.baseUrl}/oauth/token\`;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  async getAccessToken() {
    if (!this.accessToken || new Date() >= this.tokenExpiry) {
      await this.refreshToken();
    }
    return this.accessToken;
  }

  async refreshToken() {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    const body = JSON.stringify({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'client_credentials'
    });

    try {
      const response = await fetch(this.tokenUrl, {
        method: 'POST',
        headers,
        body
      });
      
      if (!response.ok) {
        throw new Error(\`HTTP error! status: \${response.status}\`);
      }
      
      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = new Date(Date.now() + (data.expires_in - 300) * 1000);
    } catch (error) {
      throw new Error(\`Failed to obtain access token: \${error.message}\`);
    }
  }

  async getAuthHeader() {
    const token = await this.getAccessToken();
    return {
      'Authorization': \`Bearer \${token}\`,
      'Content-Type': 'application/json'
    };
  }
}`;

        await fs.writeFile('src/lib/signiant.js', signiantAuthContent);
        console.log('   Created src/lib/signiant.js');

        // Create SidebarItem component
        const sidebarItemContent = `import React from 'react';

export const SidebarItem = ({ icon, text, active = false }) => (
  <div
    className={\`flex items-center px-6 py-3 cursor-pointer \${
      active ? 'bg-gray-100 text-indigo-600' : 'text-gray-600 hover:bg-gray-50'
    }\`}
  >
    <span className="mr-3">{icon}</span>
    <span className="text-sm font-medium">{text}</span>
  </div>
);`;

        await fs.writeFile('src/components/SidebarItem.jsx', sidebarItemContent);
        console.log('   Created src/components/SidebarItem.jsx');

        // Create Dashboard component
        const dashboardContent = `import React, { useState, useEffect } from 'react';
import { Settings, Upload, FolderOpen, List, Home } from 'lucide-react';
import { SigniantAuth } from '../lib/signiant';
import { SidebarItem } from './SidebarItem';

const Dashboard = () => {
  const [sourceProfiles, setSourceProfiles] = useState([]);
  const [destinationProfiles, setDestinationProfiles] = useState([]);
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedDestination, setSelectedDestination] = useState('');
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Initialize SigniantAuth instance
  const auth = new SigniantAuth();

  useEffect(() => {
    fetchStorageProfiles();
  }, []);

  const fetchStorageProfiles = async () => {
    try {
      const headers = await auth.getAuthHeader();
      const response = await fetch(
        \`\${import.meta.env.VITE_SIGNIANT_API_URL}/v1/storageProfiles\`,
        { headers }
      );
      
      if (!response.ok) {
        throw new Error(\`HTTP error! status: \${response.status}\`);
      }
      
      const data = await response.json();
      
      // Split profiles into source (On-Premise) and destination (AWS S3)
      const sources = data.items.filter(p => p.type === 'ON_PREMISE');
      const destinations = data.items.filter(p => p.type === 'AWS_S3');
      
      setSourceProfiles(sources);
      setDestinationProfiles(destinations);
    } catch (error) {
      setError('Failed to fetch storage profiles');
      console.error(error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!fileName.endsWith('.mxf')) {
      setError('File must have .mxf extension');
      setLoading(false);
      return;
    }

    try {
      const headers = await auth.getAuthHeader();
      const jobBody = {
        name: fileName,
        actions: [{
          type: "TRANSFER",
          data: {
            source: {
              storageProfileId: selectedSource
            },
            destination: {
              storageProfileId: selectedDestination
            },
            transferOptions: {
              objectPatterns: {
                inclusions: [fileName],
                type: "GLOB"
              }
            }
          },
          triggers: [{
            type: "HOT_FOLDER",
            data: {
              source: {
                storageProfileId: selectedSource
              }
            }
          }]
        }]
      };

      const response = await fetch(
        \`\${import.meta.env.VITE_SIGNIANT_API_URL}/v1/jobs\`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(jobBody)
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create job');
      }

      const data = await response.json();

      // Reset form
      setFileName('');
      setSelectedSource('');
      setSelectedDestination('');
      
      // Show success message
      alert(\`Job created successfully! Job ID: \${data.jobId}\`);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6">
          <div className="text-xl font-bold">Dashboard</div>
        </div>
        <nav className="mt-6">
          <SidebarItem icon={<Home size={20} />} text="Dashboard" active />
          <SidebarItem icon={<Upload size={20} />} text="Upload Files" />
          <SidebarItem icon={<FolderOpen size={20} />} text="File Manager" />
          <SidebarItem icon={<List size={20} />} text="Jobs" />
          <SidebarItem icon={<Settings size={20} />} text="Settings" />
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 p-8">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-semibold mb-6">Create Transfer Job</h1>
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Source Profile */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Source Profile (On-Premise)
                </label>
                <select
                  value={selectedSource}
                  onChange={(e) => setSelectedSource(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  required
                >
                  <option value="">Select source profile</option>
                  {sourceProfiles.map(profile => (
                    <option key={profile.storageProfileId} value={profile.storageProfileId}>
                      {profile.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Destination Profile */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Destination Profile (AWS S3)
                </label>
                <select
                  value={selectedDestination}
                  onChange={(e) => setSelectedDestination(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  required
                >
                  <option value="">Select destination profile</option>
                  {destinationProfiles.map(profile => (
                    <option key={profile.storageProfileId} value={profile.storageProfileId}>
                      {profile.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* MXF File Name */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  MXF File Name
                </label>
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="Enter filename (e.g., DELETETEST_10242024_01d.mxf)"
                  className="w-full p-2 border rounded-md"
                  required
                />
                <p className="mt-1 text-sm text-gray-500">
                  File must have .mxf extension
                </p>
              </div>

              {error && (
                <div className="text-red-500 text-sm">{error}</div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Transfer Job'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;`;

        await fs.writeFile('src/components/Dashboard.jsx', dashboardContent);
        console.log('   Created src/components/Dashboard.jsx');

        // Create App.jsx
        const appContent = `import React from 'react';
import Dashboard from './components/Dashboard';

function App() {
  return (
    <Dashboard />
  );
}

export default App;`;

        await fs.writeFile('src/App.jsx', appContent);
        console.log('   Created src/App.jsx');

        // Update tailwind.config.js
        const tailwindConfig = `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}`;

        await fs.writeFile('tailwind.config.js', tailwindConfig);
        console.log('   Updated tailwind.config.js');

        console.log('\n✅ Setup completed successfully!');
        console.log('\n📋 Next steps:');
        console.log('1. Update the .env file with your Signiant credentials');
        console.log('2. Run npm install to install dependencies');
        console.log('3. Run npm run dev to start the development server');

    } catch (error) {
        console.error('❌ Error during setup:', error);
    }
}

setupSigniantDashboard();