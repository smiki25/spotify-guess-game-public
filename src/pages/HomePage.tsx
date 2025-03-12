import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchArtists, iTunesArtist } from '../utils/itunesApi';
import '../styles/HomePage.css';

const HomePage = () => {
  const [pageLoading, setPageLoading] = useState(true);
  const [artistInput, setArtistInput] = useState('');
  const [selectedArtist, setSelectedArtist] = useState<iTunesArtist | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState('easy');
  const [searchResults, setSearchResults] = useState<iTunesArtist[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();

  // Simple initialization without any auth
  useEffect(() => {
    const timer = setTimeout(() => {
      setPageLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const fetchArtistSuggestions = useCallback(async (query: string) => {
    if (!query) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    console.log('Fetching artist suggestions for:', query);

    try {
      const artists = await searchArtists(query);
      console.log('Artist search results:', artists);
      setSearchResults(artists);
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

  const startGame = () => {
    if (selectedArtist) {
      navigate(`/game?artistId=${selectedArtist.artistId}&artistName=${encodeURIComponent(selectedArtist.artistName)}&difficulty=${selectedDifficulty}`);
    } else if (artistInput === 'Top Charts') {
      // Special case for chart tracks
      navigate(`/game?artistId=0&artistName=Top%20Charts&difficulty=${selectedDifficulty}`);
    }
  };

  const handleArtistSelect = (artist: iTunesArtist) => {
    setArtistInput(artist.artistName);
    setSearchResults([]);
    
    setTimeout(() => {
      setSelectedArtist(artist);
    }, 10);
  };

  const handleArtistInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newInput = e.target.value;
    setArtistInput(newInput);

    if (selectedArtist && newInput !== selectedArtist.artistName) {
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

  if (pageLoading) {
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

  return (
    <div className="home-container">
      <h1 className="app-title">Song Guesser</h1>

      <div className="artist-selection-section">
        <h2 className="section-title">Choose an Artist</h2>
        <div className="quick-options">
          <button 
            className="quick-option-btn"
            onClick={() => {
              setSelectedArtist(null);
              setArtistInput('Top Charts');
            }}
          >
            <span className="option-icon">??</span> Top Charts
          </button>
        </div>

        <div className="input-group">
          <div className={`search-wrapper ${selectedArtist || artistInput === 'Top Charts' ? 'artist-selected' : ''}`}>
            <input
              type="text"
              value={artistInput}
              onChange={handleArtistInputChange}
              onFocus={handleInputFocus}
              className="artist-input"
              placeholder="Enter artist name (e.g., 'Kendrick')"
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
                <div className="artist-image-placeholder">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
                  </svg>
                </div>
                <div className="artist-info">
                  <h3>{selectedArtist.artistName}</h3>
                  <p className="artist-genre">{selectedArtist.primaryGenreName}</p>
                </div>
                <button
                  onClick={clearSelection}
                  className="clear-selection-btn"
                  aria-label="Clear artist selection"
                >
                  ?
                </button>
              </div>
            )}
            
            {!selectedArtist && artistInput === 'Top Charts' && (
              <div className="selected-artist-card">
                <div className="artist-image-placeholder top-charts">
                  <span className="option-icon">??</span>
                </div>
                <div className="artist-info">
                  <h3>Top Charts</h3>
                  <p className="artist-genre">Popular tracks from iTunes charts</p>
                </div>
                <button
                  onClick={clearSelection}
                  className="clear-selection-btn"
                  aria-label="Clear top charts selection"
                >
                  ?
                </button>
              </div>
            )}
          </div>

          {artistInput && !selectedArtist && artistInput !== 'Top Charts' && (
            <div className="dropdown-container">
              {isSearching ? (
                <div className="searching-indicator">Searching...</div>
              ) : searchResults.length > 0 ? (
                <ul className="suggestions-list">
                  {searchResults.map((artist) => (
                    <li
                      key={artist.artistId}
                      onClick={() => handleArtistSelect(artist)}
                      className="suggestion-item"
                    >
                      <div className="suggestion-image-placeholder">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                          <path fill="currentColor" d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
                        </svg>
                      </div>
                      <div className="suggestion-details">
                        <span className="suggestion-name">{artist.artistName}</span>
                        <span className="suggestion-genre">{artist.primaryGenreName}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : artistInput.length > 2 ? (
                <div className="no-results">No artists found. Try another search.</div>
              ) : null}
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
        className={`play-btn ${(!selectedArtist && artistInput !== 'Top Charts') ? 'disabled' : ''}`}
        disabled={!selectedArtist && artistInput !== 'Top Charts'}
      >
        Start Game
      </button>
    </div>
  );
};

export default HomePage;