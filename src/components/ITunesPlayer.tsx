import React, { useState, useEffect, useRef } from 'react';
import cdImage from '../images/cd.png';
import '../styles/SnippetPlayer.css'; // Reuse your existing styles

interface ITunesPlayerProps {
  previewUrl: string;
  duration: number;
  volume: number;
  onVolumeChange: (volume: number) => void;
  onPlaybackEnd?: () => void;
  onPlaybackStart?: () => void;
  setReady: (ready: boolean) => void;
}

const ITunesPlayer: React.FC<ITunesPlayerProps> = ({
  previewUrl,
  duration,
  volume,
  //onVolumeChange,
  onPlaybackEnd,
  onPlaybackStart,
  setReady
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackTimeout = useRef<NodeJS.Timeout | null>(null);
  const currentStartPosition = useRef<number>(0); // Store the intended start time
  const startPositionSetForUrlRef = useRef(false); // Flag to track if position is set

  useEffect(() => {
    // Create audio element
    const audio = new Audio();
    audioRef.current = audio;
    audio.crossOrigin = "anonymous"; // Helps with CORS issues
    
    // Set up event listeners
    const handleLoadedMetadata = () => {
      console.log('Audio metadata loaded');
      // Calculate random start position ONCE when metadata is ready
      if (!startPositionSetForUrlRef.current && audioRef.current && audioRef.current.duration > 0) {
        const audioDurationMs = audioRef.current.duration * 1000;
        // Ensure start time allows for the full playback duration, with a small buffer (e.g., 1 sec)
        const maxStartPositionMs = Math.max(0, audioDurationMs - duration - 1000);
        const randomStart = Math.floor(Math.random() * maxStartPositionMs) / 1000;
        currentStartPosition.current = randomStart;
        startPositionSetForUrlRef.current = true; // Mark as set for this URL
        console.log(`Set start position for this track: ${randomStart}s (Duration: ${audioRef.current.duration}s)`);
      }
      // Always set ready state once metadata loads (or shortly after)
      // Use a small timeout to potentially allow more buffering
      setTimeout(() => {
        if (!playerReady) { // Avoid multiple ready triggers
          setPlayerReady(true);
          setReady(true);
          console.log('Player marked as ready after metadata load.');
        }
      }, 100); // 100ms delay
    };
    
    const handleEnded = () => {
      console.log('Audio playback ended');
      setIsPlaying(false);
      if (onPlaybackEnd) onPlaybackEnd();
    };

    const handleError = (e: ErrorEvent) => {
      console.error('Audio playback error:', e);
      // Force ready state after error to allow user to try playing
      setPlayerReady(true);
      setReady(true);
    };
    
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError as EventListener);
    
    // Set timeout for maximum loading time
    const readyTimeout = setTimeout(() => {
      if (!playerReady) {
        console.log('Forcing ready state after timeout');
        setPlayerReady(true);
        setReady(true);
      }
    }, 5000);
    
    return () => {
      // Clean up
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError as EventListener);
      audio.src = '';
      
      clearTimeout(readyTimeout);
      if (playbackTimeout.current) {
        clearTimeout(playbackTimeout.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setReady]);

  // Handle preview URL changes
  useEffect(() => {
    if (audioRef.current && previewUrl) {
      setPlayerReady(false);
      
      // Set volume when track changes
      audioRef.current.volume = volume;
      
      // Add a timestamp query parameter to bust cache
      const cacheBustedUrl = `${previewUrl}${previewUrl.includes('?') ? '&' : '?'}_=${Date.now()}`;
      audioRef.current.src = cacheBustedUrl;
      audioRef.current.load();
      currentStartPosition.current = 0; // Reset start position for new track
      startPositionSetForUrlRef.current = false; // Reset flag for new track
      
      // Preload the audio
      audioRef.current.preload = "auto";
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewUrl]);

  // Update audio volume when prop changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const togglePlayback = () => {
    if (!audioRef.current || !playerReady) {
      console.log('Cannot toggle playback - player not ready');
      return;
    }

    if (isPlaying) {
      if (playbackTimeout.current) {
        clearTimeout(playbackTimeout.current);
      }
      
      try {
        console.log('Pausing playback');
        audioRef.current.pause();
        
        // Reset currentTime if paused manually before duration ends
        if (audioRef.current.currentTime < currentStartPosition.current + duration / 1000) {
          console.log('Resetting currentTime on manual pause');
          audioRef.current.currentTime = currentStartPosition.current;
        }
        
        setIsPlaying(false);
        if (onPlaybackEnd) onPlaybackEnd();
      } catch (error) {
        console.error('Error pausing playback:', error);
        setIsPlaying(false);
        if (onPlaybackEnd) onPlaybackEnd();
      }
    } else {
      console.log('Starting playback');
      
      try {
        // Start from the stored random position for this track load
        audioRef.current.currentTime = currentStartPosition.current;
        
        const playPromise = audioRef.current.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
              if (onPlaybackStart) onPlaybackStart();
              
              // Automatically stop after the specified duration
              playbackTimeout.current = setTimeout(() => {
                try {
                  if (audioRef.current) {
                    audioRef.current.pause();
                    // Ensure currentTime is reset at the end of intended playback
                    audioRef.current.currentTime = currentStartPosition.current;
                  }
                } catch (error) {
                  console.error('Error auto-pausing after duration:', error);
                }
                setIsPlaying(false);
                if (onPlaybackEnd) onPlaybackEnd();
              }, duration);
            })
            .catch(error => {
              console.error('Error starting playback:', error);
              setIsPlaying(false);
            });
        }
      } catch (playError) {
        console.error('Error starting playback:', playError);
        setIsPlaying(false);
      }
    }
  };

  const handleClick = () => {
    if (!playerReady) {
      console.log('Player not ready yet');
      setTimeout(() => {
        setPlayerReady(true);
        setReady(true);
        togglePlayback();
      }, 500);
      return;
    }
    togglePlayback();
  };

  // const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const newVolume = parseFloat(e.target.value);
  //   onVolumeChange(newVolume);
  // };

  return (
    <div className="player-container">
      {/* CD Player UI */}
      <div 
        className="cd-player"
        onClick={handleClick}
        role="button"
        aria-label="Play or pause music"
        tabIndex={0}
      >
        <div className={`cd ${isPlaying ? 'spinning' : ''}`}>
          <img 
            src={cdImage} 
            alt="CD" 
            className="cd-image"
            draggable="false"
          />
          <div className="cd-center" />
          {!playerReady ? (
            <div className="cd-play-button loading">
              <div className="loading-dot-spinner">
                <div></div>
                <div></div>
                <div></div>
              </div>
            </div>
          ) : (
            <button 
              className="cd-play-button"
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
            >
              {isPlaying ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="30px" height="30px">
                  <path d="M0 0h24v24H0z" fill="none"/>
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14H8v-4h2v4zm4 0h-2v-4h2v4z"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="30px" height="30px">
                  <path d="M0 0h24v24H0z" fill="none"/>
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM9.5 16.5v-9l7 4.5-7 4.5z"/>
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
      {/* Volume Control - Moved to GamePage */}
      {/* <div className="volume-control">
        <span className="volume-icon">?</span>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.01" 
          value={volume}
          onChange={handleVolumeChange}
          className="volume-slider"
          aria-label="Volume control"
        />
        <span className="volume-icon">?</span> 
      </div> */}
    </div>
  );
};

export default ITunesPlayer;