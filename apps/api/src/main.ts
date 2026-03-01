import { NestFactory } from '@nestjs/core';
import {
  ExpressAdapter,
  NestExpressApplication,
} from '@nestjs/platform-express';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const express = require('express') as typeof import('express');
import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth';
import { AppModule } from './app.module';

async function bootstrap() {
  const server = express();

  // Enable CORS on the raw Express server BEFORE mounting BetterAuth
  // This ensures BetterAuth routes (/api/auth/*) get proper CORS headers
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
  server.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', corsOrigin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization',
    );
    res.header(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    );
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Mount BetterAuth BEFORE NestJS body parser
  // BetterAuth handles all /api/auth/* routes
  server.all('/api/auth/*path', toNodeHandler(auth));

  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(server),
    { bodyParser: false },
  );

  // Re-enable body parsing for NestJS routes
  app.useBodyParser('json');
  app.useBodyParser('urlencoded', { extended: true });

  // NestJS CORS for non-BetterAuth routes (NestJS controllers)
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  await app.listen(process.env.PORT || 4000);
}

bootstrap();
