import { Module } from '@nestjs/common';
import { GameSessionService } from './game-session.service';
import { GameSessionGateway } from './game-session.gateway';
import { AuthModule } from 'src/auth/auth.module';
import { UsersModule } from 'src/users/users.module';
import { GameSessionController } from './game-session.controller';
import { GameHistoryModule } from 'src/game-history/game-history.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameHistory } from 'src/game-history/entities/game-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([GameHistory]),
    AuthModule,
    UsersModule,
    GameHistoryModule,
  ],
  providers: [GameSessionGateway, GameSessionService],
  exports: [GameSessionService],
  controllers: [GameSessionController],
})
export class GameSessionModule {}
