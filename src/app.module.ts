import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { RedisModule } from './shared/redis/redis.module';
import { RabbitMQModule } from './shared/rabbitmq/rabbitmq.module';
import { AuthModule } from './shared/auth/auth.module';
import { InboxGatewayModule } from './gateways/inbox/inbox-gateway.module';
import { BullModule } from '@nestjs/bullmq';
import { RedisService } from './shared/redis/redis.service';

@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    RedisModule,
    BullModule.forRootAsync({
      useFactory: (redisService: RedisService) => ({
        connection: redisService.createRedisClient(),
      }),
      inject: [RedisService],
    }),
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
