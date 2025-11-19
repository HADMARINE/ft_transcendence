"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { login } from "@/api/auth";
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
    marginBottom: "30px",
    color: "#4cc9f0",
    textShadow: "0 0 10px rgba(76, 201, 240, 0.7)",
    zIndex: 2,
  },
  loginBox: {
    backgroundColor: "rgba(22, 33, 62, 0.8)",
    padding: "40px",
    borderRadius: "10px",
    boxShadow: "0 0 20px rgba(76, 201, 240, 0.5)",
    width: "350px",
    zIndex: 2,
    border: "2px solid #4cc9f0",
  },
  inputGroup: {
    marginBottom: "20px",
  },
  label: {
    display: "block",
    marginBottom: "8px",
    fontSize: "1rem",
    color: "#4cc9f0",
  },
  input: {
    width: "100%",
    padding: "12px",
    borderRadius: "5px",
    border: "1px solid #4cc9f0",
    backgroundColor: "rgba(26, 26, 46, 0.7)",
    color: "#e6e6e6",
    fontSize: "1rem",
    outline: "none",
    transition: "all 0.3s",
    "&:focus": {
      borderColor: "#f72585",
      boxShadow: "0 0 10px rgba(247, 37, 133, 0.5)",
    },
  },
  loginButton: {
    width: "100%",
    padding: "15px",
    fontSize: "1.2rem",
    backgroundColor: "#4cc9f0",
    color: "#16213e",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontWeight: "bold",
    transition: "all 0.3s",
    boxShadow: "0 0 15px rgba(76, 201, 240, 0.5)",
    "&:hover": {
      backgroundColor: "#3ab0d0",
      transform: "scale(1.02)",
    },
  },
  signupText: {
    marginTop: "20px",
    textAlign: "center",
    color: "#a9a9a9",
  },
  signupLink: {
    color: "#f72585",
    cursor: "pointer",
    textDecoration: "none",
    fontWeight: "bold",
    marginLeft: "5px",
    transition: "all 0.3s",
    "&:hover": {
      textShadow: "0 0 10px rgba(247, 37, 133, 0.7)",
    },
  },
  animatedBall: {
    position: "absolute",
    borderRadius: "50%",
    boxShadow: "0 0 15px rgba(247, 37, 133, 0.7)",
    zIndex: 1,
  },
  errorMessage: {
    color: "#f72585",
    marginBottom: "15px",
    textAlign: "center",
    fontWeight: "bold",
    textShadow: "0 0 5px rgba(247, 37, 133, 0.5)",
  },
};

const LoginPage = (props: { redirect?: string }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const router = useRouter();
  const isAuth = useIsAuth();

  const { balls, keyframes } = useMemo(() => {
    const ballsData = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 40 + 20,
      moveX: Math.random() * 100,
      moveY: Math.random() * 100,
      duration: 10 + Math.random() * 20,
    }));

    let keyframesContent = "";
    ballsData.forEach((ball) => {
      keyframesContent += `
        @keyframes move${ball.id} {
          100% { transform: translate(${ball.moveX}px, ${ball.moveY}px); }
        }
      `;
    });

    return {
      balls: ballsData,
      keyframes: keyframesContent,
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setError("Veuillez remplir tous les champs");
      return;
    }

    const result = await login({ email, password });

    if (result.result === false) {
      setError(result.data);
      return;
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem("token", result.data);
    }

    console.log("Connexion réussie avec:", { email, password });
    setError("");
    router.replace(props.redirect || "/home");
  };

  useEffect(() => {
    setError("");
  }, [email, password]);

  if (isAuth === true) {
    router.replace("/home");
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Connexion</h1>

      <form onSubmit={handleLogin} style={styles.loginBox}>
        {error && <div style={styles.errorMessage}>{error}</div>}

        <div style={styles.inputGroup}>
          <label style={styles.label}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            placeholder="votre@email.com"
          />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Mot de passe</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            placeholder="••••••••"
          />
        </div>

        <button type="submit" style={styles.loginButton}>
          Se connecter
        </button>

        <div style={styles.signupText}>
          Pas encore de compte?
          <Link href="/signup" style={styles.signupLink}>
            S'inscrire
          </Link>
        </div>
      </form>

      {balls.map((ball) => (
        <div
          key={ball.id}
          style={{
            ...styles.animatedBall,
            left: `${ball.x}%`,
            top: `${ball.y}%`,
            width: ball.size,
            height: ball.size,
            backgroundColor: `rgba(247, 37, 133, ${0.2 * 0.3})`,
            animation: `move${ball.id} ${ball.duration}s infinite alternate`,
          }}
        />
      ))}

      <style jsx>{`
        @keyframes move0 {
          100% {
            transform: translate(40px, 20px);
          }
        }
        @keyframes move1 {
          100% {
            transform: translate(50px, 50px);
          }
        }
        @keyframes move2 {
          100% {
            transform: translate(60px, 30px);
          }
        }
        @keyframes move3 {
          100% {
            transform: translate(70px, 40px);
          }
        }
        @keyframes move4 {
          100% {
            transform: translate(80px, 50px);
          }
        }
        @keyframes move5 {
          100% {
            transform: translate(90px, 60px);
          }
        }
        @keyframes move6 {
          100() {
            transform: translate(100px, 70px);
          }
        }
        @keyframes move7 {
          100% {
            transform: translate(40px, 20px);
          }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;