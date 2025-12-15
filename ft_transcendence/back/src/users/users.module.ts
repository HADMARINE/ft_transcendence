import { forwardRef, Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UtilsModule } from 'src/utils/utils.module';
import { AuthModule } from 'src/auth/auth.module';
import { GameHistoryModule } from 'src/game-history/game-history.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    // AuthModule,
    forwardRef(() => AuthModule),
    forwardRef(() => GameHistoryModule),
    UtilsModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
