import React, { useState, useEffect, useRef } from 'react';
import cdImage from '../images/cd.png';
import '../styles/SnippetPlayer.css';

interface SnippetPlayerProps {
  accessToken: string;
  trackUri: string;
  startTime: number;
  duration: number;
  onPlaybackEnd?: () => void;
  onPlaybackStart?: () => void;
  setReady: (ready: boolean) => void;
}

const SnippetPlayer: React.FC<SnippetPlayerProps> = ({
  trackUri,
  duration,
  onPlaybackEnd,
  onPlaybackStart,
  setReady
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const playbackTimeout = useRef<NodeJS.Timeout | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const trackId = trackUri.split(':')[2];
  const initAttemptRef = useRef(false);

  const ensureTrackLoaded = () => {
    if (!iframeRef.current || !iframeRef.current.contentWindow) return;
    
    try {
      const currentSrc = iframeRef.current.src;
      iframeRef.current.src = currentSrc;
      
      iframeRef.current.onload = () => {
        console.log('Track iframe reloaded');
        setTimeout(() => {
          initAttemptRef.current = false; 
          if (iframeRef.current && iframeRef.current.contentWindow) {
            iframeRef.current.contentWindow.postMessage({ command: 'initialize' }, '*');
            initAttemptRef.current = true;
          }
        }, 500);
      };
    } catch (error) {
      console.error('Error ensuring track is loaded:', error);
    }
  };

  useEffect(() => {
    if (trackUri) {
      setPlayerReady(false);
      setIsPlaying(false);
      initAttemptRef.current = false;
      ensureTrackLoaded();
    }
  }, [trackUri]);

  useEffect(() => {
    const maxTimeout = setTimeout(() => {
      if (!playerReady) {
        console.log('Forcing ready state after timeout');
        setPlayerReady(true);
        setReady(true);
      }
    }, 5000); 

    const handleMessage = (event: MessageEvent) => {
      try {
        if (event.origin.includes('spotify.com')) {
          if (event.data.type === 'ready' || 
              (typeof event.data === 'object' && event.data.message === 'ready')) {
            console.log('Spotify player is ready');
            setPlayerReady(true);
            setReady(true);
            clearTimeout(maxTimeout);
          }
          
          if (event.data.type === 'playback_update') {
            if (event.data.data && typeof event.data.data.isPlaying === 'boolean') {
              setIsPlaying(event.data.data.isPlaying);
            } else {
              if (typeof event.data.isPlaying === 'boolean') {
                setIsPlaying(event.data.isPlaying);
              }
            }
            
            if (!playerReady) {
              setPlayerReady(true);
              setReady(true);
            }
          }
          
          if (event.data.type === 'error' || 
              (typeof event.data === 'object' && event.data.message === 'error')) {
            console.error('Spotify player error:', event.data);
          }
        }
      } catch (error) {
        console.error('Error handling message:', error);
      }
    };

    window.addEventListener('message', handleMessage);

    const initTimer = setTimeout(() => {
      if (iframeRef.current && iframeRef.current.contentWindow && !initAttemptRef.current) {
        console.log('Initializing Spotify player');
        iframeRef.current.contentWindow.postMessage({ command: 'initialize' }, '*');
        initAttemptRef.current = true;
      }
    }, 1000);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(maxTimeout);
      clearTimeout(initTimer);
      if (playbackTimeout.current) {
        clearTimeout(playbackTimeout.current);
      }
    };
  }, [playerReady, setReady]);

  const togglePlayback = () => {
    if (!iframeRef.current || !playerReady) {
      console.log('Cannot toggle playback - player not ready');
      return;
    }

    const iframeWindow = iframeRef.current.contentWindow;
    if (!iframeWindow) return;

    if (isPlaying) {
      if (playbackTimeout.current) {
        clearTimeout(playbackTimeout.current);
      }
      
      try {
        console.log('Pausing playback');
        iframeWindow.postMessage({ command: 'pause' }, '*');
        setIsPlaying(false);
        if (onPlaybackEnd) onPlaybackEnd();
      } catch (error) {
        console.error('Error pausing playback:', error);
        setIsPlaying(false);
        if (onPlaybackEnd) onPlaybackEnd();
      }
    } else {
      console.log('Starting playback');
      const checkAndPlay = () => {
        try {
          iframeWindow.postMessage({ command: 'ready_check' }, '*');
          
          setTimeout(() => {
            if (iframeWindow) {
              try {
                iframeWindow.postMessage({ command: 'play' }, '*');
                setIsPlaying(true);
                if (onPlaybackStart) onPlaybackStart();

                playbackTimeout.current = setTimeout(() => {
                  try {
                    iframeWindow.postMessage({ command: 'pause' }, '*');
                  } catch (error) {
                    console.error('Error auto-pausing after duration:', error);
                  }
                  setIsPlaying(false);
                  if (onPlaybackEnd) onPlaybackEnd();
                }, duration);
              } catch (playError) {
                console.error('Error starting playback:', playError);
                setIsPlaying(false);
              }
            }
          }, 300); 
        } catch (error) {
          console.error('Error during player ready check:', error);
        }
      };

      if (!initAttemptRef.current || !playerReady) {
        if (iframeRef.current && iframeRef.current.contentWindow) {
          console.log('Reinitializing player before playback');
          iframeRef.current.contentWindow.postMessage({ command: 'initialize' }, '*');
          
          setTimeout(checkAndPlay, 500);
        }
      } else {
        checkAndPlay();
      }
    }
  };

  const handleClick = () => {
    if (!playerReady) {
      console.log('Player not ready yet, attempt to initialize');
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage({ command: 'initialize' }, '*');
        setTimeout(() => {
          setPlayerReady(true);
          setReady(true);
          togglePlayback();
        }, 500);
      }
      return;
    }
    togglePlayback();
  };

  return (
    <div className="player-container">
      {/* Spotify iframe */}
      <div className="hidden-iframe">
        <iframe
          ref={iframeRef}
          src={`https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`}
          width="100%"
          height="352"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          style={{ border: 'none', width: '0', height: '0' }}
          onLoad={() => {
            console.log('Iframe element loaded');
            
            setTimeout(() => {
              if (iframeRef.current && iframeRef.current.contentWindow) {
                console.log('Sending initialization after iframe load');
                try {
                  iframeRef.current.contentWindow.postMessage({ command: 'initialize' }, '*');
                  initAttemptRef.current = true;
                } catch (error) {
                  console.error('Error initializing after load:', error);
                }
              }
            }, 1000); 
          }}
        />
      </div>

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

export default SnippetPlayer;