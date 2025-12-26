import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchArtists, iTunesArtist, getArtistSongs } from '../utils/itunesApi';
import useIsMobile from '../hooks/useIsMobile';
import '../styles/HomePage.css';

// Helper function to calculate relevance score (simple example)
const calculateRelevance = (query: string, artistName: string): number => {
  const queryLower = query.toLowerCase();
  const nameLower = artistName.toLowerCase();
  
  // Exact match = highest score
  if (nameLower === queryLower) return 100;
  
  // Starts with query = high score
  if (nameLower.startsWith(queryLower)) return 90;
  
  // Contains query = lower score
  if (nameLower.includes(queryLower)) return 50;
  
  // Default score
  return 0;
};

const HomePage = () => {
  const [pageLoading, setPageLoading] = useState(true);
  const [artistInput, setArtistInput] = useState('');
  const [selectedArtist, setSelectedArtist] = useState<iTunesArtist | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState('easy');
  const [searchResults, setSearchResults] = useState<iTunesArtist[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showNoResults, setShowNoResults] = useState(false);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  // State for the dial
  const [dialAngle, setDialAngle] = useState(0); // Start angle for Easy
  const [isDraggingDial, setIsDraggingDial] = useState(false);
  const [visualDifficulty, setVisualDifficulty] = useState<keyof typeof difficulties>('easy'); // State for visual feedback during drag
  const dialRef = useRef<HTMLDivElement>(null);
  const dragStartOffsetAngleRef = useRef(0); // Store the offset angle at the start of the drag
  const currentLogicalDifficultyRef = useRef<keyof typeof difficulties>('easy'); // Store logical difficulty during drag
  const [showDropdownOverlay, setShowDropdownOverlay] = useState(false);
  const [unveilOverlay, setUnveilOverlay] = useState(false);

  // Difficulty mapping
  const difficulties = {
    easy: { label: 'Easy', angle: 45, color: 'var(--easy)' },       // Top-right
    medium: { label: 'Medium', angle: 135, color: 'var(--medium)' },   // Bottom-right
    hard: { label: 'Hard', angle: 225, color: 'var(--hard)' },       // Bottom-left
    impossible: { label: 'Impossible', angle: 315, color: 'var(--impossible)' } // Top-left
  };
  const difficultyKeys = Object.keys(difficulties) as Array<keyof typeof difficulties>;

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
      
      // Remove duplicates based on artist name (case insensitive)
      const uniqueArtists = artists.reduce((acc: iTunesArtist[], current) => {
        const exists = acc.find(artist => 
          artist.artistName.toLowerCase() === current.artistName.toLowerCase()
        );
        if (!exists) {
          acc.push(current);
        }
        return acc;
      }, []);

      // Fetch song counts for all artists in parallel
      const artistWithSongCounts = await Promise.all(
        uniqueArtists.map(async (artist) => {
          try {
            const songs = await getArtistSongs(artist.artistId);
            return { artist, songCount: songs.length };
          } catch {
            return { artist, songCount: 0 };
          }
        })
      );

      // Filter for artists with more than 10 songs
      const filteredArtists = artistWithSongCounts
        .filter(item => item.songCount > 10)
        .map(item => item.artist);

      // Always put exact match at the top if it exists
      const queryLower = query.toLowerCase();
      const exactIndex = filteredArtists.findIndex(a => a.artistName.toLowerCase() === queryLower);
      let prioritizedArtists = filteredArtists;
      if (exactIndex > 0) {
        const [exactArtist] = filteredArtists.splice(exactIndex, 1);
        prioritizedArtists = [exactArtist, ...filteredArtists];
      }

      // Sort artists by relevance (except exact match stays on top)
      const sortedArtists = prioritizedArtists.sort((a, b) => {
        // If a is exact match, keep it on top
        if (a.artistName.toLowerCase() === queryLower) return -1;
        if (b.artistName.toLowerCase() === queryLower) return 1;
        const scoreA = calculateRelevance(query, a.artistName);
        const scoreB = calculateRelevance(query, b.artistName);
        return scoreB - scoreA; // Higher score first
      });
      
      setSearchResults(sortedArtists);
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
        setShowNoResults(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [artistInput, fetchArtistSuggestions]);

  useEffect(() => {
    return () => {
      setArtistInput('');
      setSelectedArtist(null);
      setSearchResults([]);
    };
  }, []);

  // Set initial dial angle based on default difficulty
  useEffect(() => {
    const initialDifficulty = selectedDifficulty as keyof typeof difficulties;
    if (difficulties[initialDifficulty]) {
      setDialAngle(difficulties[initialDifficulty].angle);
    } 
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Helper to get angle from client coordinates relative to dial center
  const getAngleFromCoords = useCallback((clientX: number, clientY: number): number => {
    if (!dialRef.current) return 0;
    const dialBounds = dialRef.current.getBoundingClientRect();
    const dialCenterX = dialBounds.left + dialBounds.width / 2;
    const dialCenterY = dialBounds.top + dialBounds.height / 2;

    const angleRad = Math.atan2(clientY - dialCenterY, clientX - dialCenterX);
    let angleDeg = angleRad * (180 / Math.PI);
    angleDeg = (angleDeg + 360 + 90) % 360; // Adjust angle to start from top (0 degrees)
    return angleDeg;
  }, []);

  const updateDifficultyFromAngle = useCallback((angle: number) => {
     // Determine closest difficulty based on angle
     // Each difficulty occupies a 90-degree quadrant
     let closestDifficulty: keyof typeof difficulties = 'easy';
     if (angle >= 0 && angle < 90) closestDifficulty = 'easy';
     else if (angle >= 90 && angle < 180) closestDifficulty = 'medium';
     else if (angle >= 180 && angle < 270) closestDifficulty = 'hard';
     else closestDifficulty = 'impossible'; // 270 to 360

     // Store in ref during drag, don't set state yet
     currentLogicalDifficultyRef.current = closestDifficulty; // Update ref only
     setVisualDifficulty(closestDifficulty); // Update VISUAL state live
     // setSelectedDifficulty(closestDifficulty); // Ensure actual state is NOT updated here

  }, []); 

  const handleDialMove = useCallback((event: Event) => { 
    if (!isDraggingDial) return;

    let currentClientX: number | undefined;
    let currentClientY: number | undefined;

    if (event instanceof MouseEvent) {
      currentClientX = event.clientX;
      currentClientY = event.clientY;
    } else if (event instanceof TouchEvent) {
      event.preventDefault(); // Prevent scrolling for touch
      if (event.touches.length > 0) {
        currentClientX = event.touches[0].clientX;
        currentClientY = event.touches[0].clientY;
      }
    } else {
      return; // Not a mouse or touch event we can use
    }

    if (currentClientX === undefined || currentClientY === undefined) {
      return; // No valid coordinates obtained
    }

    const currentEventAbsoluteAngle = getAngleFromCoords(currentClientX, currentClientY);
    
    const newDialAngle = (currentEventAbsoluteAngle - dragStartOffsetAngleRef.current + 360) % 360;

    setDialAngle(newDialAngle);
    updateDifficultyFromAngle(newDialAngle);
    
  }, [isDraggingDial, getAngleFromCoords, updateDifficultyFromAngle]);

  const handleDialEnd = useCallback(() => {
    if (!isDraggingDial) return;
    setIsDraggingDial(false);
    dialRef.current?.classList.add('snapping'); 
    window.removeEventListener('mousemove', handleDialMove);
    window.removeEventListener('mouseup', handleDialEnd);
    window.removeEventListener('touchmove', handleDialMove);
    window.removeEventListener('touchend', handleDialEnd);

    // Snap to the exact angle for the selected difficulty
    const snapAngle = difficulties[currentLogicalDifficultyRef.current].angle;
    setDialAngle(snapAngle);
    setSelectedDifficulty(currentLogicalDifficultyRef.current);
    
  }, [isDraggingDial, handleDialMove]);

  const handleDialStart = useCallback((reactEvent: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    reactEvent.preventDefault(); 
    setIsDraggingDial(true);
    dialRef.current?.classList.remove('snapping');
    
    const initialClientX = 'touches' in reactEvent ? reactEvent.touches[0].clientX : reactEvent.clientX;
    const initialClientY = 'touches' in reactEvent ? reactEvent.touches[0].clientY : reactEvent.clientY;

    const initialEventAbsoluteAngle = getAngleFromCoords(initialClientX, initialClientY);
    dragStartOffsetAngleRef.current = (initialEventAbsoluteAngle - dialAngle + 360) % 360;

    currentLogicalDifficultyRef.current = selectedDifficulty as keyof typeof difficulties;

    window.addEventListener('mousemove', handleDialMove);
    window.addEventListener('mouseup', handleDialEnd);
    window.addEventListener('touchmove', handleDialMove, { passive: false } as AddEventListenerOptions);
    window.addEventListener('touchend', handleDialEnd);
    
  }, [getAngleFromCoords, handleDialMove, handleDialEnd, dialAngle, selectedDifficulty]);

  // Cleanup listeners on unmount
  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', handleDialMove);
      window.removeEventListener('mouseup', handleDialEnd);
      window.removeEventListener('touchmove', handleDialMove);
      window.removeEventListener('touchend', handleDialEnd);
    };
  }, [handleDialMove, handleDialEnd]);

  // Handle overlay animation timing
  useEffect(() => {
    if (isSearching) {
      setShowDropdownOverlay(true);
      setUnveilOverlay(false);
    } else if (showDropdownOverlay) {
      setUnveilOverlay(true);
      const timeout = setTimeout(() => {
        setShowDropdownOverlay(false);
        setUnveilOverlay(false);
      }, 400); // Duration matches CSS animation
      return () => clearTimeout(timeout);
    }
  }, [isSearching]);

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
    setSelectedArtist(artist);
  };

  const handleArtistInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newInput = e.target.value;
    
    // If an artist OR Top Charts was previously selected and the user types something new
    if ((selectedArtist || artistInput === 'Top Charts') && newInput !== artistInput) {
      setSelectedArtist(null); // Clear the logical selection
    }
    
    setArtistInput(newInput); // Update the input field value

    if (newInput) {
      setIsSearching(true);
    }
  };

  const handleInputFocus = () => {
    if (artistInput && !selectedArtist) {
      fetchArtistSuggestions(artistInput);
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
          <h2 className="loading-title">NODE_RECALL</h2>
          <div className="loading-spinner"></div>
          <p className="loading-text">connecting to the wired...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="home-container">
        <h1 className="app-title chromatic">NODE_RECALL</h1>

      <div className="artist-selection-section">
        <h2 className="section-title">// select artist</h2>
        <div className="quick-options">
          <button 
            className="quick-option-btn"
            onClick={() => {
              setSelectedArtist(null);
              setArtistInput('Top Charts');
            }}
          >
            top charts
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
              placeholder="enter artist name..."
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

          {/* Artist Dropdown (Only shown when typing and no artist selected) */}
          {artistInput && !selectedArtist && artistInput !== 'Top Charts' && (
            <div className="dropdown-container">
              {/* Modern glassy blur overlay with unveil animation */}
              {showDropdownOverlay && (
                <div className={`dropdown-blur-overlay modern-glass${unveilOverlay ? ' unveil' : ''}`} />
              )}
              {searchResults.length > 0 ? (
                <ul className="suggestions-list">
                  {searchResults.map((artist) => (
                    <li
                      key={artist.artistId}
                      onClick={() => handleArtistSelect(artist)}
                      className="suggestion-item"
                    >
                      <div className="suggestion-image-placeholder">
                        👤
                      </div>
                      <div className="suggestion-details">
                        <span className="suggestion-name">{artist.artistName}</span>
                        <span className="suggestion-genre">{artist.primaryGenreName}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : artistInput.length > 2 && showNoResults && !isSearching ? (
                <div className="no-results">no data found // try another query</div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div className="difficulty-section">
        <h2 className="section-title">// difficulty</h2>
        <div className="difficulty-dial-container">
          <div 
            className="difficulty-dial" 
            ref={dialRef}
            onMouseDown={handleDialStart}
            onTouchStart={handleDialStart}
            style={{ transform: `rotate(${dialAngle}deg)` }}
          >
            <div className="dial-indicator"></div>
          </div>
          {/* Difficulty Labels */}
          {difficultyKeys.map((key) => {
            const { label, angle, color } = difficulties[key];
            const angleRad = (angle - 90) * (Math.PI / 180); // Adjust for CSS rotation (0 is right)
            const radius = isMobile ? 110 : 130; /* Conditional radius */
            const x = Math.cos(angleRad) * radius;
            const y = Math.sin(angleRad) * radius;
            return (
              <div 
                key={key}
                className={`dial-label ${visualDifficulty === key ? 'selected' : ''}`}
                style={{
                  position: 'absolute',
                  left: `calc(50% + ${x}px)`,
                  top: `calc(50% + ${y}px)`,
                  transform: 'translate(-50%, -50%)',
                  color: visualDifficulty === key ? color : 'rgba(255, 255, 255, 0.7)',
                  fontWeight: visualDifficulty === key ? 'bold' : 'normal',
                  fontSize: visualDifficulty === key ? '1.1em' : '1em',
                  transition: 'color 0.3s, font-weight 0.3s, font-size 0.3s'
                }}
              >
                {label}
              </div>
            );
          })}
          <div className="difficulty-description-display">
            {difficulties[visualDifficulty]?.label}: 
            {{
              easy: '5 seconds ',
              medium: '3 seconds ',
              hard: '1 second ',
              impossible: '0.5 seconds '
            }[visualDifficulty]}
             of playback
          </div>
        </div>
      </div>

      <button
        onClick={startGame}
        className={`play-btn ${(!selectedArtist && artistInput !== 'Top Charts') ? 'disabled' : ''}`}
        disabled={!selectedArtist && artistInput !== 'Top Charts'}
      >
        begin
      </button>

      {/* Info tooltip */}
      <div className="info-tooltip">
        <div className="info-icon">?</div>
        <div className="info-content">
          <p>guess the song from a short snippet.</p>
          <p>choose your artist, set difficulty, and test your music knowledge.</p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;