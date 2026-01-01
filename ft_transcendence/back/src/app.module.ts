import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ErrorsModule } from './errors/errors.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Joi from 'joi';
import { CookieResolver, I18nModule, QueryResolver } from 'nestjs-i18n';
import { join } from 'path';
import {
  ThrottlerGuard,
  ThrottlerModule,
  ThrottlerModuleOptions,
} from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { TasksModule } from './tasks/tasks.module';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { HttpExceptionFactoryFilter } from './filters/http-exception-factory.filter';
import { NotFoundExceptionFilter } from './filters/not-found-exception.filter';
import { UsersModule } from './users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UtilsService } from './utils/utils.service';
import { UtilsModule } from './utils/utils.module';
import { AuthModule } from './auth/auth.module';
import { GameHistoryModule } from './game-history/game-history.module';
import { GameSessionModule } from './game-session/game-session.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
      validationSchema: Joi.object({
        PORT: Joi.number().default(4000),
        DB_ROOT: Joi.string().required(),
        REQUEST_URI: Joi.string().required(),
        ACCESS_TOKEN_KEY: Joi.string().required(),
        ACCESS_TOKEN_EXPIRATION_TIME: Joi.string().required(),
        COOKIE_SECRET: Joi.string().required(),
        TOKEN_KEY: Joi.string(),
        THROTTLE_TTL: Joi.number().default(300),
        THROTTLE_LIMIT: Joi.number().default(100),
        GAME_FPS: Joi.number().default(10),
      }),
      validationOptions: {
        allowUnknown: true,
        abortEarly: true,
      },
    }),
    
    I18nModule.forRoot({
      fallbackLanguage: 'en-US',
      loaderOptions: {
        path: join(__dirname, '/i18n/'),
        watch: true,
      },
      resolvers: [
        { use: QueryResolver, options: ['lang'] },
        { use: CookieResolver, options: ['lang', 'NEXT_LOCALE'] },
      ],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): ThrottlerModuleOptions => ({
        throttlers: [
          {
            ttl: config.getOrThrow<number>('THROTTLE_TTL', 60),
            limit: config.getOrThrow<number>('THROTTLE_LIMIT', 300),
          },
        ],
      }),
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'sqlite',
        database: config.getOrThrow<string>('DB_ROOT'),
        autoLoadEntities: true,
        synchronize: true, 
      }),
    }),
    ErrorsModule,
    TasksModule,
    UsersModule,
    UtilsModule,
    AuthModule,
    GameHistoryModule,
    GameSessionModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: HttpExceptionFactoryFilter },
    { provide: APP_FILTER, useClass: NotFoundExceptionFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    UtilsService,
  ],
})
export class AppModule {}
