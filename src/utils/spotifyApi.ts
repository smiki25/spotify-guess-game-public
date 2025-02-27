// services/spotifyApi.ts
import { getValidAccessToken } from './auth';

export const spotifyFetch = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  const token = await getValidAccessToken();
  
  const response = await fetch(url, {  
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    localStorage.removeItem('spotifyAccessToken');
    throw new Error('Authentication failed');
  }

  return response;
};