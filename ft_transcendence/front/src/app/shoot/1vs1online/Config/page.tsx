'use client'
import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useGameData } from '@/util/useGameData';

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
  const [myColor, setMyColor] = useState('#00ccff');
  const [opponentColor, setOpponentColor] = useState('#ff6666');
  const [isReady, setIsReady] = useState(false);
  const [opponentReady, setOpponentReady] = useState(false);
  const [matchData, setMatchData] = useState<any>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const gameData = useGameData();
  
  const roomId = searchParams.get('roomId');
  const tournamentId = searchParams.get('tournamentId');
  const matchId = searchParams.get('matchId');
  const myUserId = gameData.user?.id;

  const player1Name = matchData?.player1?.nickname || 'Joueur 1';
  const player2Name = matchData?.player2?.nickname || 'Joueur 2';
  const amIPlayer1 = matchData?.player1?.id === myUserId;
  
  const player1Ready = amIPlayer1 ? isReady : opponentReady;
  const player2Ready = amIPlayer1 ? opponentReady : isReady;

  useEffect(() => {
    const client = gameData.client;
    if (!client || !roomId) return;

    const handleMatchConfig = (data: any) => {
      console.log('Match config received:', data);
      console.log('My user ID:', myUserId);
      console.log('Player1 ID:', data.player1?.id);
      console.log('Player2 ID:', data.player2?.id);
      setMatchData(data);
    };

    const handleConfigUpdate = (data: any) => {
      console.log('Config update received:', data);
      console.log('Data roomId:', data.roomId, 'Current roomId:', roomId);
      
      if (data.roomId === roomId) {
        console.log('Updating opponent config...');
        if (data.color) setOpponentColor(data.color);
        if (data.mapId) setSelectedMapId(data.mapId);
        if (data.ready !== undefined) {
          console.log('Setting opponent ready to:', data.ready);
          setOpponentReady(data.ready);
        }
      } else {
        console.log('Ignoring config update - wrong room');
      }
    };

    const handleIngameComm = (data: any) => {
      if (data.action === 'start-game') {
        const params = new URLSearchParams();
        if (roomId) params.set('roomId', roomId);
        if (tournamentId) params.set('tournamentId', tournamentId);
        if (matchId) params.set('matchId', matchId);
        router.push(`/shoot/1vs1-online/game?${params}`);
      }
    };

    client.on('match-config', handleMatchConfig);
    client.on('config-update', handleConfigUpdate);
    client.on('ingame-comm', handleIngameComm);

    return () => {
      client.off('match-config', handleMatchConfig);
      client.off('config-update', handleConfigUpdate);
      client.off('ingame-comm', handleIngameComm);
    };
  }, [gameData.client, roomId, myUserId, router, tournamentId, matchId]);

  const handleReady = () => {
    const client = gameData.client;
    if (!client) return;

    const newReadyState = !isReady;
    console.log('Setting my ready state to:', newReadyState);
    console.log('Current matchData:', matchData);
    console.log('amIPlayer1:', amIPlayer1);
    setIsReady(newReadyState);

    const configData = {
      roomId,
      tournamentId,
      matchId,
      color: myColor,
      mapId: selectedMapId,
      ready: newReadyState,
    };
    console.log('Emitting player-config:', configData);
    client.emit('player-config', configData);
  };

  const handleMapSelect = (mapId: string) => {
    setSelectedMapId(mapId);
    
    const client = gameData.client;
    if (!client) return;

    client.emit('player-config', {
      roomId,
      tournamentId,
      matchId,
      color: myColor,
      mapId: mapId,
      ready: isReady,
    });
  };

  const handleColorChange = (color: string) => {
    setMyColor(color);
    
    const client = gameData.client;
    if (!client) return;

    client.emit('player-config', {
      roomId,
      tournamentId,
      matchId,
      color: color,
      mapId: selectedMapId,
      ready: isReady,
    });
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
      {}
      <h1 style={styles.title}>CONFIGURATION DU MATCH</h1>
      <p style={styles.subtitle}>Choisissez votre map et votre couleur</p>

      <div style={styles.matchInfo}>
        <div style={{
          ...styles.playerCard,
          border: amIPlayer1 ? '2px solid #ff6600' : '2px solid transparent',
        }}>
          <span style={{...styles.playerName, color: amIPlayer1 ? '#ffcc00' : '#e6e6e6'}}>
            {player1Name}
          </span>
          <span style={{
            ...styles.playerStatus,
            backgroundColor: player1Ready ? '#2ecc71' : '#e74c3c',
            color: 'white',
          }}>
            {player1Ready ? ' Prêt' : 'En attente...'}
          </span>
        </div>

        <span style={styles.vsText}>VS</span>

        <div style={{
          ...styles.playerCard,
          border: !amIPlayer1 ? '2px solid #ff6600' : '2px solid transparent',
        }}>
          <span style={{...styles.playerName, color: !amIPlayer1 ? '#ffcc00' : '#e6e6e6'}}>
            {player2Name}
          </span>
          <span style={{
            ...styles.playerStatus,
            backgroundColor: player2Ready ? '#2ecc71' : '#e74c3c',
            color: 'white',
          }}>
            {player2Ready ? ' Prêt' : 'En attente...'}
          </span>
        </div>
      </div>

      {}
      <h2 style={styles.sectionTitle}>Sélection de la Map</h2>
      <div style={styles.mapsContainer}>
        <div 
          id="map1"
          style={{
            ...styles.mapCard,
            ...(selectedMapId === 'map1' ? styles.mapCardSelected : {}),
            pointerEvents: isReady ? 'none' : 'auto',
            opacity: isReady ? 0.6 : 1,
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
            ...(selectedMapId === 'map2' ? styles.mapCardSelected : {}),
            pointerEvents: isReady ? 'none' : 'auto',
            opacity: isReady ? 0.6 : 1,
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
      
      {}
      <div style={styles.configContainer}>
        <h2 style={styles.configTitle}>Votre Couleur</h2>
        <div style={styles.colorOptions}>
          {['#00ccff', '#00ff00', '#ffff00', '#ff00ff', '#ff9900'].map(color => (
            <div 
              key={`color-${color}`}
              style={{
                ...styles.colorOption,
                backgroundColor: color,
                ...(myColor === color ? styles.colorOptionSelected : {}),
                pointerEvents: isReady ? 'none' : 'auto',
                opacity: isReady ? 0.6 : 1,
              }}
              onClick={() => handleColorChange(color)}
            />
          ))}
        </div>

        {}
        <button
          onClick={handleReady}
          style={{
            ...styles.readyButton,
            ...(isReady ? styles.readyButtonReady : {}),
          }}
        >
          {isReady ? ' PRÊT !' : 'JE SUIS PRÊT'}
        </button>
      </div>

      {}
      {isReady && !opponentReady && (
        <p style={styles.waitingMessage}>
          En attente de l'adversaire<span className="dots"></span>
        </p>
      )}

      {isReady && opponentReady && (
        <p style={{...styles.waitingMessage, color: '#2ecc71'}}>
          Lancement du match...
        </p>
      )}

      <style jsx global>{`
        .dots::after {
          content: '';
          animation: dots 1.5s infinite;
        }
        @keyframes dots {
          0%, 20% { content: '.'; }
          40% { content: '..'; }
          60%, 100% { content: '...'; }
        }
      `}</style>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#1a1a2e',
    color: '#e6e6e6',
    fontFamily: 'Arial, sans-serif',
    padding: '20px',
  },
  title: {
    fontSize: '2.5rem',
    marginBottom: '10px',
    color: 'white',
    textShadow: '0 0 10px #ff6600, 0 0 20px #ff3300',
    letterSpacing: '1.5px',
  },
  subtitle: {
    fontSize: '1.2rem',
    marginBottom: '30px',
    color: '#ffcc00',
  },
  matchInfo: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '30px',
    marginBottom: '40px',
    padding: '20px',
    backgroundColor: 'rgba(22, 33, 62, 0.8)',
    borderRadius: '15px',
    boxShadow: '0 0 20px rgba(255, 102, 0, 0.3)',
  },
  playerCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '20px 40px',
    backgroundColor: 'rgba(26, 26, 46, 0.9)',
    borderRadius: '10px',
    minWidth: '200px',
  },
  playerName: {
    fontSize: '1.4rem',
    fontWeight: 'bold',
    marginBottom: '10px',
  },
  playerStatus: {
    fontSize: '0.9rem',
    padding: '5px 15px',
    borderRadius: '20px',
    fontWeight: 'bold',
  },
  vsText: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#ff6600',
    textShadow: '0 0 10px rgba(255, 102, 0, 0.7)',
  },
  sectionTitle: {
    fontSize: '1.5rem',
    marginBottom: '20px',
    color: '#ffcc00',
  },
  mapsContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '20px',
    margin: '20px 0',
    flexWrap: 'wrap' as const,
  },
  mapCard: {
    width: '300px',
    height: '200px',
    borderRadius: '15px',
    overflow: 'hidden',
    position: 'relative' as const,
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
    transition: 'all 0.3s ease',
  },
  mapCardSelected: {
    transform: 'scale(1.05)',
    boxShadow: '0 0 20px #ff6600, 0 0 30px rgba(255, 102, 0, 0.7)',
    border: '3px solid #ff6600',
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
    position: 'absolute' as const,
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
  configContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: '30px',
    borderRadius: '15px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
    border: '2px solid rgba(255, 200, 0, 0.3)',
    maxWidth: '500px',
    width: '100%',
    marginTop: '30px',
  },
  configTitle: {
    fontSize: '1.5rem',
    marginBottom: '25px',
    textAlign: 'center' as const,
    color: '#ffcc00',
  },
  colorOptions: {
    display: 'flex',
    justifyContent: 'center',
    gap: '15px',
    flexWrap: 'wrap' as const,
    marginBottom: '30px',
  },
  colorOption: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
    border: '2px solid transparent',
  },
  colorOptionSelected: {
    transform: 'scale(1.2)',
    boxShadow: '0 0 15px white, 0 0 20px rgba(255, 255, 255, 0.7)',
    border: '2px solid white',
  },
  readyButton: {
    width: '100%',
    background: 'linear-gradient(to right, #ff8c00, #ff6600)',
    color: 'white',
    border: 'none',
    padding: '15px 40px',
    fontSize: '1.3rem',
    fontWeight: 'bold',
    borderRadius: '30px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(255, 102, 0, 0.4)',
    textTransform: 'uppercase' as const,
  },
  readyButtonReady: {
    background: 'linear-gradient(135deg, #2ecc71, #27ae60)',
    boxShadow: '0 4px 15px rgba(46, 204, 113, 0.5)',
  },
  waitingMessage: {
    marginTop: '30px',
    fontSize: '1.3rem',
    color: '#ffcc00',
    fontStyle: 'italic' as const,
  },
};

export default GameCustomisation;