"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IngameStatus, useGameData } from "@/util/useGameData";

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
  title: {
    fontSize: "2.5rem",
    marginBottom: "20px",
    color: "#4cc9f0",
    textShadow: "0 0 10px rgba(76, 201, 240, 0.7)",
  },
  subtitle: {
    fontSize: "1.2rem",
    marginBottom: "40px",
    color: "#f72585",
  },
  lobbyContainer: {
    backgroundColor: "rgba(22, 33, 62, 0.8)",
    border: "2px solid #4cc9f0",
    borderRadius: "15px",
    padding: "40px",
    minWidth: "500px",
    maxWidth: "600px",
    textAlign: "center",
    boxShadow: "0 0 30px rgba(76, 201, 240, 0.5)",
  },
  playersSection: {
    marginBottom: "30px",
  },
  playersTitle: {
    fontSize: "1.5rem",
    marginBottom: "20px",
    color: "#4cc9f0",
  },
  playerList: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
    marginBottom: "30px",
  },
  playerItem: {
    backgroundColor: "rgba(76, 201, 240, 0.1)",
    border: "1px solid #4cc9f0",
    borderRadius: "8px",
    padding: "15px",
    textAlign: "left",
  },
  playerName: {
    fontSize: "1.1rem",
    color: "#fff",
    marginBottom: "5px",
    fontWeight: "bold",
  },
  playerEmail: {
    fontSize: "0.9rem",
    color: "#a0a0a0",
  },
  playerCount: {
    fontSize: "1.3rem",
    color: "#f72585",
    marginBottom: "30px",
  },
  timerSection: {
    marginBottom: "30px",
  },
  timerText: {
    fontSize: "1rem",
    color: "#e6e6e6",
    marginBottom: "10px",
  },
  timerValue: {
    fontSize: "2.5rem",
    color: "#f72585",
    fontWeight: "bold",
    textShadow: "0 0 10px rgba(247, 37, 133, 0.7)",
  },
  cancelButton: {
    backgroundColor: "#f72585",
    color: "white",
    border: "none",
    padding: "12px 30px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "1rem",
    fontWeight: "bold",
    transition: "all 0.3s ease",
  },
  spinnerContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "10px",
    marginTop: "20px",
  },
  spinner: {
    width: "20px",
    height: "20px",
    border: "3px solid rgba(76, 201, 240, 0.3)",
    borderTop: "3px solid #4cc9f0",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
};

export default function LobbyPage() {
  const router = useRouter();
  const gameData = useGameData();
  const [timer, setTimer] = useState(30);
  const [players, setPlayers] = useState<any[]>([]);

  useEffect(() => {
    // Listen for lobby updates
    if (gameData.client) {
      gameData.client.on("lobby-update", (lobbyData: any) => {
        setPlayers(lobbyData.players || []);
      });
    }

    // If game starts, redirect
    if (gameData.status === IngameStatus.WAITING_FOR_PLAYERS) {
      router.replace("/shoot/1vs1-online/game");
    }
  }, [gameData.client, gameData.status]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleCancel = () => {
    gameData.unregisterQueue();
    router.push("/shoot");
  };

  return (
    <div style={styles.container as React.CSSProperties}>
      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse-icon {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.7; }
        }
        .shoot-lobby-spinner {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          border: 5px solid rgba(76, 201, 240, 0.2);
          border-top: 5px solid #4cc9f0;
          border-right: 5px solid #f72585;
          animation: spin 1s linear infinite;
          position: relative;
          margin: 0 auto 15px auto;
          box-shadow: 0 0 25px rgba(76, 201, 240, 0.4);
        }
        .shoot-lobby-spinner::before {
          content: '';
          position: absolute;
          top: 8px;
          left: 8px;
          right: 8px;
          bottom: 8px;
          border-radius: 50%;
          border: 3px solid transparent;
          border-top: 3px solid #f72585;
          border-left: 3px solid #4cc9f0;
          animation: spin 0.7s linear infinite reverse;
        }
        .shoot-lobby-spinner::after {
          content: '🔍';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 18px;
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

      <h1 style={styles.title as React.CSSProperties}>
        Recherche d'adversaire
      </h1>
      <p style={styles.subtitle as React.CSSProperties}>
        Shoot - 1 vs 1 En Ligne
      </p>

      <div style={styles.lobbyContainer as React.CSSProperties}>
        <div style={styles.playersSection as React.CSSProperties}>
          <h2 style={styles.playersTitle as React.CSSProperties}>
            Joueurs en attente
          </h2>

          <div style={styles.playerCount as React.CSSProperties}>
            {players.length} / 2 joueurs
          </div>

          <div style={styles.playerList as React.CSSProperties}>
            {players.map((player) => (
              <div key={player.id} style={styles.playerItem as React.CSSProperties}>
                <div style={styles.playerName as React.CSSProperties}>
                  {player.nickname || "Joueur"}
                </div>
                <div style={styles.playerEmail as React.CSSProperties}>
                  {player.email}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.timerSection as React.CSSProperties}>
          <div style={styles.timerText as React.CSSProperties}>
            Attente du prochain joueur dans:
          </div>
          <div style={styles.timerValue as React.CSSProperties}>
            {timer}s
          </div>
          <div style={styles.spinnerContainer as React.CSSProperties}>
            <div className="shoot-lobby-spinner"></div>
          </div>
          <span style={{ color: '#4cc9f0', marginTop: '10px', display: 'block' }}>
            En recherche<span className="searching-dots"></span>
          </span>
        </div>

        <button
          style={styles.cancelButton as React.CSSProperties}
          onClick={handleCancel}
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
