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

  // Configuration HTTPS pour le développement
  let httpsOptions: { key: Buffer; cert: Buffer } | undefined = undefined;
  try {
    // Essayer différents chemins possibles pour les certificats
    const possiblePaths = [
      join(__dirname, '..', '..', 'certs'),           // /workspace/back/dist/../.. = /workspace
      join(__dirname, '..', '..', '..', 'certs'),     // Pour la racine du projet
      '/workspace/certs',                              // Chemin absolu Docker
      '/workspace/ft_transcendence/certs',            // Autre possibilité Docker
    ];
    
    let certsPath: string | null = null;
    for (const path of possiblePaths) {
      try {
        if (existsSync(join(path, 'localhost.key'))) {
          certsPath = path;
          break;
        }
      } catch (e) {
        // Ignore et continue
      }
    }
    
    if (!certsPath) {
      throw new Error('Certificats non trouvés dans les chemins possibles');
    }
    
    httpsOptions = {
      key: readFileSync(join(certsPath, 'localhost.key')),
      cert: readFileSync(join(certsPath, 'localhost.crt')),
    };
    logger.log(`HTTPS activé avec certificats depuis: ${certsPath}`);
  } catch (error) {
    logger.warn(`Certificats HTTPS non trouvés, serveur en HTTP`);
    if (error instanceof Error) {
      logger.debug(`Détails: ${error.message}`);
    }
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
