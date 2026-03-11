import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateStatusDto {
  @IsIn(['online', 'offline', 'in_game'])
  status: 'online' | 'offline' | 'in_game';

  @IsOptional()
  @IsString()
  currentGameId?: string;
}
