import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { ParametersInvalidException } from './errors/exceptions/parameters-invalid.exception';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import packageInfo from '../package.json';
import { join } from 'path';
import fastifyCookie from '@fastify/cookie';
import helmet from '@fastify/helmet';

async function bootstrap() {
  const logger = new Logger('Main');

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  app.useStaticAssets({
    root: join(__dirname, '..', 'public'),
    prefix: '/public/',
    decorateReply: false,
    setHeaders: (res) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', '*');
    },
  });

  if (process.env.NODE_ENV !== 'production') {
    
  }

  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:4000',
    process.env.REQUEST_URI,
  ].filter((origin): origin is string => Boolean(origin));

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  });

  app.enableVersioning({
    type: VersioningType.URI,
  });

  await app.register(fastifyCookie, {
    secret: process.env.COOKIE_SECRET,
  });
  await app.register(helmet);
  

  app.useGlobalPipes(
    new ValidationPipe({
      disableErrorMessages: true,
      transform: true,
      whitelist: true,
      exceptionFactory(errors) {
        throw new ParametersInvalidException(errors);
      },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle(packageInfo.name)
    .setDescription('API documentation for Transcendance')
    .setVersion(packageInfo.version)
    .addCookieAuth(
      'Authorization',
      {
        type: 'apiKey',
        in: 'cookie',
        name: 'Authorization',
      },
      'Authorization',
    )
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig, {
    deepScanRoutes: true,
  });
  SwaggerModule.setup('dev/api', app, swaggerDocument);

  await app.listen(process.env.PORT ?? 3000);

  logger.log(
    `Application is running on ${await app.getUrl()} , NODE_ENV=${process.env.NODE_ENV}`,
  );
}

bootstrap();
