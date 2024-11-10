import React, { useState, useEffect } from 'react';
import { SigniantAuth } from '../services/auth';
import { getSigniantHeaders } from './signiant';
import { Navigate, useLocation } from 'react-router-dom';

interface WithAuthProps {
  [key: string]: any;
}

export const withAuth = (WrappedComponent: React.ComponentType<WithAuthProps>) => {
  return (props: WithAuthProps) => {
    const location = useLocation();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      const checkAuth = async () => {
        try {
          const isAuthed = await SigniantAuth.isAuthenticated();
          setIsAuthenticated(isAuthed);
        } catch (error) {
          console.error('Auth check failed:', error);
          setIsAuthenticated(false);
        } finally {
          setIsLoading(false);
        }
      };

      checkAuth();
    }, []);

    if (isLoading) {
      return <div>Loading...</div>;
    }

    if (!isAuthenticated) {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <WrappedComponent {...props} />;
  };
};
