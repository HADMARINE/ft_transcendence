// src/app/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import GameCustomisation from './GameCustomisation';
import GameLocal from './game/page';
import { useSearchParams } from 'next/navigation';
import { useGameStatus } from "@/util/useGameStatus";

export default function HomePage() {
  useGameStatus("shoot_1vs1_local");

  const [gameStarted, setGameStarted] = useState(false);
  const [gameConfig, setGameConfig] = useState({
    mapId: 'map1',
    player1Color: '#00ccff',
    player2Color: '#ff6666'
  });
  const searchParams = useSearchParams();

  useEffect(() => {
    const player1Color = searchParams.get('player1Color');
    const player2Color = searchParams.get('player2Color');

  }, []);

  const handleGameStart = (config: {
    mapId: string;
    player1Color: string;
    player2Color: string;
  }) => {
    setGameConfig(config);
    setGameStarted(true);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      background: 'linear-gradient(135deg, #1a2a6c, #b21f1f, #1a2a6c)',
      backgroundSize: '200% 200%',
      animation: 'gradientAnimation 15s ease infinite'
    }}>
      {gameStarted ? (
        <GameLocal 
          mapId={gameConfig.mapId}
          player1Color={gameConfig.player1Color}
          player2Color={gameConfig.player2Color}
        />
      ) : (
        <GameCustomisation onPlay={handleGameStart} />
      )}
      
      <style jsx>{`
        @keyframes gradientAnimation {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>
    </div>
  );
}