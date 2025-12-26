import { Suspense, lazy} from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoadingScreen from './pages/LoadingPage';
import backgroundImage from './images/background.png';

import './styles/base.css';

const HomePage = lazy(() => import('./pages/HomePage'));
const GamePage = lazy(() => import('./pages/GamePage'));

// Side decoration - background image
const SideDecoration = () => (
  <div className="side-decoration" aria-hidden="true">
    <img src={backgroundImage} alt="" className="side-figure" />
  </div>
);

function App() {
  return (
    <Router>
      <SideDecoration />
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/home"
            element={
              <HomePage />
            }
          />
          <Route
            path="/game"
            element={
              <GamePage />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
