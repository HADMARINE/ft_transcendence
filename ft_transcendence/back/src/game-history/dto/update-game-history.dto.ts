import { PartialType } from '@nestjs/swagger';
import { CreateGameHistoryDto } from './create-game-history.dto';

export class UpdateGameHistoryDto extends PartialType(CreateGameHistoryDto) {}
