import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'clothme-real-api',
    };
  }

  @Get()
  root() {
    return {
      name: 'ClothMe Real-time API',
      version: '0.1.0',
      description: 'WebSocket server for real-time features',
      documentation: '/api',
    };
  }
}
