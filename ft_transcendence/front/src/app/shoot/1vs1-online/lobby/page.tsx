"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GametypeEnum, IngameStatus, useGameData } from "@/util/useGameData";

interface PlayerInfo {
  id: string;
  nickname: string;
  email?: string;
}

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
  },
  title: {
    fontSize: "2.5rem",
    marginBottom: "10px",
    color: "#00ccff",
    textShadow: "0 0 10px rgba(0, 204, 255, 0.7)",
  },
  subtitle: {
    fontSize: "1.2rem",
    marginBottom: "30px",
    color: "#ff6600",
  },
  lobbyContainer: {
    backgroundColor: "rgba(22, 33, 62, 0.8)",
    border: "2px solid #00ccff",
    borderRadius: "15px",
    padding: "40px",
    minWidth: "900px",
    maxWidth: "1200px",
    textAlign: "center" as const,
    boxShadow: "0 0 30px rgba(0, 204, 255, 0.5)",
  },
  timerSection: {
    marginBottom: "30px",
    padding: "20px",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: "10px",
  },
  timerLabel: {
    fontSize: "1.2rem",
    color: "#e6e6e6",
    marginBottom: "10px",
  },
  timerValue: {
    fontSize: "4rem",
    fontWeight: "bold",
    color: "#00ccff",
    textShadow: "0 0 20px rgba(0, 204, 255, 0.7)",
  },
  timerLow: {
    color: "#ff6600",
    animation: "blink 0.5s ease-in-out infinite",
  },
  progressBar: {
    width: "100%",
    height: "10px",
    backgroundColor: "rgba(0, 204, 255, 0.2)",
    borderRadius: "5px",
    marginTop: "15px",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#00ccff",
    borderRadius: "5px",
    transition: "width 1s linear",
  },
  playersSection: {
    marginBottom: "30px",
  },
  playersTitle: {
    fontSize: "1.5rem",
    color: "#00ccff",
    marginBottom: "20px",
  },
  playersGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "15px",
    justifyContent: "center",
  },
  playerCard: {
    backgroundColor: "rgba(0, 204, 255, 0.1)",
    border: "2px solid #00ccff",
    borderRadius: "12px",
    padding: "20px",
    textAlign: "center" as const,
    transition: "all 0.3s ease",
  },
  playerCardEmpty: {
    backgroundColor: "rgba(100, 100, 100, 0.1)",
    border: "2px dashed #666",
  },
  avatar: {
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    backgroundColor: "#16213e",
    margin: "0 auto 10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.5rem",
    border: "2px solid #00ccff",
    color: "#00ccff",
  },
  avatarEmpty: {
    border: "2px dashed #666",
    color: "#666",
  },
  playerName: {
    fontSize: "1rem",
    fontWeight: "bold",
    color: "#fff",
    marginBottom: "5px",
  },
  playerEmail: {
    fontSize: "0.8rem",
    color: "#888",
  },
  formatSection: {
    marginBottom: "30px",
    padding: "15px",
    backgroundColor: "rgba(255, 102, 0, 0.1)",
    borderRadius: "10px",
    border: "1px solid #ff6600",
  },
  formatTitle: {
    fontSize: "1.3rem",
    color: "#ff6600",
    marginBottom: "10px",
  },
  formatDescription: {
    fontSize: "1rem",
    color: "#e6e6e6",
  },
  waitingText: {
    fontSize: "1.2rem",
    color: "#00ccff",
    marginTop: "20px",
    animation: "pulse 1.5s ease-in-out infinite",
  },
  cancelButton: {
    backgroundColor: "transparent",
    color: "#ff6600",
    border: "2px solid #ff6600",
    padding: "12px 30px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "1rem",
    fontWeight: "bold",
    transition: "all 0.3s ease",
    marginTop: "20px",
  },
  infoBox: {
    marginTop: "20px",
    padding: "15px",
    backgroundColor: "rgba(0, 204, 255, 0.1)",
    borderRadius: "8px",
    fontSize: "0.9rem",
    color: "#aaa",
  },
};

