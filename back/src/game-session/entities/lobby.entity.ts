import { User } from 'src/users/user.entity';
import { GametypeEnum } from '../enum/game-type.enum';
import { Socket } from 'socket.io';

export interface Lobby {
  id: string;
  gametype: GametypeEnum;
  players: LobbyPlayer[];
  maxSize: number;
  createdAt: Date;
  waitTimer?: NodeJS.Timeout;
}

export interface LobbyPlayer {
  user: User;
  client: Socket;
  joinedAt: Date;
}
