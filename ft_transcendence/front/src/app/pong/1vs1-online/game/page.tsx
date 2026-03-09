"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useGameData } from "@/util/useGameData";

const styles = {
  container: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    backgroundColor: "#1a1a2e",
    color: "#e6e6e6",
    fontFamily: "Arial, sans-serif",
    padding: "20px",
    position: "relative" as const,
  },
  title: {
    fontSize: "2.5rem",
    marginBottom: "20px",
    color: "#4cc9f0",
    textShadow: "0 0 10px rgba(76, 201, 240, 0.7)",
  },
  gameContainer: {
    position: "relative" as const,
    margin: "0 auto",
    border: "3px solid #4cc9f0",
    borderRadius: "5px",
    boxShadow: "0 0 20px rgba(76, 201, 240, 0.5)",
    overflow: "hidden",
  },
  canvas: {
    display: "block",
    backgroundColor: "#16213e",
  },
  scoreBoard: {
    display: "flex",
    justifyContent: "space-around",
    marginBottom: "20px",
    fontSize: "2rem",
    fontWeight: "bold" as const,
  },
  playerScore: {
    padding: "10px 30px",
    backgroundColor: "rgba(22, 33, 62, 0.8)",
    borderRadius: "10px",
  },
  winnerScreen: {
    position: "absolute" as const,
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    textAlign: "center" as const,
    backgroundColor: "rgba(26, 26, 46, 0.95)",
    padding: "40px",
    borderRadius: "10px",
    zIndex: 10,
    boxShadow: "0 0 30px rgba(247, 37, 133, 0.7)",
  },
  winnerText: {
    fontSize: "2.5rem",
    color: "#4cc9f0",
    marginBottom: "20px",
  },
  backButton: {
    padding: "15px 40px",
    fontSize: "1.2rem",
    backgroundColor: "#f72585",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontWeight: "bold" as const,
    marginTop: "20px",
  },
};

