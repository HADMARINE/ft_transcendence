import { Controller, Get, Inject } from '@nestjs/common';
import { GameSessionService } from './game-session.service';
import { AuthorityEnum } from 'src/users/enums/authority.enum';
import { Roles } from 'src/decorators/roles.decorator';

@Controller('game-session')
export class GameSessionController {
  constructor(private readonly gameSessionService: GameSessionService) {}

  @Get('queue-info')
  @Roles(AuthorityEnum.NORMAL)
  getQueueInfo() {
    const queue = this.gameSessionService.getSeperatedUserQueue();
    return {
      PONG: queue.PONG.length,
      SHOOT: queue.SHOOT.length,
    };
  }
}
