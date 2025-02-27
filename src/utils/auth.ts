// services/spotifyAuth.ts

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;
const AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize';
const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';
const SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-top-read',
  'user-read-playback-state',
  'user-modify-playback-state',
  'streaming',
].join(' ');

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export const getSpotifyAuthUrl = (): string => {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    show_dialog: 'true',
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
};

const saveTokenData = (data: TokenResponse) => {
  const expiresAt = new Date().getTime() + data.expires_in * 1000;
  localStorage.setItem('spotifyAccessToken', data.access_token);
  localStorage.setItem('spotifyRefreshToken', data.refresh_token);
  localStorage.setItem('spotifyTokenExpiresAt', expiresAt.toString());
};

export const getAccessToken = async (code: string): Promise<string> => {
  const response = await fetch(TOKEN_ENDPOINT, {  
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });

  if (!response.ok) throw new Error('Failed to fetch access token');
  const data: TokenResponse = await response.json();
  saveTokenData(data);
  return data.access_token;
};

export const refreshAccessToken = async (): Promise<string> => {
  const refreshToken = localStorage.getItem('spotifyRefreshToken');
  if (!refreshToken) throw new Error('No refresh token available');

  const response = await fetch(TOKEN_ENDPOINT, { 
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    localStorage.removeItem('spotifyAccessToken');
    localStorage.removeItem('spotifyRefreshToken');
    localStorage.removeItem('spotifyTokenExpiresAt');
    throw new Error('Failed to refresh token');
  }

  const data: TokenResponse = await response.json();
  saveTokenData(data);
  return data.access_token;
};

export const isTokenExpired = (): boolean => {
  const expiresAt = localStorage.getItem('spotifyTokenExpiresAt');
  if (!expiresAt) return true;
  return new Date().getTime() > parseInt(expiresAt);
};

export const getValidAccessToken = async (): Promise<string> => {
  const accessToken = localStorage.getItem('spotifyAccessToken');
  if (!accessToken) throw new Error('No access token available');

  if (isTokenExpired()) {
    return await refreshAccessToken();
  }

  return accessToken;
};