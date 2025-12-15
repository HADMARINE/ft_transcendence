import { Type } from 'class-transformer';
import { IsEnum, IsObject, IsString } from 'class-validator';
import { GametypeEnum } from 'src/game-session/enum/game-type.enum';

export class CreateGameHistoryDto {
  @IsEnum(GametypeEnum)
  gametype: GametypeEnum;

  @IsString({ each: true })
  players: string[];

  @IsString()
  winner: string;
}
