import React from 'react';
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

const DashboardContainer = () => {
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
};

const App = () => {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<ProtectedRoute><DashboardContainer /></ProtectedRoute>}>
            <Route index element={<Navigate to="/transfers" replace />} />
            <Route path="jobs" element={<JobsPage />} />
            <Route path="transfers" element={<TransfersPage />} />
            <Route path="monitor" element={<FileMonitor />} />
            <Route path="analytics" element={<AnalyticsPage />} />
          </Route>
        </Routes>
      </Router>
      <Toaster />
    </ThemeProvider>
  );
};

export default App;
