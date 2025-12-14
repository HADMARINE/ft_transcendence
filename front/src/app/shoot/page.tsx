'use client'
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { GametypeEnum, useGameData } from '@/util/useGameData';

const ModeSelectionPage: React.FC = () => {
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [notification, setNotification] = useState({
    message: '',
    show: false,
    warning: false
  });
  const [showOnlineLoading, setShowOnlineLoading] = useState(false);

  const router = useRouter();
  const gameData = useGameData();
  
  const timeoutRefs = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(clearTimeout);
    };
  }, []);

  const handleModeSelect = (mode: string) => {
    setSelectedMode(mode);
  };

  const handlePlay = () => {
    if (!selectedMode) {
      setNotification({
        message: 'Veuillez sélectionner un mode de jeu',
        show: true,
        warning: true
      });
      
      timeoutRefs.current.push(
        setTimeout(() => {
          setNotification({ ...notification, show: false });
        }, 3000)
      );
      return;
    }
    
    const modeNames: Record<string, string> = {
      'bot': '1 vs Bot',
      'local': '1 vs 1 Local',
      'online': '1 vs 1 Online'
    };
    
    setNotification({
      message: `Chargement du mode "${modeNames[selectedMode]}" en cours...`,
      show: true,
      warning: false
    });

    if (selectedMode === 'online') {
      timeoutRefs.current.push(
        setTimeout(async () => {
          await gameData.assureConnection();
          gameData.registerQueue(GametypeEnum.SHOOT);
          router.push('/shoot/1vs1-online/lobby');
        }, 1500)
      );
    } else {
      timeoutRefs.current.push(
        setTimeout(() => {
          if (selectedMode === 'bot') {
            router.push('shoot/1vsbot');
          } else if (selectedMode === 'local') {
            router.push('shoot/1vs1local');
          }
        }, 1500)
      );
    }
  };

  const cancelOnlineSearch = () => {
    setShowOnlineLoading(false);
    setSelectedMode(null);
  };

  useEffect(() => {
    document.body.style.background = 
      'linear-gradient(135deg, #1a2a6c, #b21f1f, #1a2a6c)';
    document.body.style.backgroundSize = '400% 400%';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.minHeight = '100vh';
  }, []);

  return (
    <div style={styles.container}>
      {}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes pulse-icon {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.2);
            opacity: 0.7;
          }
        }
        
        .spinner-wheel {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          border: 6px solid rgba(0, 204, 255, 0.2);
          border-top: 6px solid #00ccff;
          border-right: 6px solid #ff6600;
          animation: spin 1s linear infinite;
          position: relative;
          box-shadow: 0 0 30px rgba(0, 204, 255, 0.4),
                      inset 0 0 20px rgba(255, 102, 0, 0.2);
        }
        
        .spinner-wheel::before {
          content: '';
          position: absolute;
          top: 10px;
          left: 10px;
          right: 10px;
          bottom: 10px;
          border-radius: 50%;
          border: 4px solid transparent;
          border-top: 4px solid #ff6600;
          border-left: 4px solid #00ccff;
          animation: spin 0.8s linear infinite reverse;
        }
        
        .spinner-wheel::after {
          content: '🔍';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 24px;
          animation: pulse-icon 1.5s ease-in-out infinite;
        }
        
        .searching-dots::after {
          content: '';
          animation: dots 1.5s infinite;
        }
        
        @keyframes dots {
          0%, 20% { content: '.'; }
          40% { content: '..'; }
          60%, 100% { content: '...'; }
        }
      `}</style>

      {}
      {showOnlineLoading && (
        <div style={styles.onlineLoadingOverlay}>
          <div style={styles.onlineLoadingPopup}>
            <h2 style={styles.onlineLoadingTitle}>Recherche d'adversaires</h2>
            
            <div style={styles.spinnerContainer}>
              <div className="spinner-wheel"></div>
            </div>
            
            <p style={styles.onlineLoadingText}>
              En attente d'un adversaire<span className="searching-dots"></span>
            </p>
            
            <button 
              style={styles.cancelButton} 
              onClick={cancelOnlineSearch}
            >
              Annuler la recherche
            </button>
          </div>
        </div>
      )}

      {/* Notification standard */}
      <div style={styles.notificationContainer}>
        <div 
          style={{
            ...styles.notification,
            ...(notification.show ? styles.notificationShow : {}),
            ...(notification.warning ? styles.notificationWarning : {})
          }}
        >
          {notification.message}
        </div>
      </div>

      <h1 style={styles.title}>CHOISISSEZ VOTRE MODE DE JEU</h1>
      <p style={styles.subtitle}>Sélectionnez votre style de partie et affrontez vos amis ou l'IA</p>
      
      <div style={styles.modesContainer}>
        <div 
          style={{
            ...styles.modeCard,
            ...(selectedMode === 'local' ? styles.modeCardSelected : {})
          }}
          onClick={() => handleModeSelect('local')}
        >
          <div style={styles.modeIcon}>
            <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              <path d="M21 21v-2a4 4 0 0 0-3-3.85"></path>
            </svg>
          </div>
          <div style={styles.modeOverlay}>
            <div style={styles.modeName}>1 vs 1 Local</div>
            <div style={styles.modeDescription}>Affrontez un ami sur le même écran</div>
          </div>
        </div>
        
        <div 
          style={{
            ...styles.modeCard,
            ...(selectedMode === 'bot' ? styles.modeCardSelected : {})
          }}
          onClick={() => handleModeSelect('bot')}
        >
          <div style={styles.modeIcon}>
            <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              <circle cx="12" cy="15" r="1"></circle>
            </svg>
          </div>
          <div style={styles.modeOverlay}>
            <div style={styles.modeName}>1 vs Bot</div>
            <div style={styles.modeDescription}>Défiez l'intelligence artificielle</div>
          </div>
        </div>
        
        <div 
          style={{
            ...styles.modeCard,
            ...(selectedMode === 'online' ? styles.modeCardSelected : {})
          }}
          onClick={() => handleModeSelect('online')}
        >
          <div style={styles.modeIcon}>
            <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
          </div>
          <div style={styles.modeOverlay}>
            <div style={styles.modeName}>1 vs 1 Online</div>
            <div style={styles.modeDescription}>Jouez contre des adversaires en ligne</div>
          </div>
        </div>
      </div>
      
      <button 
        style={{
          ...styles.playButton,
          ...(!selectedMode ? styles.playButtonDisabled : {})
        }}
        disabled={!selectedMode}
        onClick={handlePlay}
      >
        CONTINUER
      </button>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '900px',
    width: '100%',
    textAlign: 'center',
    margin: '0 auto',
    padding: '20px',
    position: 'relative',
    zIndex: 1,
  },
  title: {
    fontSize: '2.8rem',
    marginBottom: '10px',
    textShadow: '0 0 10px #ff6600, 0 0 20px #ff3300',
    letterSpacing: '1.5px',
    color: 'white',
  },
  subtitle: {
    fontSize: '1.2rem',
    marginBottom: '15px',
    color: '#ffcc00',
  },
  modesContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '30px',
    margin: '40px 0',
    flexWrap: 'wrap',
  },
  modeCard: {
    width: '250px',
    height: '300px',
    borderRadius: '15px',
    overflow: 'hidden',
    position: 'relative',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
    transition: 'all 0.3s ease',
    background: 'linear-gradient(135deg, #1e3c72, #2a5298)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  modeCardSelected: {
    transform: 'scale(1.05)',
    boxShadow: '0 0 20px #00ccff, 0 0 30px rgba(0, 200, 255, 0.7)',
    border: '3px solid #00ccff',
  },
  modeIcon: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  modeOverlay: {
    background: 'rgba(0, 0, 0, 0.7)',
    padding: '20px',
  },
  modeName: {
    fontSize: '1.6rem',
    fontWeight: 'bold',
    color: 'white',
    marginBottom: '10px',
  },
  modeDescription: {
    fontSize: '1rem',
    color: '#ddd',
  },
  playButton: {
    background: 'linear-gradient(to right, #ff8c00, #ff6600)',
    color: 'white',
    border: 'none',
    padding: '15px 40px',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    borderRadius: '30px',
    cursor: 'pointer',
    marginTop: '20px',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(255, 102, 0, 0.4)',
    position: 'relative',
    zIndex: 2,
  },
  playButtonDisabled: {
    opacity: '0.6',
    cursor: 'not-allowed',
    background: 'linear-gradient(to right, #555, #333)',
  },
  notification: {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '15px 30px',
    borderRadius: '8px',
    background: 'rgba(50, 50, 50, 0.9)',
    color: 'white',
    zIndex: 1000,
    opacity: 0,
    transition: 'opacity 0.3s ease',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
  },
  notificationShow: {
    opacity: 1,
  },
  notificationWarning: {
    background: 'rgba(200, 50, 50, 0.9)',
  },
  notificationContainer: {
    position: 'relative',
    height: '40px',
    marginBottom: '20px'
  },
  onlineLoadingOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  onlineLoadingPopup: {
    background: 'linear-gradient(135deg, #1a2a6c, #2a5298)',
    borderRadius: '20px',
    padding: '40px',
    width: '90%',
    maxWidth: '600px',
    textAlign: 'center',
    boxShadow: '0 0 40px rgba(0, 200, 255, 0.7)',
    border: '2px solid #00ccff',
  },
  onlineLoadingTitle: {
    fontSize: '2.2rem',
    color: 'white',
    marginBottom: '30px',
    textShadow: '0 0 15px #00ccff',
  },
  onlineLoadingText: {
    fontSize: '1.2rem',
    color: '#ddd',
    margin: '20px 0',
  },
  spinnerContainer: {
    display: 'flex',
    justifyContent: 'center',
    margin: '30px 0',
  },
  spinner: {
    width: '80px',
    height: '80px',
    border: '8px solid rgba(255, 255, 255, 0.1)',
    borderTop: '8px solid #00ccff',
    borderRadius: '50%',
    animation: 'spin 1.5s linear infinite',
  },
  cancelButton: {
    background: 'linear-gradient(to right, #ff3300, #cc0000)',
    color: 'white',
    border: 'none',
    padding: '12px 30px',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    borderRadius: '30px',
    cursor: 'pointer',
    marginTop: '20px',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(255, 50, 0, 0.4)',
  }
};

export default ModeSelectionPage;