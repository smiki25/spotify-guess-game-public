import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSpotifyAuth } from '../hooks/useSpotifyAuth';
import LoadingScreen from '../pages/LoadingPage';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { accessToken, isLoading } = useSpotifyAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!accessToken) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;