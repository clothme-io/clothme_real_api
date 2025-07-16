import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { RedisModule } from './shared/redis/redis.module';
import { RabbitMQModule } from './shared/rabbitmq/rabbitmq.module';
import { AuthModule } from './shared/auth/auth.module';
import { InboxGatewayModule } from './gateways/inbox/inbox-gateway.module';

@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
    // Shared modules
    RedisModule,
    RabbitMQModule.forRoot(), // This registers the global RabbitMQ module
    AuthModule,
    
    // Gateway modules
    InboxGatewayModule,
    // ChatGatewayModule,
    // PresenceGatewayModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
