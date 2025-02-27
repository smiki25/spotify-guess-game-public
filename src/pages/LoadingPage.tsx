import { useNavigate } from 'react-router-dom';
import '../styles/LoadingScreen.css';

const LoadingScreen = () => {
  const navigate = useNavigate();

  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-logo">
          <div className="vinyl-record">
            <div className="vinyl-center"></div>
          </div>
        </div>
        <h2 className="loading-title">Song Guesser</h2>
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading, please wait...</p>
        <button 
          onClick={() => navigate('/', { replace: true })} 
          className="back-btn"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default LoadingScreen;