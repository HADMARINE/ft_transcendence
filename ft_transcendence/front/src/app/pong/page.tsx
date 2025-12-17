"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";
import {
  GametypeEnum,
  IngameStatus,
  RegisterQueueStatus,
  useGameData,
} from "@/util/useGameData";

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
    position: "relative",
    overflow: "hidden",
  },
  title: {
    fontSize: "2.5rem",
    marginBottom: "40px",
    color: "#4cc9f0",
    textShadow: "0 0 10px rgba(76, 201, 240, 0.7)",
    zIndex: 2,
    textAlign: "center",
  },
  subtitle: {
    fontSize: "1.2rem",
    marginBottom: "30px",
    color: "#f72585",
    textAlign: "center",
    maxWidth: "800px",
  },
  modesContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "25px",
    width: "100%",
    maxWidth: "1700px",
    zIndex: 2,
  },
  gameMode: {
    position: "relative",
    padding: "25px",
    borderRadius: "15px",
    overflow: "hidden",
    border: "2px solid #4cc9f0",
    backgroundColor: "rgba(22, 33, 62, 0.7)",
    boxShadow: "0 0 15px rgba(76, 201, 240, 0.4)",
    cursor: "pointer",
    transition: "all 0.3s ease",
    minHeight: "180px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    "&:hover": {
      transform: "translateY(-5px)",
      boxShadow: "0 0 25px rgba(247, 37, 133, 0.7)",
      borderColor: "#f72585",
      backgroundColor: "rgba(26, 26, 46, 0.8)",
    },
  },
  modeTitle: {
    fontSize: "1.5rem",
    fontWeight: "bold",
    marginBottom: "10px",
    color: "#fff",
    textShadow: "0 0 8px rgba(76, 201, 240, 0.9)",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  modeIcon: {
    width: "30px",
    height: "30px",
    borderRadius: "50%",
    backgroundColor: "#f72585",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1rem",
  },
  modeDescription: {
    fontSize: "0.95rem",
    color: "#e6e6e6",
    lineHeight: "1.5",
  },
  modeBadge: {
    position: "absolute",
    top: "10px",
    right: "10px",
    padding: "5px 10px",
    borderRadius: "15px",
    fontSize: "0.8rem",
    fontWeight: "bold",
    backgroundColor: "#4cc9f0",
    color: "#16213e",
  },
  animatedBall: {
    position: "absolute",
    borderRadius: "50%",
    boxShadow: "0 0 15px rgba(247, 37, 133, 0.7)",
    zIndex: 1,
  },
  homeButton: {
    position: "absolute",
    top: "20px",
    left: "20px",
    padding: "12px 24px",
    fontSize: "1rem",
    fontWeight: "bold",
    color: "#fff",
    backgroundColor: "#4cc9f0",
    border: "2px solid #4cc9f0",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: "0 0 10px rgba(76, 201, 240, 0.5)",
    zIndex: 1000,
    "&:hover": {
      backgroundColor: "#f72585",
      borderColor: "#f72585",
      boxShadow: "0 0 15px rgba(247, 37, 133, 0.7)",
      transform: "translateY(-2px)",
    },
  },
  popupOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  popupContent: {
    backgroundColor: "#16213e",
    padding: "40px",
    borderRadius: "15px",
    border: "2px solid #f72585",
    boxShadow: "0 0 30px rgba(247, 37, 133, 0.6)",
    maxWidth: "500px",
    width: "90%",
    textAlign: "center",
  },
  popupTitle: {
    fontSize: "1.8rem",
    marginBottom: "20px",
    color: "#4cc9f0",
    textShadow: "0 0 10px rgba(76, 201, 240, 0.7)",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    margin: "30px 0",
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
  loadingSpinner: {
    border: "5px solid rgba(76, 201, 240, 0.3)",
    borderTop: "5px solid #4cc9f0",
    borderRadius: "50%",
    width: "60px",
    height: "60px",
    animation: "spin 1.5s linear infinite",
    marginBottom: "20px",
  },
  loadingText: {
    fontSize: "1.2rem",
    color: "#e6e6e6",
    marginBottom: "10px",
  },
  dotsAnimation: {
    display: "inline-block",
    width: "80px",
    textAlign: "left",
  },
  cancelButton: {
    backgroundColor: "#f72585",
    color: "white",
    border: "none",
    padding: "12px 25px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "1rem",
    fontWeight: "bold",
    transition: "all 0.3s ease",
    marginTop: "20px",
    "&:hover": {
      backgroundColor: "#d0006e",
      boxShadow: "0 0 15px rgba(247, 37, 133, 0.5)",
    },
  },
};

export default function PongModesPage() {
  const router = useRouter();

  const [showQueueModal, setShowQueueModal] = useState(false);
  const [queuePlayerCount, setQueuePlayerCount] = useState(0);
  const [balls] = useState(() => {
    return Array.from({ length: 15 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 50 + 20,
      color: i % 3 === 0 ? "#4cc9f0" : i % 3 === 1 ? "#f72585" : "#9d4edd",
    }));
  });

  const gameData = useGameData();

  useEffect(() => {
    if (gameData.status === IngameStatus.WAITING_FOR_PLAYERS) {
      router.replace("/pong/1vs1-online/lobby");
    }
  }, [gameData.status]);

  // Écouter lobby-created pour rediriger vers le lobby
  useEffect(() => {
    if (!gameData.client) return;

    const handleLobbyCreated = (data: { roomId: string; gametype: string; players: any[]; timeRemaining: number }) => {
      console.log("=== LOBBY CREATED ===", data);
      setShowQueueModal(false);
      // Stocker les données du lobby dans sessionStorage
      sessionStorage.setItem('lobbyData', JSON.stringify(data));
      router.push(`/pong/1vs1-online/lobby?roomId=${data.roomId}`);
    };

    const handleLobbyUpdated = (data: { roomId: string; players: any[]; timeRemaining: number }) => {
      console.log("=== LOBBY UPDATED ===", data);
      // Si on est toujours sur cette page, rediriger vers le lobby
      if (showQueueModal) {
        setShowQueueModal(false);
        sessionStorage.setItem('lobbyData', JSON.stringify(data));
        router.push(`/pong/1vs1-online/lobby?roomId=${data.roomId}`);
      }
    };

    gameData.client.on("lobby-created", handleLobbyCreated);
    gameData.client.on("lobby-updated", handleLobbyUpdated);

    return () => {
      gameData.client?.off("lobby-created", handleLobbyCreated);
      gameData.client?.off("lobby-updated", handleLobbyUpdated);
    };
  }, [gameData.client, router, showQueueModal]);

  // Écouter lobby-update pour le compteur de joueurs dans la queue
  useEffect(() => {
    if (!gameData.client || !showQueueModal) return;

    const handleLobbyUpdate = (lobbyData: any) => {
      setQueuePlayerCount(lobbyData.playerCount || 0);
    };

    gameData.client.on("lobby-update", handleLobbyUpdate);

    return () => {
      gameData.client?.off("lobby-update", handleLobbyUpdate);
    };
  }, [gameData.client, showQueueModal]);


  const gameModes = [
    {
      title: "Pong vs Bot",
      description:
        "Affrontez une intelligence artificielle dans un duel en 1vs1. Choisissez le niveau de difficulté.",
      path: "/pong/vs-bot",
      badge: "Solo",
    },
    {
      title: "1 vs 1 Local",
      description:
        "Duel classique à deux joueurs sur le même appareil. Joueur 1 contre Joueur 2.",
      path: "/pong/1vs1-local",
      badge: "Local",
    },
    {
      title: "2 vs 2 Local",
      description:
        "Match en équipe à quatre joueurs sur le même appareil. Deux contre deux sur le même écran.",
      path: "/pong/2vs2-local",
      badge: "Local",
    },
    {
      title: "1 vs 1 En Ligne",
      description: "Affrontez un adversaire aléatoire ou un ami en ligne.",
      path: "/pong/1vs1-online",
      badge: "En Ligne",
      isOnline: true,
    },
  ];

  const handleModeClick = async (mode: any) => {
    if (mode.isOnline) {
      console.log("🎮 1vs1 Online clicked - starting queue registration");
      console.log("  gameData.client:", gameData.client);
      console.log("  gameData.client?.connected:", gameData.client?.connected);
      
      await gameData.assureConnection();
      console.log("  After assureConnection, client:", gameData.client);
      console.log("  Client connected:", gameData.client?.connected);
      
      gameData.registerQueue(GametypeEnum.PONG);
      console.log("  registerQueue called");
      
      setShowQueueModal(true);
    } else {
      router.push(mode.path);
    }
  };

  return (
    <div style={styles.container as React.CSSProperties}>
      <button
        style={styles.homeButton as React.CSSProperties}
        onClick={() => router.push('/')}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#f72585';
          e.currentTarget.style.borderColor = '#f72585';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#4cc9f0';
          e.currentTarget.style.borderColor = '#4cc9f0';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        🏠 Accueil
      </button>
      
      <h1 style={styles.title as React.CSSProperties}>Modes de Jeu Pong</h1>
      <p style={styles.subtitle as React.CSSProperties}>
        Choisissez votre mode de jeu préféré et plongez dans l'expérience ultime
        de Pong!
      </p>

      <div style={styles.modesContainer as React.CSSProperties}>
        {gameModes.map((mode, index) => (
          <div
            key={index}
            style={styles.gameMode as React.CSSProperties}
            onClick={() => handleModeClick(mode)}
          >
            <div style={styles.modeBadge as React.CSSProperties}>
              {mode.badge}
            </div>
            <h2 style={styles.modeTitle as React.CSSProperties}>
              <span style={styles.modeIcon as React.CSSProperties}>
                {index + 1}
              </span>
              {mode.title}
            </h2>
            <p style={styles.modeDescription as React.CSSProperties}>
              {mode.description}
            </p>
          </div>
        ))}
      </div>

      {/* Balles animées en arrière-plan */}
      {balls.map((ball) => (
        <div
          key={ball.id}
          style={
            {
              ...styles.animatedBall,
              left: `${ball.x}%`,
              top: `${ball.y}%`,
              width: ball.size,
              height: ball.size,
              backgroundColor: `rgba(${
                ball.color === "#4cc9f0"
                  ? "76, 201, 240"
                  : ball.color === "#f72585"
                  ? "247, 37, 133"
                  : "157, 78, 221"
              }, ${0.2 + Math.random() * 0.3})`,
              animation: `move${ball.id} ${
                15 + Math.random() * 20
              }s infinite alternate ease-in-out`,
            } as React.CSSProperties
          }
        />
      ))}

      {/* Queue Modal */}
      {showQueueModal && (
        <div style={styles.popupOverlay as React.CSSProperties}>
          <div style={styles.popupContent as React.CSSProperties}>
            <h2 style={styles.popupTitle as React.CSSProperties}>
              En File d'Attente
            </h2>
            <div style={styles.loadingContainer as React.CSSProperties}>
              {/* Roue qui tourne améliorée */}
              <div className="spinner-container">
                <div className="spinner-wheel"></div>
              </div>
              <p style={styles.loadingText as React.CSSProperties}>
                Joueurs en attente: <strong>{queuePlayerCount}</strong>
              </p>
              <p className="searching-text">
                En recherche d'adversaire<span className="dots"></span>
              </p>
            </div>
            <button
              style={styles.cancelButton as React.CSSProperties}
              onClick={() => {
                setShowQueueModal(false);
                gameData.unregisterQueue();
              }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes float {
          0% {
            transform: translate(0, 0);
          }
          100% {
            transform: translate(
              ${Math.random() * 100 - 50}px,
              ${Math.random() * 100 - 50}px
            );
          }
        }

        ${balls
          .map(
            (ball, i) => `
          @keyframes move${i} {
            0% { transform: translate(0, 0); }
            100% { transform: translate(${Math.random() * 200 - 100}px, ${
              Math.random() * 200 - 100
            }px); }
          }
        `
          )
          .join("")}

        /* Animation de rotation */
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        /* Roue qui tourne améliorée */
        .spinner-container {
          display: flex;
          justify-content: center;
          align-items: center;
          margin: 20px 0 30px 0;
          position: relative;
        }

        .spinner-wheel {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          border: 6px solid rgba(76, 201, 240, 0.2);
          border-top: 6px solid #4cc9f0;
          border-right: 6px solid #f72585;
          animation: spin 1s linear infinite;
          position: relative;
          box-shadow: 0 0 30px rgba(76, 201, 240, 0.4),
                      inset 0 0 20px rgba(247, 37, 133, 0.2);
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
          border-top: 4px solid #f72585;
          border-left: 4px solid #4cc9f0;
          animation: spin 0.8s linear infinite reverse;
        }

        .spinner-wheel::after {
          content: '🎮';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 28px;
          animation: pulse-icon 1.5s ease-in-out infinite;
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

        .searching-text {
          font-size: 1.2rem;
          color: #e6e6e6;
          margin-top: 10px;
          text-align: center;
        }

        /* Animation des points */
        .dots::after {
          content: "";
          animation: dots 1.5s infinite;
        }

        @keyframes dots {
          0%,
          20% {
            content: ".";
          }
          40% {
            content: "..";
          }
          60%,
          100% {
            content: "...";
          }
        }
      `}</style>
    </div>
  );
}
