// hooks/useITunes.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { getArtistSongs, getChartSongs, iTunesSong } from '../utils/itunesApi';

interface ITunesData {
  artistName: string;
  track: iTunesSong;
  totalTracks: number;
}

/**
 * Hook for fetching and managing iTunes tracks
 * @param artistId The ID of the artist to fetch tracks for
 * @param artistName The name of the artist (for display purposes)
 */
const useITunes = (artistId?: number | null, artistName?: string | null) => {
  const [itunesData, setITunesData] = useState<ITunesData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [allTracks, setAllTracks] = useState<iTunesSong[]>([]);
  
  const playedTrackIds = useRef<Set<number>>(new Set());

  const fetchTrack = useCallback(async () => {
    // Special case for popular tracks (artistId = 0)
    const isChartMode = artistId === 0;
    
    // Allow fetching if either we have an artistId or we're in chart mode
    if (!isChartMode && (!artistId || artistId < 1)) return;

    setLoading(true);
    setError(null);

    try {
      const displayName = artistName || (isChartMode ? 'Top Charts' : 'Unknown Artist');

      // Fetch all tracks if not already loaded
      if (allTracks.length === 0) {
        let tracks = [];
        
        if (isChartMode) {
          console.log('Fetching chart tracks');
          tracks = await getChartSongs();
        } else {
          // Fetch tracks for the specified artist
          tracks = await getArtistSongs(artistId!);
          
          // Fallback to chart songs if the artist has no tracks
          if (tracks.length === 0) {
            console.log(`No tracks found for artist ${artistName}. Fetching chart songs instead.`);
            tracks = await getChartSongs();
          }
        }
        
        if (tracks.length === 0) {
          setError('No tracks found. Please try another artist.');
          setLoading(false);
          return;
        }
        
        // Only keep tracks that have preview URLs
        const tracksWithPreviews = tracks.filter(track => track.previewUrl);
        
        if (tracksWithPreviews.length === 0) {
          setError('No playable tracks found. Please try another artist.');
          setLoading(false);
          return;
        }
        
        setAllTracks(tracksWithPreviews);
      }

      if (allTracks.length > 0) {
        const unplayedTracks = allTracks.filter(track => !playedTrackIds.current.has(track.trackId));
        
        if (unplayedTracks.length === 0) {
          console.log('All tracks have been played, resetting played tracks');
          playedTrackIds.current.clear();
          const randomTrack = allTracks[Math.floor(Math.random() * allTracks.length)];
          playedTrackIds.current.add(randomTrack.trackId);
          
          setITunesData({
            artistName: displayName,
            track: randomTrack,
            totalTracks: allTracks.length
          });
        } else {
          const randomIndex = Math.floor(Math.random() * unplayedTracks.length);
          const randomTrack = unplayedTracks[randomIndex];
          
          playedTrackIds.current.add(randomTrack.trackId);
          
          setITunesData({
            artistName: displayName,
            track: randomTrack,
            totalTracks: allTracks.length
          });
        }
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [artistId, artistName, allTracks]);

  // Reset when artist changes
  useEffect(() => {
    playedTrackIds.current.clear();
    setAllTracks([]);
  }, [artistId]);

  // Fetch track on mount or when dependencies change
  useEffect(() => {
    fetchTrack();
  }, [fetchTrack]);

  return {
    itunesData,
    error,
    loading,
    refetchTrack: fetchTrack,
    totalTracks: allTracks.length,
    allTracks,
    playedTracksCount: playedTrackIds.current.size
  };
};

export default useITunes;