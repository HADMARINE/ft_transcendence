"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useGameData, GametypeEnum } from "@/util/useGameData";

interface SpectatorGameData {
  roomId: string;
  tournamentId: string;
  matchId: string;
  player1: { id: string; nickname: string; score?: number; color?: string; y?: number };
  player2: { id: string; nickname: string; score?: number; color?: string; y?: number };
  ball?: { x: number; y: number; radius: number };
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
    color: "#9c27b0",
    marginBottom: "10px",
  },
  badge: {
    display: "inline-block",
    backgroundColor: "rgba(156, 39, 176, 0.2)",
    border: "2px solid #9c27b0",
    color: "#9c27b0",
    padding: "10px 20px",
    borderRadius: "25px",
    fontSize: "1rem",
    fontWeight: "bold",
    marginBottom: "20px",
  },
  gameContainer: {
    position: "relative",
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
    fontWeight: "bold",
  },
  playerScore: {
    padding: "10px 30px",
    backgroundColor: "rgba(22, 33, 62, 0.8)",
    borderRadius: "10px",
  },
  backButton: {
    backgroundColor: "#f72585",
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
    border: "3px solid #4caf50",
    borderRadius: "20px",
    padding: "50px 80px",
    textAlign: "center",
    boxShadow: "0 0 40px rgba(76, 175, 80, 0.6)",
    animation: "slideIn 0.5s ease-out",
  },
  winnerTitle: {
    fontSize: "3rem",
    color: "#4caf50",
    marginBottom: "20px",
    textShadow: "0 0 20px rgba(76, 175, 80, 0.8)",
  },
  winnerName: {
    fontSize: "2.5rem",
    color: "#4cc9f0",
    marginBottom: "30px",
    fontWeight: "bold",
  },
  finalScore: {
    fontSize: "1.5rem",
    color: "#e6e6e6",
    marginBottom: "20px",
  },
  countdown: {
    fontSize: "1rem",
    color: "#9d4edd",
    marginTop: "20px",
  },
};

