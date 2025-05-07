/* eslint-disable @typescript-eslint/no-explicit-any */
// utils/itunesApi.ts

const API_BASE_URL = 'https://itunes.apple.com';

export interface iTunesArtist {
  artistId: number;
  artistName: string;
  artistLinkUrl: string;
  primaryGenreName: string;
  primaryGenreId: number;
  amgArtistId?: number;
  artistType?: string;
  wrapperType: string;
}

export interface iTunesSong {
  wrapperType: string;
  kind: string;
  artistId: number;
  collectionId: number;
  trackId: number;
  artistName: string;
  collectionName: string;
  trackName: string;
  collectionCensoredName: string;
  trackCensoredName: string;
  artistViewUrl: string;
  collectionViewUrl: string;
  trackViewUrl: string;
  previewUrl: string;
  artworkUrl30: string;
  artworkUrl60: string;
  artworkUrl100: string;
  collectionPrice: number;
  trackPrice: number;
  releaseDate: string;
  collectionExplicitness: string;
  trackExplicitness: string;
  discCount: number;
  discNumber: number;
  trackCount: number;
  trackNumber: number;
  trackTimeMillis: number;
  country: string;
  currency: string;
  primaryGenreName: string;
  isStreamable: boolean;
}

interface iTunesResponse<T> {
  resultCount: number;
  results: T[];
}

/**
 * Search for artists by name, ordered by popularity
 */
export const searchArtists = async (query: string): Promise<iTunesArtist[]> => {
  try {
    console.log(`Searching for artists: ${query}`);
    
    // If query is empty, return empty array
    if (!query.trim()) return [];
    
    // We use entity=musicArtist to ensure we only get artists
    const url = `${API_BASE_URL}/search?term=${encodeURIComponent(query)}&entity=musicArtist&limit=5`;
    const response = await fetch(url);
    
    if (!response.ok) throw new Error('Failed to search artists');
    const data: iTunesResponse<iTunesArtist> = await response.json();
    console.log('Artist search response:', data);
    
    return data.results || [];
  } catch (error) {
    console.error('Error searching artists:', error);
    return [];
  }
};

/**
 * Get songs by an artist
 */
export const getArtistSongs = async (artistId: number): Promise<iTunesSong[]> => {
  try {
    console.log(`Fetching songs for artist ID: ${artistId}`);
    
    // We use entity=song to get only songs, not albums or other media types
    const url = `${API_BASE_URL}/lookup?id=${artistId}&entity=song&limit=100`;
    const response = await fetch(url);
    
    if (!response.ok) throw new Error(`Failed to fetch songs for artist ${artistId}`);
    const data: iTunesResponse<iTunesSong> = await response.json();
    
    // Filter out the first result which is usually the artist info
    const songs = data.results.filter(item => item.wrapperType === 'track' && item.kind === 'song');
    
    return songs || [];
  } catch (error) {
    console.error('Error fetching artist songs:', error);
    return [];
  }
};

/**
 * Get top songs from iTunes Charts
 */
export const getChartSongs = async (): Promise<iTunesSong[]> => {
  try {
    console.log('Attempting to fetch chart songs from iTunes RSS feed...');
    
    // Use a genre-specific chart (all genres = 34)
    const url = `${API_BASE_URL}/rss/topsongs/limit=50/genre=34/json`;
    
    // Fetch with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.warn(`iTunes chart API failed with status ${response.status}. Falling back to popular artists.`);
      const popularArtistsSongs = await getPopularArtistsSongs();
      return popularArtistsSongs;
    }
    
    const data = await response.json();
    
    if (!data.feed || !data.feed.entry || data.feed.entry.length === 0) {
      console.warn('iTunes chart feed was empty or malformed. Falling back to popular artists.');
      const popularArtistsSongs = await getPopularArtistsSongs();
      return popularArtistsSongs;
    }
    
    console.log(`Successfully fetched ${data.feed.entry.length} chart songs from RSS.`);
    return data.feed.entry.map(convertFeedEntryToSong).filter((song: iTunesSong) => song.previewUrl); // Ensure preview URL exists
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.warn('iTunes chart API request timed out. Falling back to popular artists.');
    } else {
      console.error('Error fetching chart songs, trying fallback:', error);
    }
    const popularArtistsSongs = await getPopularArtistsSongs();
    return popularArtistsSongs;
  }
};

/**
 * Fallback function to get songs from a list of popular artists
 */
