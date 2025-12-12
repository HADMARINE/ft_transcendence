export class UpdateStatusDto {
  status: 'online' | 'offline' | 'in_game';
  currentGameId?: string;
}
