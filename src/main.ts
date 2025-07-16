import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';

// Custom Socket.IO adapter with proper configuration
class CustomIoAdapter extends IoAdapter {
  createIOServer(port: number, options?: any): any {
    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: process.env.FRONTEND_URL || '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      allowEIO3: true, // Allow Engine.IO v3 clients (like Postman)
      transports: ['websocket', 'polling'], // Support both WebSocket and polling
    });
    return server;
  }
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  
  // Get configuration service
  const configService = app.get(ConfigService);
  
  // Set global prefix
  app.setGlobalPrefix('api');
  
  // Set up validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  
  // Set up WebSocket adapter
  app.useWebSocketAdapter(new CustomIoAdapter(app));
  
  // Get port from environment or use default
  const port = configService.get<number>('PORT') || 5050;
  
  // Start the application - bind to all interfaces
  await app.listen(port, '0.0.0.0');
  logger.log(`Real-time API server is running on: ${await app.getUrl()}`);
}

bootstrap();