const getPopularArtistsSongs = async (): Promise<iTunesSong[]> => {
  console.log('Executing fallback: Fetching songs from popular artists.');
  const popularArtists = [
    'Drake', 'Taylor Swift', 'The Weeknd', 'Billie Eilish', 
    'Ariana Grande', 'Post Malone', 'Ed Sheeran', 'Bad Bunny',
    'Olivia Rodrigo', 'Dua Lipa' // Added more variety
  ];
  
  let allSongs: iTunesSong[] = [];
  
  // Fetch fewer songs per artist to speed up fallback
  const promises = popularArtists.map(async (artist) => {
    try {
      const url = `${API_BASE_URL}/search?term=${encodeURIComponent(artist)}&entity=song&limit=5`; // Limit to 5 per artist
      const response = await fetch(url);
      
      if (response.ok) {
        const data: iTunesResponse<iTunesSong> = await response.json();
        // Filter for songs with preview URLs right away
        return data.results.filter(song => song.wrapperType === 'track' && song.kind === 'song' && song.previewUrl);
      } else {
        console.warn(`Failed to fetch songs for popular artist ${artist}: Status ${response.status}`);
        return [];
      }
    } catch (e) {
      console.error(`Error fetching songs for ${artist}:`, e);
      return [];
    }
  });
  
  const results = await Promise.all(promises);
  allSongs = results.flat(); // Flatten the array of arrays

  console.log(`Fallback fetched ${allSongs.length} songs from popular artists.`);
  
  // Shuffle the results to make it less predictable
  for (let i = allSongs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allSongs[i], allSongs[j]] = [allSongs[j], allSongs[i]];
  }
  
  return allSongs.slice(0, 50); // Limit total fallback songs
};

/**
 * Utility function to convert iTunes feed entry to song format
 */
const convertFeedEntryToSong = (entry: any): iTunesSong => {
  // Extract preview URL safely
  let previewUrl = '';
  if (entry?.link) {
    // The preview link might be nested differently
    const previewLink = Array.isArray(entry.link) 
      ? entry.link.find((l: any) => l?.attributes?.rel === 'enclosure' && l?.attributes?.type?.startsWith('audio')) 
      : (entry.link?.attributes?.rel === 'enclosure' && entry.link?.attributes?.type?.startsWith('audio')) ? entry.link : null;
    
    previewUrl = previewLink?.attributes?.href || '';
  }
  
  // If previewUrl is still empty, check im:preview (less common)
  if (!previewUrl && entry?.['im:preview']?.link?.attributes?.href) {
     previewUrl = entry['im:preview'].link.attributes.href;
  }
  
  return {
    wrapperType: 'track',
    kind: 'song',
    artistId: parseInt(entry?.['im:artist']?.attributes?.['im:id'] || entry?.['im:artist']?.attributes?.href?.split('/').pop()?.split('?')[0] || '0'),
    collectionId: parseInt(entry?.['im:collection']?.attributes?.['im:id'] || entry?.['im:collection']?.link?.attributes?.href?.split('/').pop()?.split('?')[0] || '0'),
    trackId: parseInt(entry?.id?.attributes?.['im:id'] || '0'),
    artistName: entry?.['im:artist']?.label || 'Unknown Artist',
    collectionName: entry?.['im:collection']?.['im:name']?.label || 'Unknown Album',
    trackName: entry?.['im:name']?.label || 'Unknown Track',
    collectionCensoredName: entry?.['im:collection']?.['im:name']?.label || 'Unknown Album',
    trackCensoredName: entry?.['im:name']?.label || 'Unknown Track',
    artistViewUrl: entry?.['im:artist']?.attributes?.href || '',
    collectionViewUrl: entry?.['im:collection']?.link?.attributes?.href || '',
    trackViewUrl: entry?.link?.[0]?.attributes?.href || entry?.link?.attributes?.href || '', // Try array and direct access for link
    previewUrl: previewUrl, // Use the extracted preview URL
    artworkUrl30: entry?.['im:image']?.[0]?.label || '',
    artworkUrl60: entry?.['im:image']?.[1]?.label || '',
    artworkUrl100: entry?.['im:image']?.[2]?.label || '',
    collectionPrice: parseFloat(entry?.['im:price']?.attributes?.amount || '0'),
    trackPrice: parseFloat(entry?.['im:price']?.attributes?.amount || '0'),
    releaseDate: entry?.['im:releaseDate']?.label || '',
    collectionExplicitness: entry?.['im:contentType']?.attributes?.term || '',
    trackExplicitness: entry?.['im:contentType']?.attributes?.term || '',
    discCount: 1,
    discNumber: 1,
    trackCount: 1,
    trackNumber: 1,
    trackTimeMillis: 30000, // Assume 30 seconds for preview
    country: entry?.country?.label || 'US',
    currency: entry?.['im:price']?.attributes?.currency || 'USD',
    primaryGenreName: entry?.category?.attributes?.label || 'Unknown Genre',
    isStreamable: !!previewUrl // Determine streamable based on previewUrl presence
  };
};