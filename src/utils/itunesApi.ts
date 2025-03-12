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
    console.log('Fetching chart songs');
    
    // Use a genre-specific chart (all genres = 34)
    const url = `${API_BASE_URL}/rss/topsongs/limit=50/genre=34/json`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.log('iTunes chart API failed, falling back to search for popular artists');
      // Fallback to getting songs from popular artists
      const popularArtistsSongs = await getPopularArtistsSongs();
      return popularArtistsSongs;
    }
    
    const data = await response.json();
    return data.feed?.entry?.map(convertFeedEntryToSong) || [];
  } catch (error) {
    console.error('Error fetching chart songs, trying fallback:', error);
    // Fallback to getting songs from popular artists
    const popularArtistsSongs = await getPopularArtistsSongs();
    return popularArtistsSongs;
  }
};

/**
 * Fallback function to get songs from a list of popular artists
 */
const getPopularArtistsSongs = async (): Promise<iTunesSong[]> => {
  const popularArtists = [
    'Drake', 'Taylor Swift', 'The Weeknd', 'Billie Eilish', 
    'Ariana Grande', 'Post Malone', 'Ed Sheeran', 'Bad Bunny'
  ];
  
  let allSongs: iTunesSong[] = [];
  
  // Get 10 songs from each artist
  for (const artist of popularArtists) {
    try {
      const url = `${API_BASE_URL}/search?term=${encodeURIComponent(artist)}&entity=song&limit=10`;
      const response = await fetch(url);
      
      if (response.ok) {
        const data: iTunesResponse<iTunesSong> = await response.json();
        allSongs = [...allSongs, ...data.results];
      }
    } catch (e) {
      console.error(`Error fetching songs for ${artist}:`, e);
    }
  }
  
  return allSongs;
};

/**
 * Utility function to convert iTunes feed entry to song format
 */
const convertFeedEntryToSong = (entry: any): iTunesSong => {
  return {
    wrapperType: 'track',
    kind: 'song',
    artistId: parseInt(entry?.['im:artist']?.attributes?.['im:id'] || 0),
    collectionId: 0,
    trackId: parseInt(entry?.id?.attributes?.['im:id'] || 0),
    artistName: entry?.['im:artist']?.label || 'Unknown Artist',
    collectionName: entry?.['im:collection']?.['im:name']?.label || 'Unknown Album',
    trackName: entry?.['im:name']?.label || 'Unknown Track',
    collectionCensoredName: entry?.['im:collection']?.['im:name']?.label || 'Unknown Album',
    trackCensoredName: entry?.['im:name']?.label || 'Unknown Track',
    artistViewUrl: entry?.['im:artist']?.attributes?.href || '',
    collectionViewUrl: entry?.['im:collection']?.link?.attributes?.href || '',
    trackViewUrl: entry?.link?.attributes?.href || '',
    previewUrl: entry?.link?.['im:preview']?.link?.attributes?.href || '',
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
    isStreamable: true
  };
};