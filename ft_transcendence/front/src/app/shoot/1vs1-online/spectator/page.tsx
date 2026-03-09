"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useGameData, GametypeEnum } from "@/util/useGameData";

interface SpectatorGameData {
  roomId: string;
  tournamentId: string;
  matchId: string;
  players: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    health: number;
    color: string;
    name: string;
  }>;
  fireballs: Array<{
    x: number;
    y: number;
    radius: number;
    color: string;
  }>;
  walls: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    backgroundColor: "#1a1a2e",
    color: "#e6e6e6",
    fontFamily: "Arial, sans-serif",
    padding: "20px",
  },
  header: {
    textAlign: "center",
    marginBottom: "20px",
  },
  title: {
    fontSize: "2rem",
    color: "#ff6600",
    marginBottom: "10px",
    textShadow: "0 0 10px rgba(255, 102, 0, 0.7)",
  },
  badge: {
    display: "inline-block",
    backgroundColor: "rgba(255, 102, 0, 0.2)",
    border: "2px solid #ff6600",
    color: "#ff6600",
    padding: "10px 20px",
    borderRadius: "25px",
    fontSize: "1rem",
    fontWeight: "bold",
    marginBottom: "20px",
  },
  gameContainer: {
    position: "relative",
    margin: "0 auto",
    border: "3px solid #ff6600",
    borderRadius: "5px",
    boxShadow: "0 0 20px rgba(255, 102, 0, 0.5)",
    overflow: "hidden",
  },
  healthBar: {
    display: "flex",
    justifyContent: "space-around",
    marginBottom: "20px",
    fontSize: "1.5rem",
    fontWeight: "bold",
  },
  playerHealth: {
    padding: "10px 30px",
    backgroundColor: "rgba(22, 33, 62, 0.8)",
    borderRadius: "10px",
  },
  matchInfo: {
    marginBottom: "30px",
  },
  versus: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-around",
    gap: "20px",
    marginBottom: "30px",
  },
  playerBox: {
    backgroundColor: "rgba(76, 201, 240, 0.1)",
    border: "2px solid #4cc9f0",
    borderRadius: "12px",
    padding: "20px",
    flex: 1,
    minWidth: "200px",
  },
  playerName: {
    fontSize: "1.5rem",
    color: "#fff",
    fontWeight: "bold",
    marginBottom: "10px",
  },
  playerScore: {
    fontSize: "3rem",
    color: "#4cc9f0",
    fontWeight: "bold",
  },
  vsText: {
    fontSize: "2rem",
    color: "#f72585",
    fontWeight: "bold",
  },
  canvas: {
    display: "block",
    backgroundColor: "#16213e",
  },
  statusText: {
    fontSize: "1.2rem",
    color: "#a0a0a0",
    marginTop: "20px",
  },
  backButton: {
    backgroundColor: "#ff6600",
    color: "white",
    border: "none",
    padding: "12px 30px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "1rem",
    fontWeight: "bold",
    marginTop: "20px",
    transition: "all 0.3s ease",
  },
  winnerOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  winnerCard: {
    backgroundColor: "rgba(22, 33, 62, 0.95)",
    border: "3px solid #ffcc00",
    borderRadius: "20px",
    padding: "40px",
    textAlign: "center",
    boxShadow: "0 0 40px rgba(255, 204, 0, 0.7)",
  },
  winnerTitle: {
    fontSize: "2.5rem",
    color: "#ffcc00",
    marginBottom: "20px",
    textShadow: "0 0 20px rgba(255, 204, 0, 0.8)",
  },
  winnerName: {
    fontSize: "3rem",
    color: "#ff6600",
    marginBottom: "30px",
    fontWeight: "bold",
  },
  redirectMessage: {
    fontSize: "1.2rem",
    color: "#e6e6e6",
    marginTop: "20px",
  },
  waitingMessage: {
    fontSize: "1.5rem",
    color: "#ffcc00",
    textAlign: "center",
    marginTop: "50px",
  },
};

