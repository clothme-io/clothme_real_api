import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { AuthService } from './auth.service';

@Injectable()
export class WebSocketAuthGuard implements CanActivate {
  private readonly logger = new Logger(WebSocketAuthGuard.name);

  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient();
      const token = this.authService.extractToken(client);

      if (!token) {
        this.logger.warn(`Client ${client.id} attempted connection without token`);
        throw new WsException('Authentication token not found');
      }

      // Verify the token and get the payload
      const payload = await this.authService.verifyToken(token);
      
      // Store user data in socket for later use
      client.data.user = payload;
      
      this.logger.debug(`Client ${client.id} authenticated as user ${payload.userId}`);
      return true;
    } catch (error) {
      this.logger.error(`Authentication failed: ${error.message}`);
      throw new WsException('Unauthorized');
    }
  }
}
