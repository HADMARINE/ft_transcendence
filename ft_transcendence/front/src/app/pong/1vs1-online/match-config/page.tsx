"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useGameData } from '@/util/useGameData';

const styles = {
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
    position: 'relative' as const,
  },
  title: {
    fontSize: '2.5rem',
    marginBottom: '10px',
    color: '#4cc9f0',
    textShadow: '0 0 10px rgba(76, 201, 240, 0.7)',
  },
  subtitle: {
    fontSize: '1.2rem',
    marginBottom: '30px',
    color: '#9d4edd',
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
    boxShadow: '0 0 20px rgba(76, 201, 240, 0.3)',
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
    color: '#f72585',
    textShadow: '0 0 10px rgba(247, 37, 133, 0.7)',
  },
  configContainer: {
    backgroundColor: 'rgba(22, 33, 62, 0.8)',
    padding: '30px',
    borderRadius: '15px',
    boxShadow: '0 0 20px rgba(0, 0, 0, 0.5)',
    maxWidth: '500px',
    width: '100%',
    marginBottom: '30px',
  },
  configTitle: {
    fontSize: '1.5rem',
    marginBottom: '25px',
    textAlign: 'center' as const,
    color: '#4cc9f0',
  },
  configGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    marginBottom: '20px',
  },
  configLabel: {
    fontSize: '1rem',
    fontWeight: 'bold',
  },
  colorPickerContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  configColorInput: {
    width: '50px',
    height: '40px',
    padding: '0',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
  },
  configColorPreview: {
    flex: 1,
    height: '40px',
    borderRadius: '5px',
    border: '2px solid rgba(255,255,255,0.3)',
  },
  sliderContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  slider: {
    width: '100%',
    height: '8px',
    borderRadius: '4px',
    outline: 'none',
    cursor: 'pointer',
  },
  sliderValue: {
    textAlign: 'center' as const,
    fontSize: '1.1rem',
    color: '#4cc9f0',
    fontWeight: 'bold',
  },
  readyButton: {
    width: '100%',
    padding: '18px 30px',
    fontSize: '1.3rem',
    backgroundColor: '#4cc9f0',
    color: '#16213e',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'all 0.3s',
    boxShadow: '0 0 15px rgba(76, 201, 240, 0.5)',
  },
  readyButtonReady: {
    backgroundColor: '#2ecc71',
    boxShadow: '0 0 20px rgba(46, 204, 113, 0.6)',
  },
  waitingMessage: {
    fontSize: '1.2rem',
    color: '#f72585',
    marginTop: '20px',
    textAlign: 'center' as const,
  },
};

