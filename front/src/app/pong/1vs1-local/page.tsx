"use client";

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useGameStatus } from "@/util/useGameStatus";

const ConfigScreen = dynamic(() => import('../../ConfigScreen'), { ssr: false });

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#1a1a2e',
    color: '#e6e6e6',
    fontFamily: 'Arial, sans-serif',
    padding: '20px',
    position: 'relative',
  },
  title: {
    fontSize: '2.5rem',
    marginBottom: '20px',
    color: '#4cc9f0',
    textShadow: '0 0 10px rgba(76, 201, 240, 0.7)',
  },
  gameContainer: {
    position: 'relative',
    margin: '0 auto',
    border: '3px solid #4cc9f0',
    borderRadius: '5px',
    boxShadow: '0 0 20px rgba(76, 201, 240, 0.5)',
    overflow: 'hidden',
  },
  field: {
    width: '100%',
    height: '100%',
    backgroundColor: '#16213e',
    position: 'relative',
  },
  centerLine: {
    position: 'absolute',
    top: 0,
    left: '50%',
    width: '2px',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    transform: 'translateX(-1px)',
  },
  paddle: {
    position: 'absolute',
    width: '15px',
    borderRadius: '4px',
    boxShadow: '0 0 10px rgba(76, 201, 240, 0.7)',
  },
  ball: {
    position: 'absolute',
    borderRadius: '50%',
    boxShadow: '0 0 10px rgba(247, 37, 133, 0.7)',
  },
  score1: {
    position: 'absolute',
    top: '20px',
    left: '40%',
    fontSize: '4rem',
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.2)',
  },
  score2: {
    position: 'absolute',
    top: '20px',
    right: '40%',
    fontSize: '4rem',
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.2)',
  },
  startScreen: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
    backgroundColor: 'rgba(26, 26, 46, 0.9)',
    padding: '30px',
    borderRadius: '10px',
    zIndex: 10,
  },
  startButton: {
    padding: '15px 40px',
    fontSize: '1.2rem',
    backgroundColor: '#4cc9f0',
    color: '#16213e',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontWeight: 'bold',
    marginBottom: '20px',
    transition: 'all 0.3s',
    boxShadow: '0 0 15px rgba(76, 201, 240, 0.5)',
    '&:hover': {
      backgroundColor: '#3ab0d0',
      transform: 'scale(1.05)',
    }
  },
  restartButton: {
    padding: '10px 30px',
    fontSize: '1rem',
    backgroundColor: '#f72585',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontWeight: 'bold',
    marginTop: '20px',
    transition: 'all 0.3s',
    '&:hover': {
      backgroundColor: '#e01e75',
      transform: 'scale(1.05)',
    }
  },
  instructions: {
    marginTop: '20px',
    lineHeight: '1.6',
  },
  controlsInfo: {
    marginTop: '20px',
    display: 'flex',
    justifyContent: 'space-around',
    width: '800px',
    padding: '10px',
    backgroundColor: 'rgba(22, 33, 62, 0.7)',
    borderRadius: '5px',
  },
  winnerScreen: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
    backgroundColor: 'rgba(26, 26, 46, 0.95)',
    padding: '40px',
    borderRadius: '10px',
    zIndex: 10,
    boxShadow: '0 0 30px rgba(247, 37, 133, 0.7)',
  },
};

