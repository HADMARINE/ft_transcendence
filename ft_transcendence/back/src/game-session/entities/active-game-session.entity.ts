import { Server } from 'socket.io';
import { GametypeEnum } from '../enum/game-type.enum';
import { IngameStatus } from '../enum/ingame-status.enum';
import { UserQueue } from './user-queue.entity';

export class ActiveGameSession<TData> {
  id: string;
  gametype: GametypeEnum;
  status: IngameStatus;
  players: UserQueue[];
  /**
   * Tournament History
   *
   * Depth 0 data is a round : for round number, get length of array
   * Depth 1 data is a match
   * Depth 2 data is two id of players
   */
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
  
  // Tournament tracking
  tournamentId?: string;
  matchId?: string;
}
