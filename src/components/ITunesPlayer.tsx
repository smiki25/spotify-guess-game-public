import React, { useState, useEffect, useRef } from 'react';
import cdImage from '../images/cd.png';
import '../styles/SnippetPlayer.css'; // Reuse your existing styles

interface ITunesPlayerProps {
  previewUrl: string;
  duration: number;
  onPlaybackEnd?: () => void;
  onPlaybackStart?: () => void;
  setReady: (ready: boolean) => void;
}

const ITunesPlayer: React.FC<ITunesPlayerProps> = ({
  previewUrl,
  duration,
  onPlaybackEnd,
  onPlaybackStart,
  setReady
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Create audio element
    const audio = new Audio();
    audioRef.current = audio;
    audio.crossOrigin = "anonymous"; // Helps with CORS issues
    
    // Set up event listeners
    const handleCanPlayThrough = () => {
      console.log('Audio can play through');
      setPlayerReady(true);
      setReady(true);
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
    
    audio.addEventListener('canplaythrough', handleCanPlayThrough);
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
      audio.removeEventListener('canplaythrough', handleCanPlayThrough);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError as EventListener);
      audio.src = '';
      
      clearTimeout(readyTimeout);
      if (playbackTimeout.current) {
        clearTimeout(playbackTimeout.current);
      }
    };
  }, [setReady]);

  // Handle preview URL changes
  useEffect(() => {
    if (audioRef.current && previewUrl) {
      setPlayerReady(false);
      
      // Add a timestamp query parameter to bust cache
      const cacheBustedUrl = `${previewUrl}${previewUrl.includes('?') ? '&' : '?'}_=${Date.now()}`;
      audioRef.current.src = cacheBustedUrl;
      audioRef.current.load();
      
      // Preload the audio
      audioRef.current.preload = "auto";
    }
  }, [previewUrl]);

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
        // Start from a random position in the preview to make it more challenging
        // iTunes previews are ~30 seconds, so we pick a random start time
        const maxStartPosition = 25000; // 25 seconds (leaving 5 seconds to end)
        const randomStart = Math.floor(Math.random() * maxStartPosition) / 1000;
        audioRef.current.currentTime = randomStart;
        
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
    </div>
  );
};

export default ITunesPlayer;