export default function MatchConfigPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameData = useGameData();
  const [myColor, setMyColor] = useState('#4cc9f0');
  const [paddleSpeed, setPaddleSpeed] = useState(20);
  const [isReady, setIsReady] = useState(false);
  const [opponentReady, setOpponentReady] = useState(false);
  const [matchData, setMatchData] = useState<any>(null);
  const hasNavigated = useRef(false);

  const roomId = searchParams.get('roomId');
  const tournamentId = searchParams.get('tournamentId');
  const matchId = searchParams.get('matchId');
  const myUserId = gameData.user?.id;

  useEffect(() => {
    const client = gameData.client;
    if (!client) {
      console.log('match-config: No client available yet');
      return;
    }

    console.log('match-config: Setting up socket listeners');

    const handleConfigUpdate = (data: any) => {
      console.log('match-config: Received config-update', data);
      console.log('Data roomId:', data.roomId, 'Current roomId:', roomId);
      
      if (data.roomId === roomId) {
        console.log('Updating opponent ready status to:', data.ready);
        if (data.ready !== undefined) {
          setOpponentReady(data.ready);
        }
      } else {
        console.log('Ignoring config update - wrong room');
      }
    };

    const handleIngameComm = (data: any) => {
      console.log('match-config: Received ingame-comm', data);
      if (!hasNavigated.current) {
        hasNavigated.current = true;
        const gameRoomId = data.roomId || data.id;
        console.log(' Navigating to game with roomId:', gameRoomId);
        
        const url = tournamentId 
          ? `/pong/1vs1-online/game?roomId=${gameRoomId}&tournamentId=${tournamentId}`
          : `/pong/1vs1-online/game?roomId=${gameRoomId}`;
        
        router.push(url);
      }
    };

    const handleMatchConfig = (data: any) => {
      console.log('match-config: Received match-config', data);
      setMatchData(data);
    };

    client.on('config-update', handleConfigUpdate);
    client.on('ingame-comm', handleIngameComm);
    client.on('match-config', handleMatchConfig);

    return () => {
      client.off('config-update', handleConfigUpdate);
      client.off('ingame-comm', handleIngameComm);
      client.off('match-config', handleMatchConfig);
    };
  }, [gameData.client, roomId, myUserId, router, tournamentId, matchId]);

  const handleReady = () => {
    const client = gameData.client;
    if (!client) return;

    const newReadyState = !isReady;
    setIsReady(newReadyState);

    client.emit('player-config', {
      roomId,
      tournamentId,
      matchId,
      color: myColor,
      paddleSpeed: paddleSpeed,
      ready: newReadyState,
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
      paddleSpeed: paddleSpeed,
      ready: isReady,
    });
  };

  const handleSpeedChange = (speed: number) => {
    setPaddleSpeed(speed);
    
    const client = gameData.client;
    if (!client) return;

    client.emit('player-config', {
      roomId,
      tournamentId,
      matchId,
      color: myColor,
      paddleSpeed: speed,
      ready: isReady,
    });
  };

  const player1Name = matchData?.player1?.nickname || searchParams.get('player1') || 'Joueur 1';
  const player2Name = matchData?.player2?.nickname || searchParams.get('player2') || 'Joueur 2';
  
  const amIPlayer1 = matchData?.player1?.id === myUserId;
  const myName = amIPlayer1 ? player1Name : player2Name;
  const opponentName = amIPlayer1 ? player2Name : player1Name;
  
  const player1Ready = amIPlayer1 ? isReady : opponentReady;
  const player2Ready = amIPlayer1 ? opponentReady : isReady;

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Configuration du Match</h1>
      <p style={styles.subtitle}>
        {tournamentId ? 'Match de Tournoi' : 'Duel 1vs1'}
      </p>

      {}
      <div style={styles.matchInfo}>
        <div style={{
          ...styles.playerCard,
          border: amIPlayer1 ? '2px solid #4cc9f0' : '2px solid transparent',
        }}>
          <span style={{...styles.playerName, color: amIPlayer1 ? '#4cc9f0' : '#e6e6e6'}}>
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
          border: !amIPlayer1 ? '2px solid #f72585' : '2px solid transparent',
        }}>
          <span style={{...styles.playerName, color: !amIPlayer1 ? '#f72585' : '#e6e6e6'}}>
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
      <div style={styles.configContainer}>
        <h2 style={styles.configTitle}>Vos Paramètres</h2>

        <div style={styles.configGroup}>
          <label style={styles.configLabel}>Couleur de votre raquette :</label>
          <div style={styles.colorPickerContainer}>
            <input
              type="color"
              value={myColor}
              onChange={(e) => handleColorChange(e.target.value)}
              style={styles.configColorInput}
              disabled={isReady}
            />
            <div style={{
              ...styles.configColorPreview,
              backgroundColor: myColor,
            }} />
          </div>
        </div>

        <div style={styles.configGroup}>
          <label style={styles.configLabel}>Vitesse de la raquette :</label>
          <div style={styles.sliderContainer}>
            <input
              type="range"
              min="15"
              max="30"
              value={paddleSpeed}
              onChange={(e) => handleSpeedChange(Number(e.target.value))}
              style={styles.slider}
              disabled={isReady}
            />
            <div style={styles.sliderValue}>{paddleSpeed}</div>
          </div>
        </div>

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
}
