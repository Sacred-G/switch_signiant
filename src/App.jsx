import React, { useEffect, useState, Suspense } from 'react';
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
import DeliveryStatusPage from './pages/DeliveryStatusPage';
import TransferHistoryPage from './pages/TransferHistoryPage';
import JobSearchPage from './pages/JobSearchPage';
import RoutesPage from './pages/RoutesPage';
import StorageProfilesPage from './pages/StorageProfilesPage';
import UsersPage from './pages/UsersPage';
import EndpointsPage from './pages/EndpointsPage';
import NotificationsPage from './pages/NotificationsPage';
import { supabase } from './lib/supabase';
import { Loader2 } from 'lucide-react';

// Global Error Boundary Component
const ErrorFallback = ({ error, resetErrorBoundary }) => {
  console.error('Global Error:', error);
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-red-100">
      <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
      <pre className="text-red-500 mb-4">{error.message}</pre>
      <button 
        onClick={resetErrorBoundary} 
        className="px-4 py-2 bg-red-500 text-white rounded"
      >
        Try again
      </button>
    </div>
  );
};

const DashboardContainer = () => {
  console.log('DashboardContainer: Rendering');
  return (
    <DashboardLayout>
      <Suspense fallback={<div>Loading...</div>}>
        <Outlet />
      </Suspense>
    </DashboardLayout>
  );
};

const App = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState(null);

  console.log('App: Rendering');

  useEffect(() => {
    console.log('App: useEffect triggered');
    // Initialize authentication state and webhook subscription
    const initApp = async () => {
      try {
        // Only initialize Supabase auth state
        const { data: { session } } = await supabase.auth.getSession();
        
        // Set up auth state listener
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('Auth state changed:', event);
          
          if (window.electronAPI) {
            if (session) {
              await window.electronAPI.storeSession(session);
            } else {
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

    initApp();

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
    console.log('App: Showing loading state');
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Show error state if initialization failed
  if (initError) {
    console.error('App: Initialization error', initError);
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
          <Route path="/" element={<ProtectedRoute><DashboardContainer /></ProtectedRoute>}>
            <Route index element={<Navigate to="/transfers" replace />} />
            <Route path="jobs" element={<JobsPage />} />
            <Route path="transfers" element={<TransfersPage />} />
            <Route path="transfers/history" element={<TransferHistoryPage />} />
            <Route path="files" element={<FileMonitor />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="job-search" element={<JobSearchPage />} />
            <Route 
              path="delivery-status" 
              element={
                <React.Suspense fallback={<div>Loading Delivery Status...</div>}>
                  <DeliveryStatusPage />
                </React.Suspense>
              } 
            />
            {/* Management Routes */}
            <Route path="routes" element={<RoutesPage />} />
            <Route path="storage" element={<StorageProfilesPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="endpoints" element={<EndpointsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
          </Route>
        </Routes>
      </Router>
      <Toaster />
    </ThemeProvider>
  );
};

export default App;
