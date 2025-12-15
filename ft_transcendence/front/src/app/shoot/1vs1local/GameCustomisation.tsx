'use client'
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const ForestMap = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200">
    <rect width="300" height="200" fill="#3a5" />
    <path d="M0,100 Q150,50 300,100 L300,200 L0,200 Z" fill="#284" />
    <circle cx="50" cy="50" r="15" fill="#fc3" />
    <circle cx="250" cy="80" r="10" fill="#fc3" />
    <circle cx="150" cy="120" r="8" fill="#fc3" />
  </svg>
);

const CityMap = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200">
    <rect width="300" height="200" fill="#222" />
    <rect x="50" y="50" width="200" height="100" fill="#333" />
    <rect x="70" y="70" width="40" height="60" fill="#444" />
    <rect x="190" y="70" width="40" height="60" fill="#444" />
    <rect x="120" y="90" width="60" height="40" fill="#444" />
    <circle cx="100" cy="40" r="15" fill="#fc3" />
    <circle cx="200" cy="40" r="15" fill="#fc3" />
  </svg>
);
const GameCustomisation: React.FC = () => {
  const [selectedMapId, setSelectedMapId] = useState('map1');
  const [player1Color, setPlayer1Color] = useState('#00ccff');
  const [player2Color, setPlayer2Color] = useState('#ff6666');
  const [notification, setNotification] = useState({
    message: '',
    show: false,
    warning: false
  });

  const router = useRouter();
  
  const timeoutRefs = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(clearTimeout);
    };
  }, []);

  const handleMapSelect = (mapId: string) => {
    setSelectedMapId(mapId);
  };

  const handleColorSelect = (player: '1' | '2', color: string) => {
    if (player === '1') {
      setPlayer1Color(color);
    } else {
      setPlayer2Color(color);
    }
  };

  const handlePlay = () => {
    const newParams = new URLSearchParams();
    newParams.set('player1Color', encodeURIComponent(player1Color));
    newParams.set('player2Color', encodeURIComponent(player2Color));
    newParams.set('mapId', encodeURIComponent(selectedMapId));
    
    const mapName = selectedMapId === 'map1' ? 'Forêt Enchantée' : 'Cité Futuriste';
    
    setNotification({
      message: `Chargement de "${mapName}" en cours...`,
      show: true,
      warning: false
    });

    timeoutRefs.current.push(
      setTimeout(() => {
        setNotification({
          message: `Lancement du jeu avec la map "${mapName}"!`,
          show: true,
          warning: false
        });
      })
    );
    router.push(`1vs1local/game?${newParams}`)

    
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      document.body.style.backgroundPosition = `${x * 50}% ${y * 50}%`;
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.notificationContainer}></div>
        <div 
          style={{
            ...styles.notification,
            ...(notification.show ? styles.notificationShow : {}),
            ...(notification.warning ? styles.notificationWarning : {})
        }}
      >
        {notification.message}
      </div>

      <h1 style={styles.title}>SÉLECTION DE LA MAP</h1>
      <p style={styles.subtitle}>Choisissez votre terrain de jeu et les couleurs des joueurs</p>
      
       <div style={styles.mapsContainer}>
        <div 
          id="map1"
          style={{
            ...styles.mapCard,
            ...(selectedMapId === 'map1' ? styles.mapCardSelected : {})
          }}
          onClick={() => handleMapSelect('map1')}
        >
          <div style={styles.mapImage}>
            <ForestMap />
          </div>
          <div style={styles.mapOverlay}>
            <div style={styles.mapName}>Forêt Enchantée</div>
          </div>
        </div>
        
        <div 
          id="map2"
          style={{
            ...styles.mapCard,
            ...(selectedMapId === 'map2' ? styles.mapCardSelected : {})
          }}
          onClick={() => handleMapSelect('map2')}
        >
          <div style={styles.mapImage}>
            <CityMap />
          </div>
          <div style={styles.mapOverlay}>
            <div style={styles.mapName}>Cité Futuriste</div>
          </div>
        </div>
      </div>
      
      <div style={styles.colorSelection}>
        <div style={styles.playerColor}>
          <h3 style={styles.playerTitle}>
            <span 
              id="player1Indicator" 
              style={{ ...styles.colorIndicator, color: player1Color }}
            >
              ●
            </span> Joueur 1
          </h3>
          <div style={styles.colorOptions}>
            {['#00ccff', '#00ff00', '#ffff00', '#ff00ff', '#ff9900'].map(color => (
              <div 
                key={`p1-${color}`}
                style={{
                  ...styles.colorOption,
                  backgroundColor: color,
                  ...(player1Color === color ? styles.colorOptionSelected : {})
                }}
                onClick={() => handleColorSelect('1', color)}
              />
            ))}
          </div>
        </div>
        
        <div style={styles.playerColor}>
          <h3 style={styles.playerTitle}>
            <span 
              id="player2Indicator" 
              style={{ ...styles.colorIndicator, color: player2Color }}
            >
              ●
            </span> Joueur 2
          </h3>
          <div style={styles.colorOptions}>
            {['#ff6666', '#00ffff', '#ffcc00', '#cc00ff', '#00ffcc'].map(color => (
              <div 
                key={`p2-${color}`}
                style={{
                  ...styles.colorOption,
                  backgroundColor: color,
                  ...(player2Color === color ? styles.colorOptionSelected : {})
                }}
                onClick={() => handleColorSelect('2', color)}
              />
            ))}
          </div>
        </div>
      </div>
      
      <button 
        style={{
          ...styles.playButton,
          ...(!selectedMapId ? styles.playButtonDisabled : {})
        }}
        disabled={!selectedMapId}
        onClick={handlePlay}
      >
        JOUER MAINTENANT
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
  mapsContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '20px',
    margin: '20px 0',
    flexWrap: 'wrap',
  },
  mapCard: {
    width: '300px',
    height: '200px',
    borderRadius: '15px',
    overflow: 'hidden',
    position: 'relative',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
    transition: 'all 0.3s ease',
  },
  mapCardSelected: {
    transform: 'scale(1.05)',
    boxShadow: '0 0 20px #00ccff, 0 0 30px rgba(0, 200, 255, 0.7)',
    border: '3px solid #00ccff',
  },
  mapImage: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2c3e50',
    overflow: 'hidden',
  },
  mapOverlay: {
    position: 'absolute',
    bottom: '0',
    left: '0',
    right: '0',
    background: 'rgba(0, 0, 0, 0.7)',
    padding: '10px',
  },
  mapName: {
    fontSize: '1.4rem',
    fontWeight: 'bold',
    color: 'white',
  },
  colorSelection: {
    display: 'flex',
    justifyContent: 'center',
    gap: '40px',
    margin: '30px 0',
    flexWrap: 'wrap',
  },
  playerColor: {
    background: 'rgba(0, 0, 0, 0.6)',
    padding: '20px',
    borderRadius: '15px',
    minWidth: '250px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
    border: '2px solid rgba(255, 200, 0, 0.3)',
  },
  playerTitle: {
    color: 'white',
    marginBottom: '15px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
  },
  colorIndicator: {
    fontSize: '1.8rem',
    display: 'inline-block',
  },
  colorOptions: {
    display: 'flex',
    justifyContent: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  },
  colorOption: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
  },
  colorOptionSelected: {
    transform: 'scale(1.2)',
    boxShadow: '0 0 10px white, 0 0 15px rgba(255, 255, 255, 0.7)',
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
};

export default GameCustomisation;
