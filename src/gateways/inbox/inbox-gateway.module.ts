import { Module } from '@nestjs/common';
import { AuthModule } from '../../shared/auth/auth.module';
import { RedisModule } from '../../shared/redis/redis.module';
import { InboxGateway } from './inbox.gateway';

@Module({
  imports: [
    AuthModule,
    RedisModule,
  ],
  providers: [InboxGateway],
  exports: [InboxGateway],
})
export class InboxGatewayModule {}