const PongGame = () => {
  useGameStatus("pong_1vs1_local");

  const [gameOver, setGameOver] = useState(false);
  const [gameConfig, setGameConfig] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [score, setScore] = useState({ player1: 0, player2: 0 });
  const [player1Y, setPlayer1Y] = useState(0);
  const [player2Y, setPlayer2Y] = useState(0);
  const [ballPosition, setBallPosition] = useState({ x: 0, y: 0 });
  const [ballVelocity, setBallVelocity] = useState({ x: 5, y: 3 });
  const [showConfigAfterGame, setShowConfigAfterGame] = useState(false);
  
  const GAME_WIDTH = 800;
  const GAME_HEIGHT = 500;
  const PADDLE_WIDTH = 15;
  const PADDLE_HEIGHT = 100;
  const BALL_SIZE = 20;
  
  const animationFrameRef = useRef();
  const keysPressed = useRef({
    w: false,
    s: false,
    arrowUp: false,
    arrowDown: false
  });
  
  useEffect(() => {
    if (gameConfig) {
      setPlayer1Y(GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2);
      setPlayer2Y(GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2);
      setBallPosition({ 
        x: GAME_WIDTH / 2 - BALL_SIZE / 2, 
        y: GAME_HEIGHT / 2 - BALL_SIZE / 2 
      });
    }
  }, [gameConfig]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'w' || e.key === 'W') keysPressed.current.w = true;
      if (e.key === 's' || e.key === 'S') keysPressed.current.s = true;
      if (e.key === 'ArrowUp') keysPressed.current.arrowUp = true;
      if (e.key === 'ArrowDown') keysPressed.current.arrowDown = true;
      if (e.key === ' ' && !gameStarted && gameConfig) startGame();
    };
    
    const handleKeyUp = (e) => {
      if (e.key === 'w' || e.key === 'W') keysPressed.current.w = false;
      if (e.key === 's' || e.key === 'S') keysPressed.current.s = false;
      if (e.key === 'ArrowUp') keysPressed.current.arrowUp = false;
      if (e.key === 'ArrowDown') keysPressed.current.arrowDown = false;
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameStarted, gameConfig]);
  
  const startGame = () => {
    setGameOver(false);
    setGameStarted(true);
    setScore({ player1: 0, player2: 0 });
    resetBall();
  };
  
  const resetBall = () => {
    setBallPosition({ 
      x: GAME_WIDTH / 2 - BALL_SIZE / 2, 
      y: GAME_HEIGHT / 2 - BALL_SIZE / 2 
    });
    setBallVelocity({ 
      x: 7,
      y: (Math.random() * 4) - 2 
    });
  };
  
  const backToConfig = () => {
    setGameStarted(false);
    setShowConfigAfterGame(true);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };
  
  useEffect(() => {
    if (score.player1 === 5 || score.player2 === 5) {
      setGameOver(true);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      const timer = setTimeout(() => {
        setGameStarted(false);
        setShowConfigAfterGame(true);
      }, 800);
      
      return () => clearTimeout(timer);
    }
  }, [score]);
  
  useEffect(() => {
    if (!gameStarted || !gameConfig || gameOver) return;
    
    const updateGame = () => {
      if (gameOver) {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        return;
      }
      const leftPaddleSpeed = gameConfig.leftPaddleSpeed;
      const rightPaddleSpeed = gameConfig.rightPaddleSpeed;
      
      if (keysPressed.current.w && player1Y > 0) {
        setPlayer1Y(prev => prev - leftPaddleSpeed);
      }
      if (keysPressed.current.s && player1Y < GAME_HEIGHT - PADDLE_HEIGHT) {
        setPlayer1Y(prev => prev + leftPaddleSpeed);
      }
      if (keysPressed.current.arrowUp && player2Y > 0) {
        setPlayer2Y(prev => prev - rightPaddleSpeed);
      }
      if (keysPressed.current.arrowDown && player2Y < GAME_HEIGHT - PADDLE_HEIGHT) {
        setPlayer2Y(prev => prev + rightPaddleSpeed);
      }
      
      setBallPosition(prev => {
        const newX = prev.x + ballVelocity.x;
        const newY = prev.y + ballVelocity.y;
        
        let newVx = ballVelocity.x;
        let newVy = ballVelocity.y;
        
        if (newY <= 0) {
          newVy = Math.abs(newVy);
        } else if (newY >= GAME_HEIGHT - BALL_SIZE) {
          newVy = -Math.abs(newVy);
        }
        
        if (newX <= PADDLE_WIDTH && 
            newX + BALL_SIZE >= 0 &&
            newY + BALL_SIZE >= player1Y &&
            newY <= player1Y + PADDLE_HEIGHT)
        {
          const hitPosition = (newY + BALL_SIZE/2 - player1Y) / PADDLE_HEIGHT;
          const normalizedHit = Math.max(0.1, Math.min(0.9, hitPosition));
          
          const angle = (normalizedHit - 0.5) * (Math.PI / 2);
          const speed = Math.sqrt(ballVelocity.x * ballVelocity.x + ballVelocity.y * ballVelocity.y) + 1;
          
          newVx = Math.abs(Math.cos(angle)) * speed;
          newVy = Math.sin(angle) * speed;
        }
        
        if (
          newX + BALL_SIZE >= GAME_WIDTH - PADDLE_WIDTH &&
          newX <= GAME_WIDTH &&
          newY + BALL_SIZE >= player2Y &&
          newY <= player2Y + PADDLE_HEIGHT
        ) {
          const hitPosition = (newY + BALL_SIZE/2 - player2Y) / PADDLE_HEIGHT;
          const normalizedHit = Math.max(0.1, Math.min(0.9, hitPosition));
          
          const angle = (normalizedHit - 0.5) * (Math.PI / 2);
          const speed = Math.sqrt(ballVelocity.x * ballVelocity.x + ballVelocity.y * ballVelocity.y) + 1;
          
          newVx = -Math.abs(Math.cos(angle)) * speed;
          newVy = Math.sin(angle) * speed;
        }
        
        if (newVx !== ballVelocity.x || newVy !== ballVelocity.y) {
          setBallVelocity({ x: newVx, y: newVy });
        }
        
        return {
          x: newX,
          y: Math.max(0, Math.min(GAME_HEIGHT - BALL_SIZE, newY))
        };
      });
      
      setBallPosition(prev => {
        if (prev.x < -BALL_SIZE) {
          setScore(prevScore => ({ ...prevScore, player2: prevScore.player2 + 0.5 }));
          resetBall();
          return { 
            x: GAME_WIDTH / 2 - BALL_SIZE / 2, 
            y: GAME_HEIGHT / 2 - BALL_SIZE / 2 
          };
        } else if (prev.x > GAME_WIDTH) {
          setScore(prevScore => ({ ...prevScore, player1: prevScore.player1 + 0.5 }));
          resetBall();
          return { 
            x: GAME_WIDTH / 2 - BALL_SIZE / 2, 
            y: GAME_HEIGHT / 2 - BALL_SIZE / 2 
          };
        }
        return prev;
      });
      if (gameOver) {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        return;
      }
      animationFrameRef.current = requestAnimationFrame(updateGame);
    };
    
    animationFrameRef.current = requestAnimationFrame(updateGame);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameStarted, ballVelocity, player1Y, player2Y, gameConfig]);
  
  if (!gameConfig || showConfigAfterGame) {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>Pong à deux joueurs</h1>
        <ConfigScreen onConfigSubmit={(config) => {
          setGameConfig(config);
          setShowConfigAfterGame(false);
          startGame();
        }} />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Pong</h1>
      
      <div style={{ ...styles.gameContainer, width: GAME_WIDTH, height: GAME_HEIGHT }}>
        <div style={styles.field}>
          <div style={styles.centerLine}></div>
          
          <div 
            style={{ 
              ...styles.paddle, 
              left: 0, 
              top: player1Y,
              height: PADDLE_HEIGHT,
              backgroundColor: gameConfig.leftPaddleColor
            }} 
          />
          
          <div 
            style={{ 
              ...styles.paddle, 
              right: 0, 
              top: player2Y,
              height: PADDLE_HEIGHT,
              backgroundColor: gameConfig.rightPaddleColor
            }} 
          />
          
          <div 
            style={{ 
              ...styles.ball, 
              left: ballPosition.x, 
              top: ballPosition.y,
              width: BALL_SIZE,
              height: BALL_SIZE,
              backgroundColor: gameConfig.ballColor
            }} 
          />
          
          <div style={styles.score1}>{score.player1}</div>
          <div style={styles.score2}>{score.player2}</div>
        </div>
      </div>
      
      {!gameStarted && (
        <div style={styles.startScreen}>
          <button style={styles.startButton} onClick={startGame}>
            Commencer la partie
          </button>
          <div style={styles.instructions}>
            <p><strong>Joueur 1 (gauche):</strong> Touches W et S</p>
            <p><strong>Joueur 2 (droite):</strong> Flèches ↑ et ↓</p>
            <p>Premier à 5 points gagne!</p>
          </div>
        </div>
      )}
      
      {gameStarted && (
        <div style={styles.controlsInfo}>
          <div>Joueur 1: W (monter) - S (descendre)</div>
          <div>Joueur 2: ↑ (monter) - ↓ (descendre)</div>
        </div>
      )}
      
      {(score.player1 === 5 || score.player2 === 5) && (
        <div style={styles.winnerScreen}>
          <h2>Partie terminée!</h2>
          <p>Le joueur {score.player1 === 5 ? 1 : 2} gagne!</p>
        </div>
      )}
    </div>
  );
};

export default PongGame;