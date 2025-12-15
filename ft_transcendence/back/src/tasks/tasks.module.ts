import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { GameSessionModule } from 'src/game-session/game-session.module';

@Module({
  imports: [GameSessionModule],
  providers: [TasksService],
})
export class TasksModule {}
