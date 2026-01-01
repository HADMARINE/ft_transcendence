import { Server } from 'socket.io';
import { GametypeEnum } from '../enum/game-type.enum';
import { IngameStatus } from '../enum/ingame-status.enum';
import { UserQueue } from './user-queue.entity';

export class ActiveGameSession<TData> {
  id: string;
  gametype: GametypeEnum;
  status: IngameStatus;
  players: UserQueue[];
  
  tournamentHistory: [string, string][][];

  classNumber: number;
  winners: UserQueue[];

  data: TData | null;
  lobbyData: {
    [key: string]: {
      color: string | null;
      map: string | null;
      ready: boolean;
      paddleSpeed?: number;
    };
  };
  createdAt: number;
  room: ReturnType<Server['in']>;
  currentClass: number;
  mapVoteData: string[];
  
  
  tournamentId?: string;
  matchId?: string;
}