const PongGame = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const gameData = useGameData();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const roomId = searchParams.get('roomId');
  const tournamentId = searchParams.get('tournamentId');
  
  const [gameState, setGameState] = useState<any>(null);
  const [winner, setWinner] = useState<any>(null);
  const [myUserId, setMyUserId] = useState<string>('');
  const keysPressed = useRef<Set<string>>(new Set());

  useEffect(() => {
    console.log('🎮 === PONG GAME PAGE LOADED ===');
    console.log('🎮 Room ID:', roomId);
    console.log('🎮 Client available:', !!gameData.client);
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setMyUserId(user.id);
      } catch (e) {
        console.error('Error parsing user from localStorage:', e);
      }
    }
  }, []);

  useEffect(() => {
    const client = gameData.client;
    if (!client || !roomId) return;

    console.log('🎮 Setting up pong game listeners for room:', roomId);

    // Écouter les mises à jour du jeu
    const handlePongUpdate = (data: any) => {
      if (data.roomId === roomId) {
        setGameState(data);
      }
    };

    // Écouter la fin du jeu
    const handleGameEnded = (data: any) => {
      console.log('🏁 Game ended:', data);
      setWinner(data);
      
      // Si c'est un match de tournoi, rediriger automatiquement après 3 secondes
      if (tournamentId) {
        setTimeout(() => {
          console.log('🎪 Redirecting to tournament page...');
          router.push(`/pong/1vs1-online/tournament?tournamentId=${tournamentId}`);
        }, 3000);
      }
    };

    const handleTournamentCancelled = (data: { tournamentId: string; reason: string }) => {
      console.log('🚫 Tournament cancelled:', data);
      alert(`Tournoi annulé: ${data.reason}`);
      router.push('/pong');
    };

    const handleTournamentEnded = (data: any) => {
      console.log('🏆 Tournament ended:', data);
      // Rediriger vers home après 5 secondes
      setTimeout(() => {
        console.log('🏠 Redirecting to home page...');
        router.push('/pong');
      }, 5000);
    };

    client.on('pong-update', handlePongUpdate);
    client.on('game-ended', handleGameEnded);
    client.on('tournament-cancelled', handleTournamentCancelled);
    client.on('tournament-ended', handleTournamentEnded);

    return () => {
      client.off('pong-update', handlePongUpdate);
      client.off('game-ended', handleGameEnded);
      client.off('tournament-cancelled', handleTournamentCancelled);
      client.off('tournament-ended', handleTournamentEnded);
    };
  }, [gameData.client, roomId, tournamentId, router]);

  // Gestion des touches du clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        keysPressed.current.add(e.key);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        keysPressed.current.delete(e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Envoyer les commandes de mouvement au serveur
  useEffect(() => {
    if (!gameData.client || !roomId) return;

    const interval = setInterval(() => {
      if (keysPressed.current.has('ArrowUp')) {
        gameData.client?.emit('paddle-move', { roomId, direction: 'up' });
      } else if (keysPressed.current.has('ArrowDown')) {
        gameData.client?.emit('paddle-move', { roomId, direction: 'down' });
      }
    }, 16);

    return () => clearInterval(interval);
  }, [gameData.client, roomId]);

  // Dessiner le jeu sur le canvas
  useEffect(() => {
    if (!canvasRef.current || !gameState) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Animation frame pour mettre à jour à 60 FPS (environ toutes les 16ms)
    let animationFrameId: number;

    const draw = () => {
      // Nettoyer le canvas
      ctx.fillStyle = '#16213e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Ligne centrale
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.stroke();
      ctx.setLineDash([]);

      // Dessiner la raquette du joueur 1
      ctx.fillStyle = gameState.player1.color;
      ctx.fillRect(10, gameState.player1.y, 10, 100);

      // Dessiner la raquette du joueur 2
      ctx.fillStyle = gameState.player2.color;
      ctx.fillRect(canvas.width - 20, gameState.player2.y, 10, 100);

      // Dessiner la balle
      ctx.fillStyle = '#f72585';
      ctx.beginPath();
      ctx.arc(gameState.ball.x, gameState.ball.y, gameState.ball.radius, 0, Math.PI * 2);
      ctx.fill();

      // Continuer l'animation
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [gameState]);

  const handleBackToMenu = () => {
    router.push('/pong');
  };

  if (!roomId) {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>Erreur</h1>
        <p>Room ID manquant</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Pong - Match en Ligne</h1>
      
      <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: 'rgba(255,0,0,0.2)', borderRadius: '5px' }}>
        <p>Room ID: {roomId || 'N/A'}</p>
        <p>Game State: {gameState ? 'Received' : 'Waiting...'}</p>
        <p>Ball: {gameState ? `(${Math.round(gameState.ball?.x)}, ${Math.round(gameState.ball?.y)})` : 'N/A'}</p>
        <p>Player 1 Score: {gameState?.player1?.score ?? 'N/A'}</p>
        <p>Player 2 Score: {gameState?.player2?.score ?? 'N/A'}</p>
      </div>

      {gameState && (
        <div style={styles.scoreBoard}>
          <div style={styles.playerScore}>
            <span style={{ color: gameState.player1.color }}>
              {gameState.player1.score}
            </span>
          </div>
          <div style={styles.playerScore}>
            <span style={{ color: gameState.player2.color }}>
              {gameState.player2.score}
            </span>
          </div>
        </div>
      )}

      <div style={styles.gameContainer}>
        <canvas
          ref={canvasRef}
          width={1200}
          height={800}
          style={styles.canvas}
        />
      </div>

      {winner && (
        <div style={styles.winnerScreen}>
          <h2 style={styles.winnerText}>
            🏆 {winner.winnerNickname} a gagné ! 🏆
          </h2>
          <p style={{ fontSize: '1.5rem', marginBottom: '10px' }}>
            Score final: {winner.finalScore.player1} - {winner.finalScore.player2}
          </p>
          {tournamentId ? (
            <p style={{ fontSize: '1rem', color: '#4cc9f0', marginTop: '20px' }}>
              Redirection vers le tournoi dans 3 secondes...
            </p>
          ) : (
            <button style={styles.backButton} onClick={() => router.push('/pong')}>
              Retour au menu
            </button>
          )}
        </div>
      )}

      <p style={{ marginTop: '20px', color: '#9d4edd' }}>
        Utilisez les flèches ↑ ↓ pour contrôler votre raquette
      </p>
    </div>
  );
};

export default PongGame;
