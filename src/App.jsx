import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import JobsPage from './pages/JobsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import TransferManager from './pages/transfersPage';
import ProtectedRoute from './components/ProtectedRoute';
import { Toaster } from "./components/ui/toaster";
import DashboardLayout from './components/layout/DashboardLayout';

function App() {
  return (
    <Router>
      <div>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <TransferManager />
              </ProtectedRoute>
            }
          />
          <Route
            path="/jobs"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <JobsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          {/* Redirect any unknown routes to transfers page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster />
      </div>
    </Router>
  );
}

export default App;
