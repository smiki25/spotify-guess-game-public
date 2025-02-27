import { useState, useEffect, useCallback, useRef } from 'react';
import { spotifyFetch } from '../utils/spotifyApi';

interface Artist {
  id: string;
  name: string;
}

interface Album {
  id: string;
  name: string;
  images: { url: string }[];
  tracks: {
    items: Track[];
  };
  artists: Artist[]; 
  album_type: string;
}

interface SimplifiedAlbum {
  id: string;
  name: string;
  images: { url: string }[];
  artists: Artist[];
  album_type: string;
}

interface Track {
  id: string;
  name: string;
  preview_url: string;
  uri: string;
  duration_ms: number;
  artists: Artist[];
  album: SimplifiedAlbum; 
}

interface SpotifyData {
  artist: Artist;
  track: Track;
  totalTracks: number;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const useSpotify = (accessToken: string | null, artistName?: string | null, mainAlbumsOnly: boolean = true) => {
  const [spotifyData, setSpotifyData] = useState<SpotifyData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [allTracks, setAllTracks] = useState<Track[]>([]);
  
  const playedTrackIds = useRef<Set<string>>(new Set());

  const fetchTrack = useCallback(async () => {
    if (!accessToken || !artistName) return;

    setLoading(true);
    setError(null);

    const fetchArtistAlbums = async (artistId: string): Promise<string[]> => {
      let offset = 0;
      const limit = 50;
      
      const albumsToFilter: Album[] = [];
      
      while (true) {
        const include_groups = mainAlbumsOnly ? 'album' : 'album,single';
        
        const response = await spotifyFetch(
          `https://api.spotify.com/v1/artists/${artistId}/albums?limit=${limit}&offset=${offset}&include_groups=${include_groups}`
        );
        
        if (!response.ok) throw new Error('Failed to fetch artist albums');
        const data = await response.json();
        
        if (mainAlbumsOnly) {
          const mainArtistAlbums = data.items.filter((album: Album) => 
            album.artists[0].id === artistId
          );
          albumsToFilter.push(...mainArtistAlbums);
        } else {
          albumsToFilter.push(...data.items);
        }
        
        if (data.items.length < limit) break;
        offset += limit;
        await delay(100);
      }
      
      return albumsToFilter.map(album => album.id);
    };

    const fetchAlbumsWithTracks = async (albumIds: string[]): Promise<Album[]> => {
      const albums: Album[] = [];
      for (let i = 0; i < albumIds.length; i += 20) {
        const chunk = albumIds.slice(i, i + 20);
        const response = await spotifyFetch(
          `https://api.spotify.com/v1/albums?ids=${chunk.join(',')}`
        );
        
        if (!response.ok) throw new Error('Failed to fetch albums with tracks');
        const data = await response.json();
        albums.push(...data.albums);
        
        if (chunk.length === 20) {
          await delay(100); 
        }
      }
      
      return albums;
    };

    try {
      const searchResponse = await spotifyFetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(artistName)}&type=artist&limit=1`
      );

      if (!searchResponse.ok) throw new Error('Artist not found');
      const searchData = await searchResponse.json();
      const artist = searchData.artists.items[0];

      if (allTracks.length === 0) {
        const albumIds = await fetchArtistAlbums(artist.id);
        
        const albums = await fetchAlbumsWithTracks(albumIds);
        
        const tracks: Track[] = albums.flatMap(album => 
          album.tracks.items.map(track => ({
            ...track,
            album: {
              id: album.id,
              name: album.name,
              images: album.images,
              artists: album.artists,
              album_type: album.album_type
            }
          } as Track))
        );
        
        let filteredTracks = tracks;
        if (mainAlbumsOnly) {
          filteredTracks = tracks.filter(track => {
            return track.artists[0].id === artist.id;
          });
        }
        
        const uniqueTracks = Array.from(
          new Map(filteredTracks.map(track => [track.id, track])).values()
        );
        
        setAllTracks(uniqueTracks);
      }

      if (allTracks.length > 0) {
        const unplayedTracks = allTracks.filter(track => !playedTrackIds.current.has(track.id));
        
        if (unplayedTracks.length === 0) {
          console.log('All tracks have been played, resetting played tracks');
          playedTrackIds.current.clear();
          const randomTrack = allTracks[Math.floor(Math.random() * allTracks.length)];
          playedTrackIds.current.add(randomTrack.id);
          
          setSpotifyData({
            artist,
            track: randomTrack,
            totalTracks: allTracks.length
          });
        } else {
          const randomIndex = Math.floor(Math.random() * unplayedTracks.length);
          const randomTrack = unplayedTracks[randomIndex];
          
          playedTrackIds.current.add(randomTrack.id);
          
          setSpotifyData({
            artist,
            track: randomTrack,
            totalTracks: allTracks.length
          });
        }
      } else {
        setError('No tracks found for this artist');
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [accessToken, artistName, allTracks, mainAlbumsOnly]);

  useEffect(() => {
    playedTrackIds.current.clear();
  }, [artistName]);

  useEffect(() => {
    fetchTrack();
  }, [fetchTrack]);

  return {
    spotifyData,
    error,
    loading,
    refetchTrack: fetchTrack,
    totalTracks: allTracks.length,
    allTracks,
    playedTracksCount: playedTrackIds.current.size
  };
};

export default useSpotify;