export default function LobbyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameData = useGameData();
  
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [roomId, setRoomId] = useState<string | null>(searchParams.get("roomId"));
  const maxPlayers = 8;

  useEffect(() => {
    const lobbyDataStr = sessionStorage.getItem('lobbyData');
    if (lobbyDataStr) {
      try {
        const lobbyData = JSON.parse(lobbyDataStr);
        console.log("Loading lobby data from sessionStorage:", lobbyData);
        if (lobbyData.players) {
          setPlayers(lobbyData.players);
        }
        if (lobbyData.roomId) {
          setRoomId(lobbyData.roomId);
        }
        if (lobbyData.timeRemaining) {
          setTimeRemaining(lobbyData.timeRemaining);
        }
        sessionStorage.removeItem('lobbyData');
      } catch (e) {
        console.error("Error parsing lobby data:", e);
      }
    }
  }, []);

  useEffect(() => {
    if (!gameData.client) return;

    const onLobbyCreated = (data: { roomId: string; players: PlayerInfo[]; timeRemaining: number }) => {
      console.log("Lobby created:", data);
      setRoomId(data.roomId);
      setPlayers(data.players);
      setTimeRemaining(data.timeRemaining);
    };

    const onLobbyUpdated = (data: { roomId: string; players: PlayerInfo[]; timeRemaining: number }) => {
      console.log("Lobby updated:", data);
      setPlayers(data.players);
      setTimeRemaining(data.timeRemaining);
    };

    const onLobbyCountdown = (data: { timeRemaining: number; playerCount: number }) => {
      setTimeRemaining(data.timeRemaining);
    };

    const onTournamentStarting = (data: { format: string; players: PlayerInfo[]; brackets: string[][]; tournamentId: string }) => {
      console.log("Tournament starting:", data);
      
      const tournamentData = {
        id: data.tournamentId,
        gametype: 'SHOOT',
        players: data.players,
        matches: [],
        currentMatch: null,
        spectators: [],
        status: 'waiting',
        winner: null,
      };
      sessionStorage.setItem('tournamentData', JSON.stringify(tournamentData));
      
      setTimeout(() => {
        router.push(`/shoot/1vs1-online/tournament?tournamentId=${data.tournamentId}`);
      }, 1000);
    };

    const onTournamentBracket = (data: { tournamentId: string }) => {
      console.log("Tournament bracket received:", data);
      sessionStorage.setItem('tournamentData', JSON.stringify(data));
      router.push(`/shoot/1vs1-online/tournament?tournamentId=${data.tournamentId}`);
    };

    const onLobbyCancelled = (data: { reason: string }) => {
      console.log("Lobby cancelled:", data);
      alert("Lobby annulé: pas assez de joueurs");
      router.push("/shoot");
    };

    const onMatchConfig = (data: { roomId: string; gametype: string; player1: PlayerInfo; player2: PlayerInfo }) => {
      console.log("🎮 Match config received in lobby:", data);
      // Pour un duel 1v1, rediriger vers la page de configuration
      router.push(`/shoot/1vs1online/Config?roomId=${data.roomId}&player1=${encodeURIComponent(data.player1.nickname)}&player2=${encodeURIComponent(data.player2.nickname)}`);
    };

    gameData.client.on("lobby-created", onLobbyCreated);
    gameData.client.on("lobby-updated", onLobbyUpdated);
    gameData.client.on("lobby-countdown", onLobbyCountdown);
    gameData.client.on("tournament-starting", onTournamentStarting);
    gameData.client.on("tournament-bracket", onTournamentBracket);
    gameData.client.on("lobby-cancelled", onLobbyCancelled);
    gameData.client.on("match-config", onMatchConfig);

    return () => {
      gameData.client?.off("lobby-created", onLobbyCreated);
      gameData.client?.off("lobby-updated", onLobbyUpdated);
      gameData.client?.off("lobby-countdown", onLobbyCountdown);
      gameData.client?.off("tournament-starting", onTournamentStarting);
      gameData.client?.off("tournament-bracket", onTournamentBracket);
      gameData.client?.off("lobby-cancelled", onLobbyCancelled);
      gameData.client?.off("match-config", onMatchConfig);
    };
  }, [gameData.client, roomId, router]);

  useEffect(() => {
    if (gameData.status === IngameStatus.WAITING_FOR_PLAYERS || gameData.status === IngameStatus.IN_PROGRESS) {
      router.replace(`/shoot/1vs1-online/game${roomId ? `?roomId=${roomId}` : ""}`);
    }
  }, [gameData.status, router, roomId]);

  const handleCancel = () => {
    if (gameData.client) {
      gameData.client.emit("leave-lobby", { gametype: GametypeEnum.SHOOT });
    }
    gameData.unregisterQueue();
    router.push("/shoot");
  };

  const getInitials = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : "?";
  };

  const getFormatDescription = (playerCount: number): { format: string; description: string } => {
    if (playerCount >= 8) {
      return { format: "Tournoi 8 joueurs", description: "Quarts de finale → Demi-finales → Finale" };
    } else if (playerCount >= 4) {
      return { format: "Tournoi 4 joueurs", description: "Demi-finales → Finale" };
    } else {
      return { format: "Duel 1v1", description: "Match simple" };
    }
  };

  const formatInfo = getFormatDescription(players.length);

  return (
    <div style={styles.container}>
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.02); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse-icon {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.7; }
        }
        .lobby-spinner {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          border: 4px solid rgba(0, 204, 255, 0.2);
          border-top: 4px solid #00ccff;
          border-right: 4px solid #ff6600;
          animation: spin 1s linear infinite;
          position: relative;
          margin: 0 auto 15px auto;
          box-shadow: 0 0 20px rgba(0, 204, 255, 0.3);
        }
        .lobby-spinner::before {
          content: '';
          position: absolute;
          top: 8px;
          left: 8px;
          right: 8px;
          bottom: 8px;
          border-radius: 50%;
          border: 3px solid transparent;
          border-top: 3px solid #ff6600;
          border-left: 3px solid #00ccff;
          animation: spin 0.7s linear infinite reverse;
        }
        .waiting-dots::after {
          content: '';
          animation: dots 1.5s infinite;
        }
        @keyframes dots {
          0%, 20% { content: '.'; }
          40% { content: '..'; }
          60%, 100% { content: '...'; }
        }
      `}</style>

      <h1 style={styles.title}>Lobby d'attente</h1>
      <p style={styles.subtitle}>Shoot - Mode En Ligne</p>

      <div style={styles.lobbyContainer}>
        <div style={styles.timerSection}>
          <div style={styles.timerLabel}>Le tournoi commence dans</div>
          <div style={{
            ...styles.timerValue,
            ...(timeRemaining <= 10 ? styles.timerLow : {}),
          }}>
            {timeRemaining}s
          </div>
          <div style={styles.progressBar}>
            <div style={{
              ...styles.progressFill,
              width: `${(timeRemaining / 60) * 100}%`,
            }} />
          </div>
        </div>

        <div style={styles.formatSection}>
          <div style={styles.formatTitle}>{formatInfo.format}</div>
          <div style={styles.formatDescription}>{formatInfo.description}</div>
        </div>

        <div style={styles.playersSection}>
          <div style={styles.playersTitle}>
            Joueurs ({players.length}/{maxPlayers})
          </div>
          <div style={styles.playersGrid}>
            {players.map((player) => (
              <div key={player.id} style={styles.playerCard}>
                <div style={styles.avatar}>
                  {getInitials(player.nickname)}
                </div>
                <div style={styles.playerName}>{player.nickname}</div>
                {player.email && (
                  <div style={styles.playerEmail}>{player.email}</div>
                )}
              </div>
            ))}
            {Array.from({ length: Math.max(0, 2 - players.length) }).map((_, i) => (
              <div key={`empty-${i}`} style={{ ...styles.playerCard, ...styles.playerCardEmpty }}>
                <div style={{ ...styles.avatar, ...styles.avatarEmpty }}>?</div>
                <div style={styles.playerName}>En attente...</div>
              </div>
            ))}
          </div>
        </div>

        {players.length < 2 && (
          <div style={styles.waitingText}>
            <div className="lobby-spinner"></div>
            En attente de joueurs<span className="waiting-dots"></span>
          </div>
        )}

        <button
          style={styles.cancelButton}
          onClick={handleCancel}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#ff6600";
            e.currentTarget.style.color = "#fff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "#ff6600";
          }}
        >
          Quitter le lobby
        </button>

        <div style={styles.infoBox}>
          💡 Le tournoi démarrera automatiquement dans {timeRemaining} secondes, ou dès que 8 joueurs sont présents.
        </div>
      </div>
    </div>
  );
}
