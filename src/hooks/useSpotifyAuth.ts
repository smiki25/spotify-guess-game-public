// hooks/useSpotifyAuth.ts
import { useState, useEffect } from 'react';
import { getValidAccessToken, isTokenExpired, refreshAccessToken } from '../utils/auth';

export const useSpotifyAuth = () => {
  const [accessToken, setAccessToken] = useState<string | null>(
    localStorage.getItem('spotifyAccessToken')
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAndRefreshToken = async () => {
      try {
        setIsLoading(true);
        
        if (accessToken && isTokenExpired()) { 
          console.log('Token is expired or about to expire, refreshing...');
          const newToken = await refreshAccessToken();
          setAccessToken(newToken);
        } else if (accessToken) {
          setAccessToken(accessToken);
        }
      } catch (err) {
        console.error('Token refresh error:', err);
        setError('Authentication failed. Please log in again.');
        setAccessToken(null);
        localStorage.removeItem('spotifyAccessToken');
        localStorage.removeItem('spotifyRefreshToken');
        localStorage.removeItem('spotifyTokenExpiresAt');
      } finally {
        setIsLoading(false);
      }
    };

    checkAndRefreshToken();
    
    const refreshInterval = setInterval(checkAndRefreshToken, 4 * 60 * 1000);
    
    return () => clearInterval(refreshInterval);
  }, [accessToken]);

  const getToken = async () => {
    try {
      if (isTokenExpired()) {
        const newToken = await refreshAccessToken();
        setAccessToken(newToken);
        return newToken;
      }
      return await getValidAccessToken();
    } catch (err) {
      console.error('Error getting valid token:', err);
      setError('Authentication failed. Please log in again.');
      setAccessToken(null);
      throw err;
    }
  };

  return {
    accessToken,
    isLoading,
    error,
    getToken,
  };
};