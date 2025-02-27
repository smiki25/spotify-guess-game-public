import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSpotifyAuthUrl } from '../utils/auth';
import { useSpotifyAuth } from '../hooks/useSpotifyAuth';
import { spotifyFetch } from '../utils/spotifyApi';
import '../styles/HomePage.css';

interface Artist {
  id: string;
  name: string;
  images: { url: string }[];
  followers?: { total: number };
  genres?: string[];
}

const HomePage = () => {
  const [pageLoading, setPageLoading] = useState(true);
  const [artistInput, setArtistInput] = useState('');
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState('easy');
  const [searchResults, setSearchResults] = useState<Artist[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();
  const { accessToken, isLoading: authLoading, error: authError } = useSpotifyAuth();

  const fetchArtistSuggestions = useCallback(async (query: string) => {
    if (!query) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    try {
      const response = await spotifyFetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=artist&limit=5`
      );

      const data = await response.json();
      setSearchResults(data.artists.items);
    } catch (error) {
      console.error('Error searching artists:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (artistInput) {
        fetchArtistSuggestions(artistInput);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [artistInput, fetchArtistSuggestions]);

  useEffect(() => {
    return () => {
      setArtistInput('');
      setSelectedArtist(null);
      setSearchResults([]);
    };
  }, []);

  useEffect(() => {
    if (authError) {
      navigate('/');
    }

    if (!authLoading) {
      const timer = setTimeout(() => {
        setPageLoading(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [authError, authLoading, navigate]);

  const startGame = () => {
    if (selectedArtist) {
      navigate(`/game?artistName=${encodeURIComponent(selectedArtist.name)}&difficulty=${selectedDifficulty}`);
    }
  };

  const handleArtistSelect = (artist: Artist) => {
    setArtistInput(artist.name);
    
    setSearchResults([]);
    
    setTimeout(() => {
      setSelectedArtist(artist);
    }, 10);
  };

  const handleArtistInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newInput = e.target.value;
    setArtistInput(newInput);

    if (selectedArtist && newInput !== selectedArtist.name) {
      setSelectedArtist(null);
    }

    if (newInput) {
      setIsSearching(true);
    }
  };

  const handleInputFocus = () => {
    if (artistInput && !selectedArtist) {
      fetchArtistSuggestions(artistInput);
    }
  };

  const clearSelection = () => {
    const artistContainer = document.querySelector('.artist-container');
    
    if (artistContainer) {
      artistContainer.classList.add('removing');
      
      setTimeout(() => {
        setSelectedArtist(null);
        setArtistInput('');
        setSearchResults([]);
        
        setTimeout(() => {
          if (artistContainer) {
            artistContainer.classList.remove('removing');
          }
        }, 50);
      }, 300);
    } else {
      setSelectedArtist(null);
      setArtistInput('');
      setSearchResults([]);
    }
  };

  const formatFollowers = (count?: number) => {
    if (!count) return '';

    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M followers`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K followers`;
    }
    return `${count} followers`;
  };

  if (authLoading || pageLoading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-logo">
            <div className="vinyl-record">
              <div className="vinyl-center"></div>
            </div>
          </div>
          <h2 className="loading-title">Song Guesser</h2>
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading app...</p>
        </div>
      </div>
    );
  }

  if (!accessToken) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1 className="app-title">Song Guesser</h1>
          <p className="login-text">Test your music knowledge! Login with Spotify to start playing!</p>
          <a href={getSpotifyAuthUrl()} className="login-btn">
            <svg className="spotify-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,7C9.23,7 7,9.23 7,12C7,14.77 9.23,17 12,17C14.77,17 17,14.77 17,12C17,9.23 14.77,7 12,7M9.29,12.71L11.15,14.56L14.5,11.21L15.21,11.93L11.15,16L8.5,13.35L9.29,12.71Z" />
            </svg>
            Login with Spotify
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="home-container">
      <h1 className="app-title">Song Guesser</h1>

      <div className="artist-selection-section">
        <h2 className="section-title">Choose an Artist</h2>

        <div className="input-group">
          <div className={`search-wrapper ${selectedArtist ? 'artist-selected' : ''}`}>
            <input
              type="text"
              value={artistInput}
              onChange={handleArtistInputChange}
              onFocus={handleInputFocus}
              className="artist-input"
              placeholder="Enter artist name"
            />
            <div className="search-icon">
              {isSearching ? (
                <div className="search-spinner"></div>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                  <path fill="none" d="M0 0h24v24H0z" />
                  <path fill="currentColor" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                </svg>
              )}
            </div>
          </div>

          <div className="artist-container">
            {selectedArtist && (
              <div className="selected-artist-card">
                {selectedArtist.images[0]?.url ? (
                  <img
                    src={selectedArtist.images[0].url}
                    alt={selectedArtist.name}
                    className="artist-image"
                  />
                ) : (
                  <div className="artist-image-placeholder">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
                    </svg>
                  </div>
                )}
                <div className="artist-info">
                  <h3>{selectedArtist.name}</h3>
                  {selectedArtist.followers && (
                    <p className="artist-followers">{formatFollowers(selectedArtist.followers.total)}</p>
                  )}
                  {selectedArtist.genres && selectedArtist.genres.length > 0 && (
                    <div className="artist-genres">
                      {selectedArtist.genres.slice(0, 3).map((genre, index) => (
                        <span key={index} className="genre-tag">{genre}</span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={clearSelection}
                  className="clear-selection-btn"
                  aria-label="Clear artist selection"
                >
                  ×
                </button>
              </div>
            )}
          </div>

          {artistInput && !selectedArtist && searchResults.length > 0 && (
            <div className="dropdown-container">
              <ul className="suggestions-list">
                {searchResults.map((artist) => (
                  <li
                    key={artist.id}
                    onClick={() => handleArtistSelect(artist)}
                    className="suggestion-item"
                  >
                    {artist.images[0]?.url ? (
                      <img
                        src={artist.images[0].url}
                        alt={artist.name}
                        className="suggestion-image"
                      />
                    ) : (
                      <div className="suggestion-image-placeholder">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                          <path fill="currentColor" d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
                        </svg>
                      </div>
                    )}
                    <div className="suggestion-details">
                      <span className="suggestion-name">{artist.name}</span>
                      {artist.followers && (
                        <span className="suggestion-followers">{formatFollowers(artist.followers.total)}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="difficulty-section">
        <h2 className="section-title">Select Difficulty</h2>
        <div className="difficulty-selector">
          {Object.entries({
            easy: { label: 'Easy', description: '5 seconds of playback' },
            medium: { label: 'Medium', description: '3 seconds of playback' },
            hard: { label: 'Hard', description: '1 second of playback' },
            impossible: { label: 'Impossible', description: '0.5 seconds of playback' },
          }).map(([key, { label, description }]) => (
            <button
              key={key}
              onClick={() => setSelectedDifficulty(key)}
              className={`difficulty-btn ${key} ${selectedDifficulty === key ? 'selected' : ''}`}
            >
              <span className="difficulty-name">{label}</span>
              <span className="difficulty-description">{description}</span>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={startGame}
        className={`play-btn ${!selectedArtist ? 'disabled' : ''}`}
        disabled={!selectedArtist}
      >
        Start Game
      </button>
    </div>
  );
};

export default HomePage;