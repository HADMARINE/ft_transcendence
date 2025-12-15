import { IsEnum } from 'class-validator';
import { GametypeEnum } from '../enum/game-type.enum';

export class RegisterQueueDto {
  @IsEnum(GametypeEnum)
  gametype: GametypeEnum;
}