export default function SpectatorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameData = useGameData();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const roomId = searchParams.get('roomId');
  const tournamentId = searchParams.get('tournamentId');
  const matchId = searchParams.get('matchId');

  const [gameState, setGameState] = useState<SpectatorGameData | null>(null);
  const [winner, setWinner] = useState<{ winnerId: string; winnerName: string } | null>(null);

  useEffect(() => {
    console.log('👁️ Shoot Spectator mode initialized');
    console.log('👁️ Room ID:', roomId);
    console.log('👁️ Tournament ID:', tournamentId);
    console.log('👁️ Match ID:', matchId);
  }, [roomId, tournamentId, matchId]);

  useEffect(() => {
    const client = gameData.client;
    if (!client || !roomId) return;

    console.log('👁️ Setting up spectator listeners for room:', roomId);

    // Demander à rejoindre en tant que spectateur
    client.emit('spectate-game', { 
      roomId,
      tournamentId,
      matchId,
      gametype: GametypeEnum.SHOOT
    });

    // Écouter les mises à jour du jeu
    const handleShootUpdate = (data: any) => {
      if (data.roomId === roomId) {
        setGameState(data);
      }
    };

    // Écouter la fin du jeu
    const handleGameEnded = (data: { winnerId: string; winnerName: string }) => {
      console.log('🏁 Game ended (spectator view):', data);
      setWinner(data);

      // Rediriger vers le tournoi après 3 secondes
      setTimeout(() => {
        if (tournamentId) {
          router.push(`/shoot/1vs1-online/tournament?tournamentId=${tournamentId}`);
        }
      }, 3000);
    };

    const handleTournamentEnded = (data: any) => {
      console.log('🏆 Tournament ended:', data);
      setTimeout(() => {
        router.push('/shoot');
      }, 5000);
    };

    client.on('shoot-update', handleShootUpdate);
    client.on('game-ended', handleGameEnded);
    client.on('tournament-ended', handleTournamentEnded);

    return () => {
      client.off('shoot-update', handleShootUpdate);
      client.off('game-ended', handleGameEnded);
      client.off('tournament-ended', handleTournamentEnded);
    };
  }, [gameData.client, roomId, tournamentId, matchId, router]);

  // Rendu du canvas
  useEffect(() => {
    if (!gameState || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Effacer le canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dessiner les murs
    ctx.fillStyle = '#444';
    gameState.walls.forEach(wall => {
      ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
    });

    // Dessiner les joueurs
    gameState.players.forEach(player => {
      ctx.fillStyle = player.color;
      ctx.fillRect(player.x, player.y, player.width, player.height);

      // Nom du joueur au-dessus
      ctx.fillStyle = '#fff';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(player.name, player.x + player.width / 2, player.y - 5);
    });

    // Dessiner les fireballs
    gameState.fireballs.forEach(fireball => {
      ctx.fillStyle = fireball.color;
      ctx.beginPath();
      ctx.arc(fireball.x, fireball.y, fireball.radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [gameState]);

  const handleBackToTournament = () => {
    if (tournamentId) {
      router.push(`/shoot/1vs1-online/tournament?tournamentId=${tournamentId}`);
    } else {
      router.push('/shoot');
    }
  };

  if (winner) {
    return (
      <div style={styles.winnerOverlay as React.CSSProperties}>
        <div style={styles.winnerCard as React.CSSProperties}>
          <div style={styles.winnerTitle as React.CSSProperties}>🏆 Victoire !</div>
          <div style={styles.winnerName as React.CSSProperties}>{winner.winnerName}</div>
          <div style={styles.redirectMessage as React.CSSProperties}>
            Retour au tournoi dans quelques secondes...
          </div>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div style={styles.container as React.CSSProperties}>
        <div style={styles.header as React.CSSProperties}>
          <h1 style={styles.title as React.CSSProperties}>Mode Spectateur</h1>
          <div style={styles.badge as React.CSSProperties}>🎮 SHOOT - EN DIRECT</div>
        </div>
        <div style={styles.waitingMessage as React.CSSProperties}>
          En attente du début du match...
        </div>
        <button
          style={styles.backButton as React.CSSProperties}
          onClick={handleBackToTournament}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#ff8c00";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#ff6600";
          }}
        >
          Retour au tournoi
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container as React.CSSProperties}>
      <div style={styles.header as React.CSSProperties}>
        <h1 style={styles.title as React.CSSProperties}>Mode Spectateur</h1>
        <div style={styles.badge as React.CSSProperties}>🎮 SHOOT - EN DIRECT</div>
      </div>

      <div style={styles.healthBar as React.CSSProperties}>
        <div style={styles.playerHealth as React.CSSProperties}>
          <span style={{ color: gameState.players[0]?.color || '#ff6600' }}>
            {gameState.players[0]?.name || 'Joueur 1'}
          </span>
          : {gameState.players[0]?.health || 0} HP
        </div>
        <div style={styles.playerHealth as React.CSSProperties}>
          <span style={{ color: gameState.players[1]?.color || '#ffcc00' }}>
            {gameState.players[1]?.name || 'Joueur 2'}
          </span>
          : {gameState.players[1]?.health || 0} HP
        </div>
      </div>

      <div style={styles.gameContainer as React.CSSProperties}>
        <canvas
          ref={canvasRef}
          width={1700}
          height={750}
          style={styles.canvas as React.CSSProperties}
        />
      </div>

      <button
        style={styles.backButton as React.CSSProperties}
        onClick={handleBackToTournament}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "#ff8c00";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "#ff6600";
        }}
      >
        Retour au tournoi
      </button>
    </div>
  );
}
