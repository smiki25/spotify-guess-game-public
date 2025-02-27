import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useSpotify from '@hooks/useSpotify';
import SnippetPlayer from '@components/SnippetPlayer';
import { useSpotifyAuth } from '@hooks/useSpotifyAuth';
import '../styles/GamePage.css';

interface SongSuggestion {
  name: string;
  id: string;
}

const GamePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { accessToken, isLoading: authLoading, error: authError } = useSpotifyAuth();
  const [score, setScore] = useState(0);
  const [guess, setGuess] = useState('');
  const [feedback, setFeedback] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [suggestions, setSuggestions] = useState<SongSuggestion[]>([]);
  const [selectedStartTime, setSelectedStartTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const difficultyLevels = {
    easy: 5000,
    medium: 3000,
    hard: 1000,
    impossible: 500
  };

  const difficulty = (new URLSearchParams(location.search).get('difficulty') as keyof typeof difficultyLevels) || 'easy';
  const artistName = new URLSearchParams(location.search).get('artistName');
  const { spotifyData, error: spotifyError, loading: spotifyLoading, refetchTrack, allTracks = [] } = useSpotify(accessToken, artistName);

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

  useEffect(() => {
    if (authError) {
      navigate('/', { replace: true });
    }
  }, [authError, navigate]);

  useEffect(() => {
    if (spotifyData?.track) {
      const trackDuration = spotifyData.track.duration_ms;
      const snippetDuration = difficultyLevels[difficulty];
      const maxStartPosition = trackDuration - snippetDuration;
      setSelectedStartTime(Math.floor(Math.random() * maxStartPosition));
    }
  }, [spotifyData?.track, difficulty]);

  const handleBack = () => {
    navigate('/home', { replace: true });
  };

  const handleSkip = () => {
    setIsPlaying(false);
    setShowResult(true);
    setFeedback(`Skipped! The song was "${spotifyData?.track?.name}"`);
  };

  const handleGuess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spotifyData?.track) return;
  
    setIsDropdownOpen(false);
    setSuggestions([]);
  
    const normalizedGuess = guess.toLowerCase().trim();
    const normalizedTrackName = spotifyData.track.name.toLowerCase().trim();
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
      setFeedback('✓ Correct!');
      setShowResult(true);
    } else {
      setFeedback('✗ Wrong! Try again');
      setGuess('');
    }
  };

  const handleNextSong = () => {
    setShowResult(false);
    setGuess('');
    setFeedback('');
    setSuggestions([]);
    setIsDropdownOpen(false);
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
        track.name.toLowerCase().includes(queryLower)
      )
      .map(track => ({
        name: track.name,
        id: track.id
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

  if (authLoading || spotifyLoading || !playerReady) {
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
        <div style={{ display: 'none' }}>
          <SnippetPlayer
            accessToken={accessToken || ''}
            trackUri={spotifyData?.track?.uri || ''}
            startTime={selectedStartTime}
            duration={difficultyLevels[difficulty]}
            onPlaybackEnd={() => setIsPlaying(false)}
            onPlaybackStart={() => setIsPlaying(true)}
            setReady={setPlayerReady}
          />
        </div>
      </div>
    );
  }

  if (spotifyError) {
    return (
      <div className="container">
        <p>Error: {spotifyError}</p>
        <button onClick={() => navigate('/home', { replace: true })} className="play-btn">Go back</button>
      </div>
    );
  }

  if (showResult) {
    return (
      <div className="container">
        <div className="result-card">
          <img 
            src={spotifyData?.track?.album?.images[0]?.url} 
            alt="Album cover" 
            className="album-cover"
          />
          <h2>{spotifyData?.track?.name}</h2>
          <p>by {spotifyData?.track?.artists?.map(artist => artist.name).join(', ')}</p>
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
          <SnippetPlayer
            accessToken={accessToken || ''}
            trackUri={spotifyData?.track?.uri || ''}
            startTime={selectedStartTime}
            duration={difficultyLevels[difficulty]}
            onPlaybackEnd={() => setIsPlaying(false)}
            onPlaybackStart={() => setIsPlaying(true)}
            setReady={setPlayerReady}
          />
          
          <button 
            onClick={handleSkip} 
            className="skip-btn"
            disabled={isPlaying}
            aria-label="Skip current song"
          >
            Skip
          </button>
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
        
        <div className="keyboard-shortcuts">
          <p><kbd>B</kbd> Back to home</p>
          <p><kbd>S</kbd> Skip song</p>
          <p><kbd>↑</kbd><kbd>↓</kbd> Navigate suggestions</p>
          <p><kbd>Enter</kbd> Select suggestion/Submit guess</p>
        </div>
      </div>
    </>
  );
};

export default GamePage;