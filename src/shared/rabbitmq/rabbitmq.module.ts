import { Module, DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RabbitMQModule as NestRabbitMQModule, MessageHandlerErrorBehavior } from '@golevelup/nestjs-rabbitmq';
import { RabbitMQService } from './rabbitmq.service';

@Module({
  providers: [RabbitMQService],
  exports: [RabbitMQService]
})
export class RabbitMQModule {
  static forRoot(): DynamicModule {
    return {
      module: RabbitMQModule,
      global: true, // Make the module global so it's available everywhere
      imports: [
        NestRabbitMQModule.forRootAsync(NestRabbitMQModule, {
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: async (configService: ConfigService) => {
            // Get the RabbitMQ URL from environment variables
            const rabbitMqUrl = configService.get<string>('RABBITMQ_URL');
            console.log(`Connecting to RabbitMQ at: ${rabbitMqUrl || 'default URL'}`); // Log the URL (without sensitive parts)
            
            if (!rabbitMqUrl) {
              console.warn('RABBITMQ_URL not set. Using default localhost connection.');
            }
            
            return {
              exchanges: [
                {
                  name: 'clothme.events',
                  type: 'topic',
                },
                {
                  name: 'clothme.notifications',
                  type: 'fanout',
                },
              ],
              uri: rabbitMqUrl || 'amqp://guest:guest@localhost:5672',
              connectionInitOptions: { wait: true, timeout: 30000 },
              enableControllerDiscovery: true,
              defaultRpcTimeout: 15000,
              defaultSubscribeErrorBehavior: MessageHandlerErrorBehavior.ACK,
            };
          },
        }),
      ],
      providers: [RabbitMQService],
      exports: [RabbitMQService, NestRabbitMQModule],
    };
  }
}