export default function PongSpectatorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameData = useGameData();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [spectatorData, setSpectatorData] = useState<SpectatorGameData | null>(null);
  const [gameState, setGameState] = useState<any>(null);
  const [winner, setWinner] = useState<{ winnerId: string; winnerNickname: string; finalScore: { player1: number; player2: number } } | null>(null);

  useEffect(() => {
    
    const roomId = searchParams?.get("roomId");
    const tournamentId = searchParams?.get("tournamentId");
    const matchId = searchParams?.get("matchId");

    if (roomId && tournamentId && matchId) {
      setSpectatorData({
        roomId,
        tournamentId,
        matchId,
        player1: { id: "", nickname: "Joueur 1" },
        player2: { id: "", nickname: "Joueur 2" },
      });
    }
  }, [searchParams]);

  useEffect(() => {
    if (!gameData.client) return;

    const handleSpectatorMode = (data: any) => {
      console.log("️ Spectator mode data:", data);
      
      setGameState(null);
      setWinner(null);
      
      setSpectatorData({
        roomId: data.roomId,
        tournamentId: data.tournamentId,
        matchId: data.matchId,
        player1: data.player1 || { id: "", nickname: "Joueur 1" },
        player2: data.player2 || { id: "", nickname: "Joueur 2" },
      });
      
      console.log("️ Players set:", {
        player1: data.player1?.nickname,
        player2: data.player2?.nickname,
      });
    };

    const handlePongUpdate = (data: any) => {
      console.log("️ Pong update received (spectator):", data.roomId);
      setGameState(data);
      
      if (spectatorData && data.player1 && data.player2) {
        setSpectatorData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            player1: {
              ...prev.player1,
              score: data.player1.score,
              y: data.player1.y,
              color: data.player1.color,
            },
            player2: {
              ...prev.player2,
              score: data.player2.score,
              y: data.player2.y,
              color: data.player2.color,
            },
            ball: data.ball,
          };
        });
      }
    };

    const handleGameEnded = (data: any) => {
      console.log(" Match ended (spectator view):", data);
      setWinner({
        winnerId: data.winnerId,
        winnerNickname: data.winnerNickname,
        finalScore: data.finalScore,
      });
      
      setTimeout(() => {
        if (spectatorData?.tournamentId) {
          console.log(" Redirecting to tournament lobby for role update...");
          router.push(`/pong/1vs1-online/tournament?tournamentId=${spectatorData.tournamentId}`);
        }
      }, 3000);
    };

    const handleTournamentMatchEnded = (data: any) => {
      console.log(" Tournament match ended (spectator view):", data);
    };

    const handleTournamentEnded = (data: any) => {
      console.log(" Tournament ended:", data);
      setTimeout(() => {
        console.log(" Redirecting to home page...");
        router.push('/pong');
      }, 5000);
    };

    const handleTournamentCancelled = (data: { tournamentId: string; reason: string }) => {
      console.log(" Tournament cancelled:", data);
      alert(`Tournoi annulé: ${data.reason}`);
      router.push('/pong');
    };

    gameData.client.on("spectator-mode", handleSpectatorMode);
    gameData.client.on("pong-update", handlePongUpdate);
    gameData.client.on("game-ended", handleGameEnded);
    gameData.client.on("tournament-match-ended", handleTournamentMatchEnded);
    gameData.client.on("tournament-ended", handleTournamentEnded);
    gameData.client.on("tournament-cancelled", handleTournamentCancelled);

    return () => {
      gameData.client?.off("spectator-mode", handleSpectatorMode);
      gameData.client?.off("pong-update", handlePongUpdate);
      gameData.client?.off("game-ended", handleGameEnded);
      gameData.client?.off("tournament-match-ended", handleTournamentMatchEnded);
      gameData.client?.off("tournament-ended", handleTournamentEnded);
      gameData.client?.off("tournament-cancelled", handleTournamentCancelled);
    };
  }, [gameData.client, router, spectatorData]);

  useEffect(() => {
    if (!canvasRef.current || !gameState) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

    const draw = () => {
      ctx.fillStyle = "#16213e";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.stroke();
      ctx.setLineDash([]);

      if (gameState.player1) {
        ctx.fillStyle = gameState.player1.color || "#4cc9f0";
        ctx.fillRect(10, gameState.player1.y, 10, 100);
      }

      if (gameState.player2) {
        ctx.fillStyle = gameState.player2.color || "#f72585";
        ctx.fillRect(canvas.width - 20, gameState.player2.y, 10, 100);
      }

      if (gameState.ball) {
        ctx.fillStyle = "#f72585";
        ctx.beginPath();
        ctx.arc(gameState.ball.x, gameState.ball.y, gameState.ball.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [gameState, spectatorData]);

  const handleBackToTournament = () => {
    if (spectatorData?.tournamentId) {
      router.push(`/pong/1vs1-online/tournament`);
    } else {
      router.push("/pong");
    }
  };

  if (!spectatorData) {
    return (
      <div style={styles.container as React.CSSProperties}>
        <div style={styles.header as React.CSSProperties}>
          <h1 style={styles.title as React.CSSProperties}>
            Chargement...
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container as React.CSSProperties}>
      {winner && (
        <div style={styles.winnerOverlay as React.CSSProperties}>
          <div style={styles.winnerCard as React.CSSProperties}>
            <div style={styles.winnerTitle as React.CSSProperties}>
               Victoire !
            </div>
            <div style={styles.winnerName as React.CSSProperties}>
              {winner.winnerNickname}
            </div>
            <div style={styles.finalScore as React.CSSProperties}>
              Score final : {winner.finalScore.player1} - {winner.finalScore.player2}
            </div>
            <div style={styles.countdown as React.CSSProperties}>
              En attente du prochain match...
            </div>
          </div>
        </div>
      )}
      
      <div style={styles.header as React.CSSProperties}>
        <h1 style={styles.title as React.CSSProperties}>
          ️ Mode Spectateur
        </h1>
        <div style={styles.badge as React.CSSProperties}>
          Vous regardez le match
        </div>
      </div>

      {gameState && (
        <div style={styles.scoreBoard as React.CSSProperties}>
          <div style={styles.playerScore as React.CSSProperties}>
            <span style={{ color: gameState.player1?.color || "#4cc9f0" }}>
              {spectatorData.player1.nickname}: {spectatorData.player1.score ?? 0}
            </span>
          </div>
          <div style={styles.playerScore as React.CSSProperties}>
            <span style={{ color: gameState.player2?.color || "#f72585" }}>
              {spectatorData.player2.nickname}: {spectatorData.player2.score ?? 0}
            </span>
          </div>
        </div>
      )}

      <div style={styles.gameContainer as React.CSSProperties}>
        <canvas
          ref={canvasRef}
          width={1200}
          height={800}
          style={styles.canvas as React.CSSProperties}
        />
        {!gameState && (
          <div style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: "#4cc9f0",
            fontSize: "1.5rem",
            textAlign: "center",
          }}>
            En attente du démarrage du match...
          </div>
        )}
      </div>

      <button
        style={styles.backButton as React.CSSProperties}
        onClick={handleBackToTournament}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.05)";
          e.currentTarget.style.boxShadow = "0 0 20px rgba(247, 37, 133, 0.6)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        Retour au tournoi
      </button>

      <p style={{ marginTop: "20px", color: "#9d4edd" }}>
        Match en cours...
      </p>
    </div>
  );
}
