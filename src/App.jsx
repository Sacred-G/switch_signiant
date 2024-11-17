import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeProvider';
import { Toaster } from './components/ui/toaster';
import DashboardLayout from './components/layout/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import JobsPage from './pages/JobsPage';
import TransfersPage from './pages/transfersPage';
import FileMonitor from './pages/FileMonitor';
import AnalyticsPage from './pages/AnalyticsPage';
import { SigniantAuth } from './services/auth.ts';
import { Loader2 } from 'lucide-react';

const DashboardContainer = () => {
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
};

const App = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState(null);

  useEffect(() => {
    // Initialize authentication state
    const initAuth = async () => {
      try {
        await SigniantAuth.initialize();
        
        // Set up auth state listener
        const { data: authListener } = SigniantAuth.onAuthStateChange(async (event, session) => {
          console.log('Auth state changed:', event);
          
          if (session) {
            // Store session in electron if available
            if (window.electronAPI) {
              await window.electronAPI.storeSession(session);
            }
          } else {
            // Clear session from electron store if available
            if (window.electronAPI) {
              await window.electronAPI.clearSession();
            }
          }
        });

        setIsInitialized(true);

        // Clean up listener on unmount
        return () => {
          authListener?.subscription?.unsubscribe();
        };
      } catch (error) {
        console.error('Auth initialization error:', error);
        setInitError(error.message);
        setIsInitialized(true); // Set initialized even on error to show error state
      }
    };

    initAuth();

    // Handle window controls
    const setupWindowControls = () => {
      if (window.electronAPI) {
        window.electronAPI.onError((error) => {
          console.error('Electron error:', error);
        });
      }
    };

    setupWindowControls();
  }, []);

  // Show loading state while initializing
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Show error state if initialization failed
  if (initError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-xl font-bold text-red-500 mb-4">Failed to initialize application</h1>
        <p className="text-gray-600">{initError}</p>
      </div>
    );
  }

  return (
    <ThemeProvider 
      defaultTheme="dark" 
      storageKey="vite-ui-theme"
      onThemeChange={(theme) => {
        if (window.electronAPI) {
          window.electronAPI.send('theme-changed', theme);
        }
      }}
    >
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <DashboardContainer />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/transfers" replace />} />
            <Route path="jobs" element={<JobsPage />} />
            <Route path="transfers" element={<TransfersPage />} />
            <Route path="files" element={<FileMonitor />} />
            <Route path="analytics" element={<AnalyticsPage />} />
          </Route>
        </Routes>
      </Router>
      <Toaster />
    </ThemeProvider>
  );
};

export default App;
