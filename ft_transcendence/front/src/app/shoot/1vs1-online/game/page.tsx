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
    color: "#ffcc00",
    textShadow: "0 0 10px #ff6600, 0 0 20px #ff3300",
  },
  gameContainer: {
    position: "relative" as const,
    margin: "0 auto",
    border: "3px solid #ff6600",
    borderRadius: "5px",
    boxShadow: "0 0 20px rgba(255, 102, 0, 0.5)",
    overflow: "hidden",
  },
  canvas: {
    display: "block",
    backgroundColor: "#16213e",
  },
  healthBar: {
    display: "flex",
    justifyContent: "space-around",
    marginBottom: "20px",
    fontSize: "1.5rem",
    fontWeight: "bold" as const,
  },
  playerHealth: {
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
    boxShadow: "0 0 30px rgba(255, 102, 0, 0.7)",
  },
  winnerText: {
    fontSize: "2.5rem",
    color: "#ffcc00",
    marginBottom: "20px",
  },
  backButton: {
    padding: "15px 40px",
    fontSize: "1.2rem",
    background: "linear-gradient(to right, #ff8c00, #ff6600)",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontWeight: "bold" as const,
    marginTop: "20px",
  },
};

const ShootGame = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const gameData = useGameData();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const roomId = searchParams.get('roomId');
  const tournamentId = searchParams.get('tournamentId');
  const matchId = searchParams.get('matchId');
  
  const [gameState, setGameState] = useState<any>(null);
  const [winner, setWinner] = useState<any>(null);
  const [myUserId, setMyUserId] = useState<string>('');
  const keysPressed = useRef<Set<string>>(new Set());

  useEffect(() => {
    console.log(' === SHOOT GAME PAGE LOADED ===');
    console.log(' Room ID:', roomId);
    console.log(' Tournament ID:', tournamentId);
    console.log(' Match ID:', matchId);
    console.log(' Client available:', !!gameData.client);
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

    console.log(' Setting up shoot game listeners for room:', roomId);

    const handleShootUpdate = (data: any) => {
      if (data.roomId === roomId) {
        setGameState(data);
      }
    };

    const handleGameEnded = (data: any) => {
      console.log(' Game ended:', data);
      setWinner(data);
      
      setTimeout(() => {
        if (tournamentId) {
          console.log(' Redirecting to tournament page...');
          router.push(`/shoot/1vs1-online/tournament?tournamentId=${tournamentId}`);
        } else {
          console.log(' Redirecting to home page...');
          router.push('/shoot');
        }
      }, 3000);
    };

    const handleTournamentCancelled = (data: { tournamentId: string; reason: string }) => {
      console.log(' Tournament cancelled:', data);
      alert(`Tournoi annulé: ${data.reason}`);
      router.push('/shoot');
    };

    const handleTournamentEnded = (data: any) => {
      console.log(' Tournament ended:', data);
      setTimeout(() => {
        console.log(' Redirecting to home page...');
        router.push('/shoot');
      }, 5000);
    };

    client.on('shoot-update', handleShootUpdate);
    client.on('game-ended', handleGameEnded);
    client.on('tournament-cancelled', handleTournamentCancelled);
    client.on('tournament-ended', handleTournamentEnded);

    return () => {
      client.off('shoot-update', handleShootUpdate);
      client.off('game-ended', handleGameEnded);
      client.off('tournament-cancelled', handleTournamentCancelled);
      client.off('tournament-ended', handleTournamentEnded);
    };
  }, [gameData.client, roomId, tournamentId, router]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const validKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'c', 'v'];
      if (validKeys.includes(e.key.toLowerCase()) || validKeys.includes(e.key)) {
        e.preventDefault();
        keysPressed.current.add(e.key);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const validKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'c', 'v'];
      if (validKeys.includes(e.key.toLowerCase()) || validKeys.includes(e.key)) {
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

  useEffect(() => {
    if (!gameData.client || !roomId) return;

    const interval = setInterval(() => {
      const actions: any = {
        roomId,
        move: { x: 0, y: 0 },
        fire: false,
        dash: false,
      };

      if (keysPressed.current.has('ArrowUp') || keysPressed.current.has('w')) actions.move.y = -1;
      if (keysPressed.current.has('ArrowDown') || keysPressed.current.has('s')) actions.move.y = 1;
      if (keysPressed.current.has('ArrowLeft') || keysPressed.current.has('a')) actions.move.x = -1;
      if (keysPressed.current.has('ArrowRight') || keysPressed.current.has('d')) actions.move.x = 1;
      
      if (keysPressed.current.has('c')) actions.fire = true;
      
      if (keysPressed.current.has('v')) actions.dash = true;

      if (actions.move.x !== 0 || actions.move.y !== 0 || actions.fire || actions.dash) {
        gameData.client?.emit('player-action', actions);
      }
    }, 16);

    return () => clearInterval(interval);
  }, [gameData.client, roomId]);

  useEffect(() => {
    if (!gameState || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const GAME_WIDTH = 1700;
    const GAME_HEIGHT = 750;

    ctx.fillStyle = '#16213e';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    ctx.fillStyle = '#4a5568';
    if (gameState.walls) {
      gameState.walls.forEach((wall: any) => {
        ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
      });
    }

    if (gameState.players) {
      gameState.players.forEach((player: any) => {
        ctx.fillStyle = player.color || '#00ccff';
        ctx.fillRect(player.x, player.y, player.width, player.height);
        
        const barWidth = player.width;
        const barHeight = 5;
        ctx.fillStyle = '#333';
        ctx.fillRect(player.x, player.y - 10, barWidth, barHeight);
        ctx.fillStyle = player.health > 50 ? '#2ecc71' : player.health > 25 ? '#f39c12' : '#e74c3c';
        ctx.fillRect(player.x, player.y - 10, barWidth * (player.health / 100), barHeight);
      });
    }

    if (gameState.fireballs) {
      gameState.fireballs.forEach((fireball: any) => {
        ctx.fillStyle = fireball.color || '#ff6600';
        ctx.beginPath();
        ctx.arc(fireball.x, fireball.y, fireball.radius || 8, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    if (gameState.particles) {
      gameState.particles.forEach((particle: any) => {
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.life / 100;
        ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
        ctx.globalAlpha = 1;
      });
    }

  }, [gameState]);

  const handleBackClick = () => {
    if (tournamentId) {
      router.push(`/shoot/1vs1-online/tournament?tournamentId=${tournamentId}`);
    } else {
      router.push('/shoot');
    }
  };

  if (!gameState) {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>Shoot - Connexion au jeu...</h1>
        <p>Chargement...</p>
      </div>
    );
  }

  const player1 = gameState.players?.[0];
  const player2 = gameState.players?.[1];

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>SHOOT - Duel en Ligne</h1>
      
      <div style={styles.healthBar}>
        <div style={styles.playerHealth}>
          <span style={{ color: player1?.color || '#00ccff' }}>
            {player1?.name || 'Joueur 1'}: {player1?.health || 0}%
          </span>
        </div>
        <div style={styles.playerHealth}>
          <span style={{ color: player2?.color || '#ff6666' }}>
            {player2?.name || 'Joueur 2'}: {player2?.health || 0}%
          </span>
        </div>
      </div>

      <div style={styles.gameContainer}>
        <canvas
          ref={canvasRef}
          width={1700}
          height={750}
          style={styles.canvas}
        />
        
        {winner && (
          <div style={styles.winnerScreen}>
            <h2 style={styles.winnerText}>
              {winner.winnerId === myUserId ? 'Victoire !' : 'Défaite'}
            </h2>
            <p>Gagnant: {winner.winnerName}</p>
            <button style={styles.backButton} onClick={handleBackClick}>
              {tournamentId ? 'Retour au Tournoi' : 'Retour au Menu'}
            </button>
          </div>
        )}
      </div>
      
      <div style={{ marginTop: '20px', textAlign: 'center', color: '#aaa', fontSize: '0.9rem' }}>
        <p>Commandes: WASD ou Flèches = Déplacements | C = Tir | V = Dash</p>
      </div>
    </div>
  );
};

export default ShootGame;
