import { useNavigate } from 'react-router-dom';
import '../styles/LoadingScreen.css';

const LoadingScreen = () => {
  const navigate = useNavigate();

  return (
    <div className="loading-game">
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-logo">
            <div className="vinyl-record">
              <div className="vinyl-center"></div>
            </div>
          </div>
          <h2 className="loading-title">NODE_RECALL</h2>
          <div className="loading-spinner"></div>
          <p className="loading-text">establishing connection...</p>
          <button 
            onClick={() => navigate('/', { replace: true })} 
            className="back-btn"
          >
            abort
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
