import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { GameSessionService } from 'src/game-session/game-session.service';

@Injectable()
export class TasksService {
  constructor(private readonly gameSessionService: GameSessionService) {}

  private readonly logger = new Logger(TasksService.name);

  @Cron('*/10 * * * * *')
  handleGameQueue() {
    this.gameSessionService.handleGameQueue();
  }
}
