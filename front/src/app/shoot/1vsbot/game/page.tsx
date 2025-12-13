'use client'
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';
import { useGameStatus } from "@/util/useGameStatus";

interface GameLocalProps {
  mapId: string;
  player1Color: string;
  player2Color: string;
}

interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  health: number;
  color: string;
  lastFire: number;
  lastDirection: { dx: number; dy: number };
  canDash: boolean;
  dashCooldown: number;
  dashDuration: number;
  dashSpeed: number;
  isDashing: boolean;
  dashStartTime: number;
  lastDashTime: number;
  prevX: number;
  prevY: number;
}

interface Fireball {
  x: number;
  y: number;
  radius: number;
  dx: number;
  dy: number;
  color: string;
  player: Player;
}

interface Wall {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  color: string;
  life: number;
  speedX?: number;
  speedY?: number;
}

interface BotController {
  lastDecisionTime: number;
  decisionCooldown: number;
  lastTargetPosition: { x: number; y: number };
  lastShotTime: number;
  shotCooldown: number;
}

const GameLocal = () => {
  const searchParams = useSearchParams();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fireEffectRef = useRef<HTMLDivElement>(null);
  
  const [health1, setHealth1] = useState(100);
  const [health2, setHealth2] = useState(100);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState('');
  const [fireParticles, setFireParticles] = useState<React.ReactNode>([]);

  const [player1Color, setPlayer1Color] = useState(decodeURIComponent(searchParams.get('player1Color') || '#00ccff'));
  const [player2Color, setPlayer2Color] = useState(decodeURIComponent(searchParams.get('player2Color') || '#ff6666'));
  const [mapId, setMapId] = useState('map1');

  const router  = useRouter();

  useEffect(() => {
    const player1ColorParam = searchParams.get('player1Color');
    const player2ColorParam = searchParams.get('player2Color');
    const mapIdParam = searchParams.get('mapId');

    if (player1ColorParam) {
      setPlayer1Color(decodeURIComponent(player1ColorParam));
    }
    if (player2ColorParam) {
      setPlayer2Color(decodeURIComponent(player2ColorParam));
    }
    if (mapIdParam) {
      setMapId(decodeURIComponent(mapIdParam));
    }
  }, []);

  const keys = useRef({
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    KeyW: false,
    KeyS: false,
    KeyA: false,
    KeyD: false,
    KeyC: false,
    Numpad0: false,
    KeyV: false,
    Numpad1: false
  });
  
  const walls = useRef<Wall[]>([]);
  const player1 = useRef<Player>({
    x: 150,
    y: 750 - 400,
    width: 75,
    height: 100,
    speed: 9,
    health: 100,
    color: player1Color,
    lastFire: 0,
    lastDirection: { dx: 0, dy: 0 },
    canDash: true,
    dashCooldown: 500,
    dashDuration: 50,
    dashSpeed: 50,
    isDashing: false,
    dashStartTime: 0,
    lastDashTime: 0,
    prevX: 150,
    prevY: 750 - 400
  });
  
  const player2 = useRef<Player>({
    x: 1700 - 225,
    y: 750 - 400,
    width: 75,
    height: 100,
    speed: 9,
    health: 100,
    color: player2Color,
    lastFire: 0,
    lastDirection: { dx: 0, dy: 0 },
    canDash: true,
    dashCooldown: 500,
    dashDuration: 50,
    dashSpeed: 50,
    isDashing: false,
    dashStartTime: 0,
    lastDashTime: 0,
    prevX: 1700 - 225,
    prevY: 750 - 400
  });
  
  const fireballs = useRef<Fireball[]>([]);
  const playerParticles = useRef<Particle[]>([]);
  const animationFrameId = useRef<number>(0);
  
  const botController = useRef<BotController>({
    lastDecisionTime: 0,
    decisionCooldown: 200,
    lastTargetPosition: { x: 0, y: 0 },
    lastShotTime: 0,
    shotCooldown: 1000 + Math.random() * 1000
  });

  const darkenColor = (color: string, percent: number): string => {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    
    const dr = Math.max(0, r - Math.round(r * percent));
    const dg = Math.max(0, g - Math.round(g * percent));
    const db = Math.max(0, b - Math.round(b * percent));
    
    return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
  };
  
  const createFireParticles = () => {
    const particles = [];
    for (let i = 0; i < 30; i++) {
      const left = Math.random() * 100;
      const bottom = Math.random() * 20;
      const duration = 2 + Math.random() * 3;
      const delay = Math.random() * 5;
      
      particles.push(
        <div
          key={`fire-particle-${i}`}
          className="fire-particle"
          style={{
            left: `${left}%`,
            bottom: `${bottom}%`,
            animationDuration: `${duration}s`,
            animationDelay: `${delay}s`
          }}
        />
      );
    }
    setFireParticles(particles);
  };
  
  const checkPlayerCollision = () => {
    const p1 = player1.current;
    const p2 = player2.current;
    
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const minDistance = (p1.width + p2.width) / 2;
    
    if (distance < minDistance) {
      const angle = Math.atan2(dy, dx);
      const force = 10;
      
      const player1Orig = { x: p1.x, y: p1.y };
      const player2Orig = { x: p2.x, y: p2.y };
      
      p1.x += Math.cos(angle) * force;
      p1.y += Math.sin(angle) * force;
      p2.x -= Math.cos(angle) * force;
      p2.y -= Math.sin(angle) * force;
      
      if (isCollidingWithWall(p1)) {
        p1.x = player1Orig.x;
        p1.y = player1Orig.y;
      }
      
      if (isCollidingWithWall(p2)) {
        p2.x = player2Orig.x;
        p2.y = player2Orig.y;
      }
      
      const newDx = p1.x - p2.x;
      const newDy = p1.y - p2.y;
      const newDistance = Math.sqrt(newDx * newDx + newDy * newDy);
      
      if (newDistance < minDistance) {
        p1.x = player1Orig.x;
        p1.y = player1Orig.y;
        p2.x = player2Orig.x;
        p2.y = player2Orig.y;
      }
    }
  };
  
  const createDashParticles = (player: Player) => {
    const count = 15;
    for (let i = 0; i < count; i++) {
      playerParticles.current.push({
        x: player.x + player.width/2,
        y: player.y + player.height/2,
        size: Math.random() * 4 + 2,
        color: player.color,
        life: 20,
        speedX: (Math.random() - 0.5) * 15,
        speedY: (Math.random() - 0.5) * 15
      });
    }
  };
  
  const createPlayerParticles = (player: Player) => {
    const count = Math.random() > 0.7 ? 1 : 0;
    for (let i = 0; i < count; i++) {
      playerParticles.current.push({
        x: player.x + Math.random() * player.width,
        y: player.y + Math.random() * player.height,
        size: Math.random() * 3 + 1,
        color: player.color,
        life: 30
      });
    }
  };
  
  const isCollidingWithWall = (object: any, isFireball: boolean = false): boolean => {
    const gameWidth = 1700;
    const gameHeight = 750;
    
    if (object.x < 0 || 
        object.x + object.width > gameWidth ||
        object.y < 0 || 
        object.y + object.height > gameHeight) {
      return true;
    }
    
    for (const wall of walls.current) {
      if (isFireball) {
        let closestX = Math.max(wall.x, Math.min(object.x, wall.x + wall.width));
        let closestY = Math.max(wall.y, Math.min(object.y, wall.y + wall.height));
        let distanceX = object.x - closestX;
        let distanceY = object.y - closestY;
        let distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
        
        if (distance < object.radius) {
          return true;
        }
      } else {
        if (object.x < wall.x + wall.width &&
            object.x + object.width > wall.x &&
            object.y < wall.y + wall.height &&
            object.y + object.height > wall.y) {
          return true;
        }
      }
    }
    return false;
  };
  
  const handlePlayerCollisionWithWall = (player: Player) => {
    const originalX = player.x;
    const originalY = player.y;
    
    player.x = player.prevX;
    if (!isCollidingWithWall(player)) {
      return;
    }
    
    player.x = originalX;
    player.y = player.prevY;
    if (!isCollidingWithWall(player)) {
      return;
    }
    
    player.x = player.prevX;
    player.y = player.prevY;
  };
  
  const createFireball = (player: Player) => {
    if (player.lastDirection.dx === 0 && player.lastDirection.dy === 0) {
      player.lastDirection = { 
        dx: player === player1.current ? 1 : -1, 
        dy: 0 
      };
    }
    
    fireballs.current.push({
      x: player.x + player.width/2,
      y: player.y + player.height/2,
      radius: 15,
      dx: player.lastDirection.dx * 50,
      dy: player.lastDirection.dy * 50,
      color: player.color,
      player
    });
  };
  
  const isColliding = (fireball: Fireball, player: Player): boolean => {
    return fireball.x > player.x && 
           fireball.x < player.x + player.width &&
           fireball.y > player.y && 
           fireball.y < player.y + player.height;
  };
  
  const resetGame = (nbr: number) => {
    for (let i = fireballs.current.length - 1; i >= 0; i--)
    {
      fireballs.current.splice(i, 1);
    }
    player1.current.x = 150; 
    player1.current.y = 750 - 400;
    if (nbr === 0) {
      player1.current.health = 100;
      setHealth1(100);
    }
    player1.current.lastDirection = { dx: 0, dy: 0 };
    
    player2.current.x = 1700 - 225;
    player2.current.y = 750 - 400;
    if (nbr === 0) {
      player2.current.health = 100;
      setHealth2(100);
    }
    player2.current.lastDirection = { dx: 0, dy: 0 };

    const currentKeys = keys.current;
    for (const key in currentKeys) {
      if (currentKeys.hasOwnProperty(key)) {
        currentKeys[key as keyof typeof currentKeys] = false;
      }
    }
  };
  
  const updateBot = () => {
    const currentTime = Date.now();
    const bot = player2.current;
    const target = player1.current;
    
    if (currentTime - botController.current.lastDecisionTime < botController.current.decisionCooldown) {
      return;
    }
    
    botController.current.lastDecisionTime = currentTime;
    const targetCenter = { 
      x: target.x + target.width/2, 
      y: target.y + target.height/2 
    };
    botController.current.lastTargetPosition = targetCenter;

    keys.current.ArrowUp = false;
    keys.current.ArrowDown = false;
    keys.current.ArrowLeft = false;
    keys.current.ArrowRight = false;
    keys.current.Numpad0 = false;
    keys.current.Numpad1 = false;

    const botCenter = {
      x: bot.x + bot.width/2,
      y: bot.y + bot.height/2
    };

    const dx = targetCenter.x - botCenter.x;
    const dy = targetCenter.y - botCenter.y;
    const distance = Math.sqrt(dx*dx + dy*dy);
    const angle = Math.atan2(dy, dx);
    
    let avoidVector = { x: 0, y: 0 };
    fireballs.current.forEach(fb => {
      if (fb.player === player1.current) {
        const fbDistX = fb.x - botCenter.x;
        const fbDistY = fb.y - botCenter.y;
        const fbDistance = Math.sqrt(fbDistX*fbDistX + fbDistY*fbDistY);
        
        if (fbDistance < 300) {
          avoidVector.x -= fbDistX / fbDistance;
          avoidVector.y -= fbDistY / fbDistance;
        }
      }
    });

    if (Math.abs(avoidVector.x) > 0.5 || Math.abs(avoidVector.y) > 0.5) {
      if (avoidVector.x < -0.5) keys.current.ArrowLeft = true;
      if (avoidVector.x > 0.5) keys.current.ArrowRight = true;
      if (avoidVector.y < -0.5) keys.current.ArrowUp = true;
      if (avoidVector.y > 0.5) keys.current.ArrowDown = true;
      
      if (bot.canDash && !bot.isDashing && currentTime - bot.lastDashTime > bot.dashCooldown) {
        keys.current.Numpad1 = true;
      }
    } 
    else {
      const optimalDistance = 400;
      const minDistance = 250;
      const maxDistance = 500;
      
      if (distance < minDistance) {
        keys.current.ArrowLeft = dx < 0 ? false : true;
        keys.current.ArrowRight = dx < 0 ? true : false;
        keys.current.ArrowUp = dy < 0 ? false : true;
        keys.current.ArrowDown = dy < 0 ? true : false;
      } else if (distance > maxDistance) {
        keys.current.ArrowLeft = dx < 0 ? true : false;
        keys.current.ArrowRight = dx < 0 ? false : true;
        keys.current.ArrowUp = dy < 0 ? true : false;
        keys.current.ArrowDown = dy < 0 ? false : true;
      } else {
        if (Math.random() > 0.5) {
          keys.current.ArrowLeft = Math.random() > 0.5;
          keys.current.ArrowRight = !keys.current.ArrowLeft;
        } else {
          keys.current.ArrowUp = Math.random() > 0.5;
          keys.current.ArrowDown = !keys.current.ArrowUp;
        }
      }
      
      if (Math.abs(distance - optimalDistance) > 150 && 
          bot.canDash && !bot.isDashing && 
          currentTime - bot.lastDashTime > bot.dashCooldown) {
        keys.current.Numpad1 = true;
      }
      
      bot.lastDirection = { 
        dx: Math.cos(angle), 
        dy: Math.sin(angle) 
      };
      
      const aimThreshold = 0.85;
      const aimDotProduct = 
        (Math.cos(angle) * bot.lastDirection.dx) + 
        (Math.sin(angle) * bot.lastDirection.dy);
      
      if (aimDotProduct > aimThreshold && 
          currentTime - botController.current.lastShotTime > botController.current.shotCooldown) {
        keys.current.Numpad0 = true;
        botController.current.lastShotTime = currentTime;
        botController.current.shotCooldown = 700;
      }
    }
  };
  
  const update = () => {
    const currentTime = Date.now();
    const p1 = player1.current;
    const p2 = player2.current;
    
    p1.prevX = p1.x;
    p1.prevY = p1.y;
    p2.prevX = p2.x;
    p2.prevY = p2.y;
  
    updateBot();
  
    if (keys.current.KeyV && p1.canDash && !p1.isDashing && 
        currentTime - p1.lastDashTime > p1.dashCooldown) {
      p1.isDashing = true;
      p1.dashStartTime = currentTime;
      p1.lastDashTime = currentTime;
      createDashParticles(p1);
    }
    
    if (p1.isDashing) {
      if (currentTime - p1.dashStartTime < p1.dashDuration) {
        const dx = p1.lastDirection.dx * p1.dashSpeed;
        const dy = p1.lastDirection.dy * p1.dashSpeed;
        
        p1.x += dx;
        p1.y += dy;
        
        p1.x = Math.max(0, Math.min(1700 - p1.width, p1.x));
        p1.y = Math.max(0, Math.min(750 - p1.height, p1.y));
        
        if (Math.random() > 0.5) {
          createDashParticles(p1);
        }
      } else {
        p1.isDashing = false;
      }
    }
    
    if (keys.current.Numpad1 && p2.canDash && !p2.isDashing && 
        currentTime - p2.lastDashTime > p2.dashCooldown) {
      p2.isDashing = true;
      p2.dashStartTime = currentTime;
      p2.lastDashTime = currentTime;
      createDashParticles(p2);
    }
    
    if (p2.isDashing) {
      if (currentTime - p2.dashStartTime < p2.dashDuration) {
        const dx = p2.lastDirection.dx * p2.dashSpeed;
        const dy = p2.lastDirection.dy * p2.dashSpeed;
        
        p2.x += dx;
        p2.y += dy;
        
        p2.x = Math.max(0, Math.min(1700 - p2.width, p2.x));
        p2.y = Math.max(0, Math.min(750 - p2.height, p2.y));
        
        if (Math.random() > 0.5) {
          createDashParticles(p2);
        }
      } else {
        p2.isDashing = false;
      }
    }
    
    if (!p1.isDashing) {
      if (keys.current.KeyW && p1.y > 0) {
        p1.y -= p1.speed;
        p1.lastDirection = { dx: 0, dy: -1 };
      }
      if (keys.current.KeyS && p1.y < 750 - p1.height) {
        p1.y += p1.speed;
        p1.lastDirection = { dx: 0, dy: 1 };
      }
      if (keys.current.KeyA && p1.x > 0) {
        p1.x -= p1.speed;
        p1.lastDirection = { dx: -1, dy: 0 };
      }
      if (keys.current.KeyD && p1.x < 1700 - p1.width) {
        p1.x += p1.speed;
        p1.lastDirection = { dx: 1, dy: 0 };
      }
    }
    
    if (!p2.isDashing) {
      if (keys.current.ArrowUp && p2.y > 0) {
        p2.y -= p2.speed;
        p2.lastDirection = { dx: 0, dy: -1 };
      }
      if (keys.current.ArrowDown && p2.y < 750 - p2.height) {
        p2.y += p2.speed;
        p2.lastDirection = { dx: 0, dy: 1 };
      }
      if (keys.current.ArrowLeft && p2.x > 0) {
        p2.x -= p2.speed;
        p2.lastDirection = { dx: -1, dy: 0 };
      }
      if (keys.current.ArrowRight && p2.x < 1700 - p2.width) {
        p2.x += p2.speed;
        p2.lastDirection = { dx: 1, dy: 0 };
      }
    }
    
    if (isCollidingWithWall(p1)) {
      handlePlayerCollisionWithWall(p1);
    }
    
    if (isCollidingWithWall(p2)) {
      handlePlayerCollisionWithWall(p2);
    }
    
    checkPlayerCollision();
    
    if (keys.current.KeyC && currentTime - p1.lastFire > 500) {
      createFireball(p1);
      p1.lastFire = currentTime;
    }
    
    if (keys.current.Numpad0 && currentTime - p2.lastFire > 500) {
      createFireball(p2);
      p2.lastFire = currentTime;
    }
    
    for (let i = fireballs.current.length - 1; i >= 0; i--) {
      const fb = fireballs.current[i];
      fb.x += fb.dx;
      fb.y += fb.dy;
      
      if (isCollidingWithWall(fb, true)) {
        fireballs.current.splice(i, 1);
        continue;
      }
      
      if (fb.x < 0 || fb.x > 1700 || fb.y < 0 || fb.y > 750) {
        fireballs.current.splice(i, 1);
        continue;
      }
      
      const targetPlayer = fb.player === p1 ? p2 : p1;
      if (isColliding(fb, targetPlayer)) {
        targetPlayer.health -= 20;
        
        if (targetPlayer === p1) {
          setHealth1(targetPlayer.health);
        } else {
          setHealth2(targetPlayer.health);
        }
        
        fireballs.current.splice(i, 1);
        
        if (targetPlayer.health <= 0) {
          setGameOver(true);
          setWinner(targetPlayer === p1 ? "Joueur 2" : "Joueur 1");
        } else {
          resetGame(1);
        }
        
        break; 
      }
    }
    
    for (let i = playerParticles.current.length - 1; i >= 0; i--) {
      const p = playerParticles.current[i];
      p.life--;
      if (p.life <= 0) {
        playerParticles.current.splice(i, 1);
      }
    }
  };
  
  const drawDirectionIndicator = (ctx: CanvasRenderingContext2D, player: Player) => {
    const indicatorLength = 50;
    const centerX = player.x + player.width/2;
    const centerY = player.y + player.height/2;
    
    if (player.lastDirection.dx !== 0 || player.lastDirection.dy !== 0) {
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + player.lastDirection.dx * indicatorLength,
        centerY + player.lastDirection.dy * indicatorLength * 1.25
      );
      ctx.strokeStyle = player.color;
      ctx.lineWidth = 3;
      ctx.stroke();
      
      const arrowSize = 15;
      const endX = centerX + player.lastDirection.dx * indicatorLength;
      const endY = centerY + player.lastDirection.dy * indicatorLength * 1.25;
      
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      
      if (player.lastDirection.dx !== 0) {
        ctx.lineTo(endX - player.lastDirection.dx * arrowSize, endY - arrowSize);
        ctx.lineTo(endX - player.lastDirection.dx * arrowSize, endY + arrowSize);
      } else {
        ctx.lineTo(endX - arrowSize, endY - player.lastDirection.dy * arrowSize);
        ctx.lineTo(endX + arrowSize, endY - player.lastDirection.dy * arrowSize);
      }
      
      ctx.closePath();
      ctx.fillStyle = player.color;
      ctx.fill();
    }
  };
  
  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, 1700, 750);
    
    ctx.fillStyle = '#555';
    walls.current.forEach(wall => {
      ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
      
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 3;
      ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
      
      if (mapId === 'map2' && wall.width === 100 && wall.height === 300) {
        ctx.fillStyle = '#444';
        ctx.fillRect(wall.x + 10, wall.y + 10, wall.width - 20, wall.height - 20);
      }
    });
    
    playerParticles.current.forEach(p => {
      ctx.globalAlpha = p.life / 30;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 750 - 20, 1700, 20);
    
    ctx.fillStyle = player1.current.color;
    ctx.fillRect(player1.current.x, player1.current.y, player1.current.width, player1.current.height);
    
    ctx.fillStyle = player2.current.color;
    ctx.fillRect(player2.current.x, player2.current.y, player2.current.width, player2.current.height);
    
    fireballs.current.forEach(fb => {
      ctx.beginPath();
      ctx.arc(fb.x, fb.y, fb.radius, 0, Math.PI * 2);
      ctx.fillStyle = fb.color;
      ctx.fill();
    });
    
    drawDirectionIndicator(ctx, player1.current);
    drawDirectionIndicator(ctx, player2.current);
  };
  
  const gameLoop = () => {
    if (gameOver) return;
    
    createPlayerParticles(player1.current);
    createPlayerParticles(player2.current);
    update();
    render();
    animationFrameId.current = requestAnimationFrame(gameLoop);
  };
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (keys.current.hasOwnProperty(e.code)) {
        keys.current[e.code as keyof typeof keys.current] = true;
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (keys.current.hasOwnProperty(e.code)) {
        keys.current[e.code as keyof typeof keys.current] = false;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
  
  useEffect(() => {
    if (mapId === 'map2') {
      walls.current = [{ 
        x: 800, 
        y: 225, 
        width: 100, 
        height: 300 
      }];
    } else {
      walls.current = [];
    }
    
    createFireParticles();
    
    gameLoop();
    
    return () => {
      cancelAnimationFrame(animationFrameId.current);
    };
  }, [mapId]);
  
  useEffect(() => {
    if (gameOver) {
      cancelAnimationFrame(animationFrameId.current);
    }
  }, [gameOver]);
  
  const player1Dark = darkenColor(player1Color, 0.3);
  const player2Dark = darkenColor(player2Color, 0.3);
  
  return (
    <div style={{ 
      position: 'relative',
      width: '100%',
      height: '100vh',
      overflow: 'hidden',
      background: 'linear-gradient(135deg, #1a2a6c, #b21f1f, #1a2a6c)'
    }}>
      <div 
        ref={fireEffectRef} 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 1
        }}
      >
        {fireParticles}
      </div>
      
      <div style={{
        position: 'absolute',
        top: '0px',
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'space-between',
        padding: '0 20px',
        zIndex: 2,
        gap: '10px',
        flexWrap: 'wrap'
      }}>
        <div style={{ 
          background: 'rgba(0, 0, 0, 0.6)',
          padding: '12px 20px',
          borderRadius: '15px',
          minWidth: '100px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
          border: '2px solid rgba(255, 200, 0, 0.3)',
          textAlign: 'center',
          fontSize: '1rem',
          fontWeight: 'bold',
          margin: '10px'
        }}>
          <p>
            <span style={{ color: player1Color }}>Z Q S D</span> + 
            <span style={{ color: player1Color }}> C</span> pour tirer + 
            <span style={{ color: player1Color }}> Shift gauche</span> pour dash
          </p>
        </div>
        <div style={{ 
          background: 'rgba(0, 0, 0, 0.6)', 
          padding: '13px',
          borderRadius: '15px',
          minWidth: '200px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
          border: '2px solid rgba(255, 200, 0, 0.3)',
          margin: '10px'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            marginBottom: '10px'
          }}>
            <div style={{ 
              fontSize: '1.3rem',
              fontWeight: 'bold',
              color: player1Color
            }}>Joueur 1</div>
            <div style={{ 
              fontSize: '1.3rem',
              fontWeight: 'bold',
              color: 'white'
            }}>{health1}%</div>
          </div>
          <div style={{ 
            height: '20px', 
            background: '#333',
            borderRadius: '15px',
            overflow: 'hidden',
            width: '100%',
            border: '2px solid #444',
          }}>
            <div 
              style={{ 
                height: '100%',
                background: `linear-gradient(to right, ${player1Color}, ${player1Dark})`,
                width: `${health1}%`,
                transition: 'width 0.3s ease',
                maxWidth: '100%',
              }}
            />
          </div>
        </div>
        
        <div style={{ 
          background: 'rgba(0, 0, 0, 0.6)', 
          padding: '13px',
          borderRadius: '15px',
          minWidth: '200px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
          border: '2px solid rgba(255, 200, 0, 0.3)',
          margin: '10px'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            marginBottom: '10px'
          }}>
            <div style={{ 
              fontSize: '1.3rem',
              fontWeight: 'bold',
              color: player2Color
            }}>Joueur 2 (BOT)</div>
            <div style={{ 
              fontSize: '1.3rem',
              fontWeight: 'bold',
              color: 'white'
            }}>{health2}%</div>
          </div>
          <div style={{ 
            height: '20px', 
            background: '#333',
            borderRadius: '15px',
            overflow: 'hidden',
            width: '100%',
            border: '2px solid #444',
          }}>
            <div 
              style={{ 
                height: '100%',
                background: `linear-gradient(to right, ${player2Color}, ${player2Dark})`,
                width: `${health2}%`,
                transition: 'width 0.3s ease',
                maxWidth: '100%',
              }}
            />
          </div>
        </div>
        
        <div style={{ 
          background: 'rgba(0, 0, 0, 0.6)',
          padding: '15px 20px',
          borderRadius: '15px',
          minWidth: '180px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
          border: '2px solid rgba(255, 200, 0, 0.3)',
          textAlign: 'center',
          fontSize: '1rem',
          fontWeight: 'bold',
          margin: '10px'
        }}>
          <p>
            <span style={{ color: player2Color }}>BOT</span>
          </p>
        </div>
      </div>
      
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1
      }}>
        <canvas 
          ref={canvasRef} 
          width={1700} 
          height={750} 
          style={{ 
            border: '3px solid #ff9900',
            borderRadius: '15px',
            boxShadow: '0 0 30px rgba(255, 100, 0, 0.7)',
            background: 'linear-gradient(to bottom, #2c3e50, #1c2833)'
          }}
        />
      </div>
      
      {gameOver && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10
        }}>
          <div style={{
            background: 'rgba(50, 50, 50, 0.9)',
            padding: '40px',
            borderRadius: '15px',
            textAlign: 'center',
            border: '2px solid #ffcc00',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
          }}>
            <h2 style={{ 
              color: '#ffcc00', 
              fontSize: '3rem',
              marginBottom: '20px',
              textShadow: '0 0 10px rgba(255, 204, 0, 0.5)'
            }}>
              {winner} a gagné !
            </h2>
            <button 
              onClick={() => router.back()}
              style={{
                background: 'linear-gradient(to right, #ff8c00, #ff6600)',
                color: 'white',
                border: 'none',
                padding: '15px 40px',
                fontSize: '1.2rem',
                fontWeight: 'bold',
                borderRadius: '30px',
                cursor: 'pointer',
                marginTop: '20px',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(255, 102, 0, 0.4)',
                ':hover': {
                  transform: 'scale(1.05)'
                }
              }}
            >
              REJOUER
            </button>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .fire-particle {
          position: absolute;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: radial-gradient(circle, #ff9900, #ff3300);
          box-shadow: 0 0 15px #ff6600;
          animation: floatUp linear infinite;
        }
        
        @keyframes floatUp {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-100px) scale(0.2);
            opacity: 0;
          }
        }
        
        @media (max-width: 850px) {
          .health-bars {
            flex-direction: column;
            align-items: center;
          }
          
          .game-area {
            width: 95%;
            height: 400px;
          }
        }
      `}</style>
    </div>
  );
};

export default GameLocal;
