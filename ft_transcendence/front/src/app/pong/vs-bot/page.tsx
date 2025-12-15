"use client";

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useGameStatus } from "@/util/useGameStatus";

const ConfigScreen = dynamic(() => import('./ConfigScreen.tsx'), { ssr: false });

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
  botIndicator: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    backgroundColor: 'rgba(247, 37, 133, 0.7)',
    color: 'white',
    padding: '5px 10px',
    borderRadius: '5px',
    fontSize: '0.9rem',
  }
};

const PongGame = () => {
  const [gameOver, setGameOver] = useState(false);
  const [gameConfig, setGameConfig] = useState<any>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [score, setScore] = useState({ player1: 0, player2: 0 });
  const [player1Y, setPlayer1Y] = useState(0);
  const [player2Y, setPlayer2Y] = useState(0);
  const [ballPosition, setBallPosition] = useState({ x: 0, y: 0 });
  const [ballVelocity, setBallVelocity] = useState({ x: 5, y: 3 });
  const [showConfigAfterGame, setShowConfigAfterGame] = useState(false);
  const [botTargetY, setBotTargetY] = useState<number | null>(null);
  const prevBallPosition = useRef({ x: 0, y: 0 });
  
  const GAME_WIDTH = 800;
  const GAME_HEIGHT = 500;
  const PADDLE_WIDTH = 15;
  const PADDLE_HEIGHT = 100;
  const BALL_SIZE = 20;
  
  const animationFrameRef = useRef<number>();
  const keysPressed = useRef({
    w: false,
    s: false,
    arrowUp: false,
    arrowDown: false
  });
  
  useEffect(() => {
    if (gameConfig) {
      const centerY = GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2;
      setPlayer1Y(centerY);
      setPlayer2Y(centerY);
      const ballPos = { 
        x: GAME_WIDTH / 2 - BALL_SIZE / 2, 
        y: GAME_HEIGHT / 2 - BALL_SIZE / 2 
      };
      setBallPosition(ballPos);
      prevBallPosition.current = ballPos;
      setBotTargetY(null);
    }
  }, [gameConfig]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'w' || e.key === 'W') keysPressed.current.w = true;
      if (e.key === 's' || e.key === 'S') keysPressed.current.s = true;
      if (e.key === 'ArrowUp') keysPressed.current.arrowUp = true;
      if (e.key === 'ArrowDown') keysPressed.current.arrowDown = true;
      if (e.key === ' ' && !gameStarted && gameConfig) startGame();
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
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
    const centerX = GAME_WIDTH / 2 - BALL_SIZE / 2;
    const centerY = GAME_HEIGHT / 2 - BALL_SIZE / 2;
    
    setBallPosition({ x: centerX, y: centerY });
    
    const initialVx = 7;
    const initialVy = (Math.random() * 4) - 2;
    
    setBallVelocity({ x: initialVx, y: initialVy });
    
    const predictedY = predictBallPosition(centerX, centerY, initialVx, initialVy);
    const targetY = Math.max(0, Math.min(GAME_HEIGHT - PADDLE_HEIGHT, predictedY - PADDLE_HEIGHT / 2));
    setBotTargetY(targetY);
  };
  
  const backToConfig = () => {
    setGameStarted(false);
    setShowConfigAfterGame(true);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setBotTargetY(null);
  };
  
  useEffect(() => {
    if (score.player1 === 5 || score.player2 === 5) {
      setGameOver(true);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      setTimeout(() => {
        setGameStarted(false);
        setShowConfigAfterGame(true);
      }, 800);
    }
  }, [score]);
  
  const predictBallPosition = (ballX: number, ballY: number, vx: number, vy: number) => {
    let simX = ballX;
    let simY = ballY;
    let simVx = vx;
    let simVy = vy;
    
    while (simX < GAME_WIDTH - PADDLE_WIDTH - BALL_SIZE && simVx > 0) {
      simX += simVx;
      simY += simVy;
      
      if (simY <= 0) {
        simY = 0;
        simVy = Math.abs(simVy);
      } else if (simY >= GAME_HEIGHT - BALL_SIZE) {
        simY = GAME_HEIGHT - BALL_SIZE;
        simVy = -Math.abs(simVy);
      }
    }
    
    return simY;
  };
  
  useEffect(() => {
    if (!gameStarted || !gameConfig || gameOver) return;

    const updateGame = () => {
      if (gameOver) return;
      
      prevBallPosition.current = ballPosition;

      if (keysPressed.current.w && player1Y > 0) {
        setPlayer1Y(prev => prev - Number(gameConfig.leftPaddleSpeed));
      }
      if (keysPressed.current.s && player1Y < GAME_HEIGHT - PADDLE_HEIGHT) {
        setPlayer1Y(prev => prev + Number(gameConfig.leftPaddleSpeed));
      }
      
      if (botTargetY !== null) {
        const botSpeed = gameConfig.botSpeed || 5;
        setPlayer2Y(prev => {
          const diff = botTargetY - prev;
          
          if (Math.abs(diff) < 2) return prev;
          
          return prev + (diff > 0 ? 
            Math.min(botSpeed, diff) : 
            Math.max(-botSpeed, diff)
          );
        });
      }
    
      let newX = ballPosition.x + ballVelocity.x;
      let newY = ballPosition.y + ballVelocity.y;
      let newVx = ballVelocity.x;
      let newVy = ballVelocity.y;
      let scored = false;
      
      if (newY <= 0) {
        newY = 0;
        newVy = Math.abs(newVy);
      } else if (newY >= GAME_HEIGHT - BALL_SIZE) {
        newY = GAME_HEIGHT - BALL_SIZE;
        newVy = -Math.abs(newVy);
      }
      
      if (newVx < 0) {
        if (prevBallPosition.current.x >= PADDLE_WIDTH && newX < PADDLE_WIDTH) {
          const t = (PADDLE_WIDTH - prevBallPosition.current.x) / (newX - prevBallPosition.current.x);
          const collisionY = prevBallPosition.current.y + (newY - prevBallPosition.current.y) * t;
          
          if (collisionY + BALL_SIZE >= player1Y && collisionY <= player1Y + PADDLE_HEIGHT) {
            newX = PADDLE_WIDTH;
            newY = collisionY;
            
            const hitPosition = (collisionY + BALL_SIZE/2 - player1Y) / PADDLE_HEIGHT;
            const normalizedHit = Math.max(0.1, Math.min(0.9, hitPosition));
            const angle = (normalizedHit - 0.5) * (Math.PI / 2);
            const speed = Math.sqrt(newVx * newVx + newVy * newVy) + 1;
            
            newVx = Math.abs(Math.cos(angle)) * speed;
            newVy = Math.sin(angle) * speed;
            
            const predictedY = predictBallPosition(newX, newY, newVx, newVy);
            const targetY = Math.max(0, Math.min(
              GAME_HEIGHT - PADDLE_HEIGHT, 
              predictedY - PADDLE_HEIGHT / 2
            ));
            
            setBotTargetY(targetY);
          }
        }
      }
      
      if (newVx > 0) {
        if (prevBallPosition.current.x + BALL_SIZE <= GAME_WIDTH - PADDLE_WIDTH && 
            newX + BALL_SIZE > GAME_WIDTH - PADDLE_WIDTH) {
          const t = (GAME_WIDTH - PADDLE_WIDTH - BALL_SIZE - prevBallPosition.current.x) / (newX - prevBallPosition.current.x);
          const collisionY = prevBallPosition.current.y + (newY - prevBallPosition.current.y) * t;
          
          if (collisionY + BALL_SIZE >= player2Y && collisionY <= player2Y + PADDLE_HEIGHT) {
            newX = GAME_WIDTH - PADDLE_WIDTH - BALL_SIZE;
            newY = collisionY;
            
            const hitPosition = (collisionY + BALL_SIZE/2 - player2Y) / PADDLE_HEIGHT;
            const normalizedHit = Math.max(0.1, Math.min(0.9, hitPosition));
            const angle = (normalizedHit - 0.5) * (Math.PI / 2);
            const speed = Math.sqrt(newVx * newVx + newVy * newVy) + 1;
            
            newVx = -Math.abs(Math.cos(angle)) * speed;
            newVy = Math.sin(angle) * speed;
          }
        }
      }
      
      if (newX < -BALL_SIZE) {
        setScore(prev => ({ ...prev, player2: prev.player2 + 1 }));
        scored = true;
      } else if (newX > GAME_WIDTH) {
        setScore(prev => ({ ...prev, player1: prev.player1 + 1 }));
        scored = true;
      }
      
      if (scored) {
        resetBall();
      } else {
        setBallPosition({ x: newX, y: newY });
        setBallVelocity({ x: newVx, y: newVy });
        
        if (newVx > 0) {
          const predictedY = predictBallPosition(newX, newY, newVx, newVy);
          const targetY = Math.max(0, Math.min(
            GAME_HEIGHT - PADDLE_HEIGHT, 
            predictedY - PADDLE_HEIGHT / 2
          ));
          
          setBotTargetY(targetY);
        }
      }
      
      animationFrameRef.current = requestAnimationFrame(updateGame);
    };
    
    animationFrameRef.current = requestAnimationFrame(updateGame);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [
    gameStarted, 
    ballPosition, 
    ballVelocity, 
    player1Y, 
    player2Y, 
    gameConfig, 
    gameOver, 
    botTargetY
  ]);
  
  if (!gameConfig || showConfigAfterGame) {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>Pong contre un bot</h1>
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
          
          <div style={styles.botIndicator}>Bot activé</div>
        </div>
      </div>
      
      {!gameStarted && (
        <div style={styles.startScreen}>
          <button style={styles.startButton} onClick={startGame}>
            Commencer la partie
          </button>
          <div style={styles.instructions}>
            <p><strong>Joueur 1 (gauche):</strong> Touches W et S</p>
            <p><strong>Joueur 2 (droite):</strong> Contrôlé par le bot</p>
            <p>Premier à 5 points gagne!</p>
          </div>
        </div>
      )}
      
      {gameStarted && (
        <div style={styles.controlsInfo}>
          <div>Joueur 1: W (monter) - S (descendre)</div>
          <div>Joueur 2: Contrôlé par le bot</div>
        </div>
      )}
      
      {(score.player1 === 5 || score.player2 === 5) && (
        <div style={styles.winnerScreen}>
          <h2>Partie terminée!</h2>
          <p>Le joueur {score.player1 === 5 ? 1 : 2} gagne!</p>
          <button style={styles.restartButton} onClick={backToConfig}>
            Rejouer
          </button>
        </div>
      )}
    </div>
  );
};

export default PongGame;