import { NestFactory } from '@nestjs/core';
import {
  ExpressAdapter,
  NestExpressApplication,
} from '@nestjs/platform-express';
import express from 'express';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth';
import { AppModule } from './app.module';

async function bootstrap() {
  const server = express();

  // Mount BetterAuth BEFORE NestJS body parser
  // BetterAuth handles all /api/auth/* routes
  server.all('/api/auth/*', toNodeHandler(auth));

  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(server),
    { bodyParser: false },
  );

  // Re-enable body parsing for NestJS routes
  app.useBodyParser('json');
  app.useBodyParser('urlencoded', { extended: true });

  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  await app.listen(process.env.PORT || 4000);
}

bootstrap();
