import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { SigniantAuth } from '../services/auth';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children }) => {
  const [authState, setAuthState] = useState({
    isAuthenticated: null,
    isLoading: true
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuthenticated = await SigniantAuth.isAuthenticated();
        setAuthState({
          isAuthenticated,
          isLoading: false
        });
      } catch (error) {
        console.error('Authentication check failed:', error);
        setAuthState({
          isAuthenticated: false,
          isLoading: false
        });
      }
    };

    checkAuth();
  }, []);

  if (authState.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!authState.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
