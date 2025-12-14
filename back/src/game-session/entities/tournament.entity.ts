import { User } from 'src/users/user.entity';
import { GametypeEnum } from '../enum/game-type.enum';
import { Socket } from 'socket.io';

export interface TournamentPlayer {
  user: User;
  client: Socket;
  odisconnected?: boolean;
}

export interface TournamentMatch {
  id: string;
  player1: TournamentPlayer | null;
  player2: TournamentPlayer | null;
  winner: TournamentPlayer | null;
  status: 'pending' | 'in_progress' | 'completed';
  round: number; // 0 = demi-finales, 1 = finale, etc.
  matchIndex: number; // Index du match dans le round
}

export interface Tournament {
  id: string;
  gametype: GametypeEnum;
  players: TournamentPlayer[];
  matches: TournamentMatch[];
  currentMatch: TournamentMatch | null;
  currentMatchIndex: number;
  status: 'waiting' | 'in_progress' | 'completed';
  winner: TournamentPlayer | null;
  createdAt: Date;
  spectators: TournamentPlayer[]; // Joueurs qui ne jouent pas le match en cours
}
