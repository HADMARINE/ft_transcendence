"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { register } from "@/api/auth";
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
  signupBox: {
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
  signupButton: {
    width: "100%",
    padding: "15px",
    fontSize: "1.2rem",
    backgroundColor: "#f72585",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontWeight: "bold",
    transition: "all 0.3s",
    boxShadow: "0 0 15px rgba(247, 37, 133, 0.5)",
    "&:hover": {
      backgroundColor: "#e01e75",
      transform: "scale(1.02)",
    },
  },
  loginText: {
    marginTop: "20px",
    textAlign: "center",
    color: "#a9a9a9",
  },
  loginLink: {
    color: "#4cc9f0",
    cursor: "pointer",
    textDecoration: "none",
    fontWeight: "bold",
    marginLeft: "5px",
    transition: "all 0.3s",
    "&:hover": {
      textShadow: "0 0 10px rgba(76, 201, 240, 0.7)",
    },
  },
  animatedBall: {
    position: "absolute",
    borderRadius: "50%",
    boxShadow: "0 0 15px rgba(76, 201, 240, 0.7)",
    zIndex: 1,
    animation: "float 15s infinite alternate",
  },
  errorMessage: {
    color: "#f72585",
    marginBottom: "15px",
    textAlign: "center",
    fontWeight: "bold",
    textShadow: "0 0 5px rgba(247, 37, 133, 0.5)",
  },
  successMessage: {
    color: "#4cc9f0",
    marginBottom: "15px",
    textAlign: "center",
    fontWeight: "bold",
    textShadow: "0 0 5px rgba(76, 201, 240, 0.5)",
  },
};

const SignupPage = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  const isAuth = useIsAuth();

  const { balls, keyframes } = useMemo(() => {
    const ballsData = Array.from({ length: 10 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 40 + 20,
      color: i % 2 === 0 ? "#4cc9f0" : "#f72585",
      moveX: Math.random() * 200 - 100,
      moveY: Math.random() * 200 - 100,
      duration: 15 + Math.random() * 20,
    }));

    let keyframesContent = "";
    ballsData.forEach((ball) => {
      keyframesContent += `
        @keyframes move${ball.id} {
          0% { transform: translate(0, 0); }
          100% { transform: translate(${ball.moveX}px, ${ball.moveY}px); }
        }
      `;
    });

    return {
      balls: ballsData,
      keyframes: keyframesContent,
    };
  }, []);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !email || !password || !confirmPassword) {
      setError("Veuillez remplir tous les champs");
      return;
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    const result = await register({
      email,
      password,
      nickname: username,
    });

    if (result.result === false) {
      setError(result.message);
      return;
    }

    setError("");
    setSuccess("Compte créé avec succès! Redirection...");

    setTimeout(() => {
      router.push("/login");
    }, 2000);
  };

  if (isAuth === true) {
    router.replace("/home");
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Créer un compte</h1>

      <form onSubmit={handleSignup} style={styles.signupBox}>
        {error && <div style={styles.errorMessage}>{error}</div>}
        {success && <div style={styles.successMessage}>{success}</div>}

        <div style={styles.inputGroup}>
          <label style={styles.label}>Nom d'utilisateur</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={styles.input}
            placeholder="Choisissez un pseudo"
          />
        </div>

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

        <div style={styles.inputGroup}>
          <label style={styles.label}>Confirmer le mot de passe</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={styles.input}
            placeholder="••••••••"
          />
        </div>

        <button type="submit" style={styles.signupButton}>
          S'inscrire
        </button>

        <div style={styles.loginText}>
          Déjà un compte?
          <Link href="/login" style={styles.loginLink}>
            Se connecter
          </Link>
        </div>
      </form>

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
            }, ${0.2 + 0.5 * 0.3})`,
            animation: `move${ball.id} ${ball.duration}s infinite alternate ease-in-out`,
          }}
        />
      ))}

      <style jsx global>{`
        @keyframes float {
          0% {
            transform: translate(0, 0);
          }
          100% {
            transform: translate(50px, 50px);
          }
        }
        ${keyframes}
      `}</style>

      <style jsx>{keyframes}</style>

      <style jsx global>{`
        @keyframes float {
          0% { transform: translate(0, 0); }
          100% { transform: translate(40px, 20px); }
        }
        
        @keyframes move0 {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }
        @keyframes move1 {
          0% { transform: translate(0, 0); }
          100% { transform: translate(60px, 30px); }
        }
        @keyframes move2 {
          0% { transform: translate(0, 0); }
          100% { transform: translate(70px, 40px); }
        }
        @keyframes move3 {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }
        @keyframes move4 {
          0% { transform: translate(0, 0); }
          100% { transform: translate(60px, 30px); }
        @keyframes move5 {
          0% { transform: translate(0, 0); }
          100% { transform: translate(70px, 40px); }
        }
        @keyframes move6 {
          0% { transform: translate(0, 0); }
          100% { transform: translate(80px, 50px); }
        @keyframes move7 {
          0% { transform: translate(0, 0); }
          100% { transform: translate(40px, 34px); }
        }
        @keyframes move8 {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }
        @keyframes move9 {
          0% { transform: translate(0, 0); }
          100% { transform: translate(60px, 30px); }
        }
      `}</style>
    </div>
  );
};

export default SignupPage;
