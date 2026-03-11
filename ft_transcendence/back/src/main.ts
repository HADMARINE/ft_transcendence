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
import { readFileSync, existsSync } from 'fs';
import fastifyCookie from '@fastify/cookie';
import helmet from '@fastify/helmet';

async function bootstrap() {
  const logger = new Logger('Main');

  // HTTPS only in production - HTTP in development for simpler local setup
  let httpsOptions: { key: Buffer; cert: Buffer } | undefined = undefined;
  if (process.env.NODE_ENV === 'production') {
    try {
      const possiblePaths = [
        join(__dirname, '..', '..', 'certs'),
        join(__dirname, '..', '..', '..', 'certs'),
        '/workspace/certs',
      ];
      let certsPath: string | null = null;
      for (const p of possiblePaths) {
        if (existsSync(join(p, 'localhost.key'))) { certsPath = p; break; }
      }
      if (!certsPath) throw new Error('Certs not found');
      httpsOptions = {
        key: readFileSync(join(certsPath, 'localhost.key')),
        cert: readFileSync(join(certsPath, 'localhost.crt')),
      };
      logger.log(`HTTPS enabled from: ${certsPath}`);
    } catch (error) {
      logger.warn('HTTPS certs not found, falling back to HTTP');
    }
  } else {
    logger.log('Development mode: running on HTTP');
  }

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(httpsOptions ? { https: httpsOptions } : {}),
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
    // Debug
  }

  const allowedOrigins = [
    'https://localhost:3000',
    'https://localhost:4000',
    'http://localhost:3000',  // Fallback pour développement sans HTTPS
    'http://localhost:4000',  // Fallback pour développement sans HTTPS
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

  // Enregistrer les plugins Fastify
  await app.register(fastifyCookie as any, {
    secret: process.env.COOKIE_SECRET,
  });
  await app.register(helmet as any);
  
  // Enregistrer multipart pour les uploads de fichiers
  // Décommentez après avoir installé: yarn add @fastify/multipart
  // const fastifyMultipart = require('@fastify/multipart');
  // await app.register(fastifyMultipart, {
  //   limits: {
  //     fileSize: 5 * 1024 * 1024, // 5MB max
  //   },
  // });

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
    // .addTag('')
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig, {
    deepScanRoutes: true,
  });
  SwaggerModule.setup('dev/api', app, swaggerDocument);

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');

  logger.log(
    `Application is running on ${await app.getUrl()} , NODE_ENV=${process.env.NODE_ENV}`,
  );
}

bootstrap();
