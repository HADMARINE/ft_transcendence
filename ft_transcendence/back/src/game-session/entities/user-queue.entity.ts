import { User } from 'src/users/user.entity';
import { GametypeEnum } from '../enum/game-type.enum';
import { Socket } from 'socket.io';

export interface UserQueue {
  user: User;
  client: Socket;
  gametype: GametypeEnum;
  entryTimestamp: Date;
}
