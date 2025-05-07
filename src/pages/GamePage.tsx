import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useITunes from '../hooks/useITunes';
import ITunesPlayer from '../components/ITunesPlayer';
import useIsMobile from '../hooks/useIsMobile';
import '../styles/GamePage.css';

interface SongSuggestion {
  name: string;
  id: number;
}

const GamePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [score, setScore] = useState(0);
  const [guess, setGuess] = useState('');
  const [feedback, setFeedback] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [suggestions, setSuggestions] = useState<SongSuggestion[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const [volume, setVolume] = useState(0.5);
  const isMobile = useIsMobile();
  
  const difficultyLevels = {
    easy: 5000,
    medium: 3000,
    hard: 1000,
    impossible: 500
  };

  const difficulty = (new URLSearchParams(location.search).get('difficulty') as keyof typeof difficultyLevels) || 'easy';
  const artistId = parseInt(new URLSearchParams(location.search).get('artistId') || '0');
  const artistName = new URLSearchParams(location.search).get('artistName');
  
  // Use the iTunes hook
  const { 
    itunesData, 
    error: itunesError, 
    loading: itunesLoading, 
    refetchTrack, 
    allTracks = [] 
  } = useITunes(artistId, artistName);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDropdownOpen) {
          setIsDropdownOpen(false);
        } else if (!showResult) {
          navigate('/home', { replace: true });
        }
      }
      
      if (e.key === 's' && document.activeElement !== inputRef.current && !isPlaying && !showResult) {
        handleSkip();
      }
      
      if (e.key === 'b' && document.activeElement !== inputRef.current) {
        navigate('/home', { replace: true });
      }
      
      if (isDropdownOpen && suggestions.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedSuggestionIndex(prev => 
            prev < suggestions.length - 1 ? prev + 1 : prev
          );
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : 0);
        } else if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
          e.preventDefault();
          handleSuggestionClick(suggestions[selectedSuggestionIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDropdownOpen, suggestions, selectedSuggestionIndex, navigate, isPlaying, showResult]);

  useEffect(() => {
    if (isDropdownOpen) {
      document.body.classList.add('dropdown-open');
    } else {
      document.body.classList.remove('dropdown-open');
      setSelectedSuggestionIndex(-1);
    }
    return () => {
      document.body.classList.remove('dropdown-open');
    };
  }, [isDropdownOpen]);

  useEffect(() => {
    return () => {
      document.body.classList.remove('dropdown-open');
      setSuggestions([]);
      setSelectedSuggestionIndex(-1);
    };
  }, []);

  const handleBack = () => {
    navigate('/home', { replace: true });
  };

  const handleSkip = () => {
    setIsPlaying(false);
    setShowResult(true);
    setFeedback(`❌ Skipped! The song was "${itunesData?.track?.trackName}"`);
  };

  const handleGuess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itunesData?.track) return;
  
    setIsDropdownOpen(false);
    setSuggestions([]);
  
    const normalizedGuess = guess.toLowerCase().trim();
    const normalizedTrackName = itunesData.track.trackName.toLowerCase().trim();
    const isCorrect = normalizedGuess === normalizedTrackName;
  
    setIsPlaying(false);
  
    if (isCorrect) {
      const basePoints = {
        easy: 100,
        medium: 200,
        hard: 300,
        impossible: 500
      }[difficulty];
      setScore(prev => prev + basePoints);
      setFeedback('✅ Correct!');
      setShowResult(true);
    } else {
      setFeedback('❌ Wrong! Try again');
      setGuess('');
    }
  };

  const handleNextSong = () => {
    setShowResult(false);
    setGuess('');
    setFeedback('');
    setSuggestions([]);
    setIsDropdownOpen(false);
    setPlayerReady(false);
    refetchTrack();
  };

  const fetchSongSuggestions = (query: string) => {
    if (!query.trim() || !allTracks) {
      setSuggestions([]);
      setIsDropdownOpen(false);
      return;
    }
  
    const queryLower = query.toLowerCase();
    const filteredSongs = allTracks
      .filter(track => 
        track.trackName.toLowerCase().includes(queryLower)
      )
      .map(track => ({
        name: track.trackName,
        id: track.trackId
      }))
      .slice(0, 10);
  
    if (filteredSongs.length > 0) {
      setSuggestions(filteredSongs);
      setIsDropdownOpen(true);
    } else {
      setSuggestions([]);
      setIsDropdownOpen(false);
    }
  };

  const handleInputFocus = () => {
    if (guess.trim()) {
      fetchSongSuggestions(guess);
    }
    setIsDropdownOpen(true);
  };

  const handleSuggestionClick = (suggestion: SongSuggestion) => {
    setGuess(suggestion.name);
    setSuggestions([]);
    setIsDropdownOpen(false);
    
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        const form = inputRef.current.closest('form');
        if (form) {
          form.dispatchEvent(submitEvent);
        }
      }
    }, 50);
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
  };

  if (itunesLoading || !playerReady) {
    const loadingMessages = [
      "Tuning up your favorite tracks...",
      "Getting the stage ready...",
      "Warming up the speakers...",
      "Preparing your musical challenge...",
      "Loading musical greatness..."
    ];
  
    return (
      <div className="loading-game">
        <div className="loading-container">
          <div className="loading-content">
            <div className="loading-logo">
              <div className="vinyl-record">
                <div className="vinyl-center"></div>
              </div>
            </div>
            <h2 className="loading-title">Loading Songs</h2>
            <div className="loading-spinner"></div>
            <p className="loading-text">
              {loadingMessages[Math.floor(Math.random() * loadingMessages.length)]}
            </p>
            <button 
              onClick={() => navigate('/home', { replace: true })} 
              className="back-btn"
              aria-label="Go back to home"
            >
              Cancel
            </button>
          </div>
        </div>
        {/* Preload the player */}
        <div style={{ display: 'none' }}>
          {itunesData?.track?.previewUrl && (
            <ITunesPlayer
              previewUrl={itunesData.track.previewUrl}
              duration={difficultyLevels[difficulty]}
              onPlaybackEnd={() => setIsPlaying(false)}
              onPlaybackStart={() => setIsPlaying(true)}
              setReady={setPlayerReady}
              volume={volume}
              onVolumeChange={handleVolumeChange}
            />
          )}
        </div>
      </div>
    );
  }

  if (itunesError) {
    return (
      <div className="container">
        <p>Error: {itunesError}</p>
        <button onClick={() => navigate('/home', { replace: true })} className="play-btn">Go back</button>
      </div>
    );
  }

  if (showResult) {
    return (
      <div className="container">
        <div className="result-card">
          <img 
            src={itunesData?.track?.artworkUrl100 || '/default-album-art.jpg'} 
            alt="Album cover" 
            className="album-cover"
          />
          <h2>{itunesData?.track?.trackName}</h2>
          <p>by {itunesData?.track?.artistName}</p>
          <p>Album: {itunesData?.track?.collectionName}</p>
          {feedback.includes('Correct') && (
            <p className="points">
              +{
                {
                  easy: 100,
                  medium: 200,
                  hard: 300,
                  impossible: 500
                }[difficulty]
              } points
            </p>
          )}
          <div className="button-group result-buttons">
            <button onClick={handleBack} className="back-btn">
              Back to Home
            </button>
            <button onClick={handleNextSong} className="back-btn">
              Next Song
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="container">
        <div className="game-header">
          <button 
            onClick={handleBack} 
            className="back-btn"
            aria-label="Go back to home"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            <span>Back</span>
          </button>
          <div className="score-board">Score: {score}</div>
        </div>

        <div className="player-section">
          {itunesData?.track?.previewUrl && (
            <ITunesPlayer
              previewUrl={itunesData.track.previewUrl}
              duration={difficultyLevels[difficulty]}
              onPlaybackEnd={() => setIsPlaying(false)}
              onPlaybackStart={() => setIsPlaying(true)}
              setReady={setPlayerReady}
              volume={volume}
              onVolumeChange={handleVolumeChange}
            />
          )}
          
          <div className="player-controls">
            <div className="volume-control">
              <span className="volume-icon" title="Volume Down">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20px" height="20px">
                  <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/>
                  <path d="M0 0h24v24H0z" fill="none"/>
                </svg>
              </span>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01" 
                value={volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="volume-slider"
                aria-label="Volume control"
              />
              <span className="volume-icon" title="Volume Up">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20px" height="20px">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                  <path d="M0 0h24v24H0z" fill="none"/>
                </svg>
              </span>
            </div>
            <button 
              onClick={handleSkip} 
              className="skip-btn"
              disabled={isPlaying}
              aria-label="Skip current song"
            >
              Skip
            </button>
          </div>
        </div>

        <form onSubmit={handleGuess} className="guess-form">
          <div className="input-container">
            <input
              ref={inputRef}
              type="text"
              value={guess}
              onChange={(e) => {
                const value = e.target.value;
                setGuess(value);
                fetchSongSuggestions(value);
              }}
              onFocus={handleInputFocus}
              className="guess-input"
              placeholder="Guess the song..."
              autoComplete="off"
              autoCapitalize="off"
              spellCheck="false"
              aria-label="Enter your song guess"
            />
            {suggestions.length > 0 && (
              <ul className="suggestions-list" role="listbox">
                {suggestions.map((suggestion, index) => (
                  <li 
                    key={suggestion.id}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className={`suggestion-item ${selectedSuggestionIndex === index ? 'selected' : ''}`}
                    role="option"
                    aria-selected={selectedSuggestionIndex === index}
                  >
                    {suggestion.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button 
            type="submit" 
            className="submit-btn"
            disabled={!guess.trim()}
          >
            Submit
          </button>
        </form>

        <div className="feedback" aria-live="polite">{feedback}</div>
        
        {!isMobile && (
          <div className="keyboard-shortcuts">
            <p><kbd>B</kbd> Back to home</p>
            <p><kbd>S</kbd> Skip song</p>
            <p><kbd>↑</kbd><kbd>↓</kbd> Navigate suggestions</p>
            <p><kbd>Enter</kbd> Select suggestion/Submit guess</p>
          </div>
        )}
      </div>
    </>
  );
};

export default GamePage;