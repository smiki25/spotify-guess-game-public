# Spotify Song Guesser

A web application that tests your music knowledge by challenging you to identify songs from your favorite artists based on short snippets.

## Features

- **Spotify Integration**: Log in with your Spotify account to access artist data
- **Artist Search**: Search for any artist available on Spotify
- **Multiple Difficulty Levels**: 
  - Easy: 5 seconds of playback
  - Medium: 3 seconds of playback
  - Hard: 1 second of playback
  - Impossible: 0.5 seconds of playback
- **Song Suggestions**: Type-ahead suggestions for song guesses
- **Score Tracking**: Keep track of your points as you play
- **Responsive Design**: Works on both desktop and mobile devices
- **Keyboard Shortcuts**: Streamlined gameplay with keyboard controls

## Demo

### [Live Demo](https://spotify-guess-game-public.vercel.app/)

**Note:** This app requires Spotify authentication. To test it with your account:
1. The application is currently in development mode
2. Your Spotify account needs to be added to the approved test users list
3. Contact the repository owner to request access

## How to Play

1. Log in with your Spotify account
2. Search for and select an artist
3. Choose your difficulty level
4. Listen to the snippet and guess the song
5. Earn points for correct guesses!

## Technical Overview

### Built With

- [React](https://reactjs.org/) - Frontend framework
- [TypeScript](https://www.typescriptlang.org/) - Static typing
- [React Router](https://reactrouter.com/) - Navigation
- [Spotify Web API](https://developer.spotify.com/documentation/web-api/) - Music data
- [Spotify Web Playback SDK](https://developer.spotify.com/documentation/web-playback-sdk/) - Music playback

### Project Structure

```
spotify-guess-game/
├── src/
│   ├── components/
│   │   └── SnippetPlayer.tsx       # Custom Spotify player component
│   ├── hooks/
│   │   ├── useSpotify.ts           # Hook for Spotify data fetching
│   │   └── useSpotifyAuth.ts       # Hook for Spotify authentication
│   ├── pages/
│   │   ├── CallbackPage.tsx        # OAuth callback handler
│   │   ├── GamePage.tsx            # Main game interface
│   │   ├── HomePage.tsx            # Artist selection screen
│   │   └── LoadingPage.tsx         # Loading screen component
│   ├── styles/                     # CSS files
│   └── utils/
│       ├── auth.ts                 # Spotify authentication utilities
│       └── spotifyApi.ts           # Spotify API wrapper
└── ...
```

## Installation

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Spotify Developer Account

### Setup

1. Clone the repository
   ```bash
   git clone https://github.com/smiki25/spotify-guess-game-public.git
   cd spotify-guess-game
   ```

2. Install dependencies
   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env` file in the root directory with your Spotify credentials:
   ```
   VITE_SPOTIFY_CLIENT_ID=your_client_id
   VITE_SPOTIFY_CLIENT_SECRET=your_client_secret
   VITE_SPOTIFY_REDIRECT_URI=http://localhost:5173/callback
   ```

4. Start the development server
   ```bash
   npm run dev
   # or
   yarn dev
   ```

## Deployment

### Building for Production

```bash
npm run build
# or
yarn build
```

The build artifacts will be stored in the `dist/` directory.

Make sure to configure your Spotify Developer account with the appropriate redirect URI for your production environment.

## Development Notes

### Authentication Flow

The app uses the Authorization Code Flow with PKCE for secure authentication with the Spotify API. Access tokens are automatically refreshed when they expire.

### Player Implementation

The music player is implemented using an embedded Spotify iframe with controlled playback. This approach allows for precise snippet duration control while maintaining music quality.


## Acknowledgements

- [Spotify](https://www.spotify.com/) for their excellent API
- [React](https://reactjs.org/) and its ecosystem
- All the open-source contributors whose libraries made this possible
