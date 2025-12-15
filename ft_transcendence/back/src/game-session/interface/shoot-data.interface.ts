import { User } from 'src/users/user.entity';
import { OrientationEnum } from '../enum/orientation.enum';

export interface ShootData {
  player1: {
    user: User;
    score: number;
    x: number;
    y: number;
    orentation: OrientationEnum;
    balls: {
      x: number;
      y: number;
    }[];
  };
  player2: {
    user: User;
    score: number;
    x: number;
    y: number;
    orentation: OrientationEnum;
    balls: {
      x: number;
      y: number;
    }[];
  };
}
