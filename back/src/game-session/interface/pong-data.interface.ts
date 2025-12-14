import { User } from 'src/users/user.entity';

export interface PongData {
  ball: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
  };
  player1: {
    user: User;
    score: number;
    y: number;
    color: string;
    speed: number;
  };
  player2: {
    user: User;
    score: number;
    y: number;
    color: string;
    speed: number;
  };
  gameWidth: number;
  gameHeight: number;
  paddleWidth: number;
  paddleHeight: number;
  maxScore: number;
  gameLoopInterval?: NodeJS.Timeout;
}
