"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useIsAuth } from "@/util/useIsAuth";

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
    marginBottom: "50px",
    color: "#4cc9f0",
    textShadow: "0 0 10px rgba(76, 201, 240, 0.7)",
    zIndex: 2,
  },
  gamesContainer: {
    display: "flex",
    justifyContent: "center",
    gap: "40px",
    width: "100%",
    maxWidth: "900px",
    zIndex: 2,
    flexWrap: "wrap",
  },
  gameCard: {
    position: "relative",
    width: "400px",
    height: "250px",
    borderRadius: "15px",
    overflow: "hidden",
    border: "3px solid #4cc9f0",
    boxShadow: "0 0 20px rgba(76, 201, 240, 0.5)",
    cursor: "pointer",
    transition: "all 0.3s ease",
  },
  gameOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(22, 33, 62, 0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    padding: "20px",
    textAlign: "center",
  },
  gameTitle: {
    fontSize: "2rem",
    fontWeight: "bold",
    marginBottom: "10px",
    color: "#fff",
    textShadow: "0 0 10px rgba(76, 201, 240, 0.9)",
  },
  gameDescription: {
    fontSize: "1rem",
    color: "#e6e6e6",
    maxWidth: "90%",
  },
  animatedBall: {
    position: "absolute",
    borderRadius: "50%",
    boxShadow: "0 0 15px rgba(247, 37, 133, 0.7)",
    zIndex: 1,
  },
};

export default function HomePage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const auth = useIsAuth({ redirectToLogin: true, returnToCurrentPage: true });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [balls] = useState(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 50 + 30,
      speedX: (Math.random() - 0.5) * 0.8,
      speedY: (Math.random() - 0.5) * 0.8,
      color: i % 2 === 0 ? "#4cc9f0" : "#f72585",
    }));
  });

  if (!isMounted) {
    return (
      <div style={styles.container}>
        <div style={{ color: '#4cc9f0' }}>Chargement...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {}
      <button
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          zIndex: 10,
          background: "transparent",
          border: "none",
          color: "#4cc9f0",
          fontSize: "2rem",
          cursor: "pointer",
          transition: "transform 0.3s ease, color 0.3s ease",
        }}
        onClick={() => router.push("/settings")}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.1)";
          e.currentTarget.style.color = "#f72585";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.color = "#4cc9f0";
        }}
      >
        ️
      </button>
      <h1 style={styles.title}>Sélectionnez un jeu</h1>

      <div style={styles.gamesContainer}>
        {}
        <div style={styles.gameCard} onClick={() => router.push("/pong")}>
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              backgroundImage:
                "linear-gradient(135deg, #16213e 0%, #1a1a2e 100%)",
            }}
          >
            <div style={styles.gameOverlay}>
              <h2 style={styles.gameTitle}>Pong</h2>
              <p style={styles.gameDescription}>
                Le classique jeu de raquettes en duel.
              </p>
            </div>
          </div>
        </div>

        {}
        <div style={styles.gameCard} onClick={() => router.push("/shoot")}>
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              backgroundImage:
                "linear-gradient(135deg, #1a1a2e 0%, #0d0d1a 100%)",
            }}
          >
            <div style={styles.gameOverlay}>
              <h2 style={styles.gameTitle}>Shoot</h2>
              <p style={styles.gameDescription}>
                Jeu de tir rapide et intense.
              </p>
            </div>
          </div>
        </div>
      </div>

      {}
      {balls.map((ball) => (
        <div
          key={ball.id}
          style={{
            ...styles.animatedBall,
            left: `${ball.x}%`,
            top: `${ball.y}%`,
            width: ball.size,
            height: ball.size,
            backgroundColor: `rgba(${
              ball.color === "#4cc9f0" ? "76, 201, 240" : "247, 37, 133"
            }, ${0.2 + Math.random() * 0.3})`,
            animation: `move${ball.id} ${
              15 + Math.random() * 20
            }s infinite alternate ease-in-out`,
          }}
        />
      ))}

      <style jsx global>{`
        @keyframes move0 {
          0% { transform: translate(0, 0); }
          100% { transform: translate(${Math.random() * 200 - 100}px, ${Math.random() * 200 - 100}px); }
        }
        @keyframes move1 {
          0% { transform: translate(0, 0); }
          100% { transform: translate(${Math.random() * 200 - 100}px, ${Math.random() * 200 - 100}px); }
        }
        @keyframes move2 {
          0% { transform: translate(0, 0); }
          100% { transform: translate(${Math.random() * 200 - 100}px, ${Math.random() * 200 - 100}px); }
        }
        @keyframes move3 {
          0% { transform: translate(0, 0); }
          100% { transform: translate(${Math.random() * 200 - 100}px, ${Math.random() * 200 - 100}px); }
        }
        @keyframes move4 {
          0% { transform: translate(0, 0); }
          100% { transform: translate(${Math.random() * 200 - 100}px, ${Math.random() * 200 - 100}px); }
        }
        @keyframes move5 {
          0% { transform: translate(0, 0); }
          100% { transform: translate(${Math.random() * 200 - 100}px, ${Math.random() * 200 - 100}px); }
        }
        @keyframes move6 {
          0% { transform: translate(0, 0); }
          100% { transform: translate(${Math.random() * 200 - 100}px, ${Math.random() * 200 - 100}px); }
        }
        @keyframes move7 {
          0% { transform: translate(0, 0); }
          100% { transform: translate(${Math.random() * 200 - 100}px, ${Math.random() * 200 - 100}px); }
        }
        @keyframes move8 {
          0% { transform: translate(0, 0); }
          100% { transform: translate(${Math.random() * 200 - 100}px, ${Math.random() * 200 - 100}px); }
        }
        @keyframes move9 {
          0% { transform: translate(0, 0); }
          100% { transform: translate(${Math.random() * 200 - 100}px, ${Math.random() * 200 - 100}px); }
        }
        @keyframes move10 {
          0% { transform: translate(0, 0); }
          100% { transform: translate(${Math.random() * 200 - 100}px, ${Math.random() * 200 - 100}px); }
        }
        @keyframes move11 {
          0% { transform: translate(0, 0); }
          100% { transform: translate(${Math.random() * 200 - 100}px, ${Math.random() * 200 - 100}px); }
        }
      `}</style>
    </div>
  );
}