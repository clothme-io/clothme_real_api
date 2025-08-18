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
      imports: [RedisModule],
      useFactory: (redisService: RedisService) => {
        try {
          return {
            connection: redisService.getClient(),
            // Add additional BullMQ options for better reliability
            defaultJobOptions: {
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 1000,
              },
              removeOnComplete: true,
              removeOnFail: false,
            },
          };
        } catch (error) {
          console.error('Failed to initialize BullMQ:', error);
          throw error;
        }
      },
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
