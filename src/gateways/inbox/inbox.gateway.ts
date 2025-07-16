import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { UseGuards, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WebSocketAuthGuard } from '../../shared/auth/websocket-auth.guard';
import { RedisService } from '../../shared/redis/redis.service';
import { RabbitMQService } from '../../shared/rabbitmq/rabbitmq.service';

// DTOs
class JoinRoomDto {
  userId: string;
}

class SendNotificationDto {
  userId: string;
  type: string;
  data: any;
}

@WebSocketGateway({
  namespace: 'inbox',
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class InboxGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(InboxGateway.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Inbox WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      // Authentication is handled by the guard on the join room event
      this.logger.log(`Client connected: ${client.id}`);
      
      // Send welcome message
      client.emit('connection_status', {
        status: 'connected',
        message: 'Connected to inbox namespace. Please join a room to receive notifications.',
        clientId: client.id,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Error handling connection: ${error.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    try {
      this.logger.log(`Client disconnected: ${client.id}`);
      
      // Clean up if user data exists
      if (client.data?.user?.userId) {
        const userId = client.data.user.userId;
        
        // Remove socket from Redis
        await this.redisService.removeUserSocket(userId, client.id);
        
        // Check if user has other active connections
        const activeSockets = await this.redisService.getUserSockets(userId);
        
        if (!activeSockets.length) {
          // Update presence status if this was the last connection
          await this.redisService.setUserPresence(userId, 'offline');
          
          // Publish presence update to RabbitMQ
          await this.rabbitMQService.publish('clothme.notifications', 'presence.update', {
            userId,
            status: 'offline',
          });
        }
      }
    } catch (error) {
      this.logger.error(`Error handling disconnect: ${error.message}`);
    }
  }

  @UseGuards(WebSocketAuthGuard)
  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinRoomDto,
  ) {
    try {
      const { userId } = data;
      
      // Verify user is joining their own room
      if (userId !== client.data.user?.userId) {
        return {
          status: 'error',
          message: 'Unauthorized to join this room',
        };
      }
      
      // Join the room
      await client.join(`user_${userId}`);
      
      // Store socket connection in Redis
      await this.redisService.addUserSocket(userId, client.id);
      
      // Update presence status
      await this.redisService.setUserPresence(userId, 'online');
      
      // Publish presence update to RabbitMQ
      await this.rabbitMQService.publish('clothme.notifications', 'presence.update', {
        userId,
        status: 'online',
      });
      
      this.logger.log(`User ${userId} joined room user_${userId}`);
      
      return {
        status: 'success',
        message: `Joined room for user ${userId}`,
      };
    } catch (error) {
      this.logger.error(`Error joining room: ${error.message}`);
      return {
        status: 'error',
        message: 'Failed to join room',
        error: error.message,
      };
    }
  }

  @UseGuards(WebSocketAuthGuard)
  @SubscribeMessage('send_notification')
  async handleSendNotification(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SendNotificationDto,
  ) {
    try {
      const { userId, type, data: notificationData } = data;
      
      // Publish notification to RabbitMQ
      await this.rabbitMQService.publish('clothme.notifications', 'inbox.notification', {
        userId,
        type,
        data: notificationData,
        senderId: client.data.user?.userId,
      });
      
      this.logger.log(`Notification sent to user ${userId}`);
      
      return {
        status: 'success',
        message: 'Notification sent',
      };
    } catch (error) {
      this.logger.error(`Error sending notification: ${error.message}`);
      return {
        status: 'error',
        message: 'Failed to send notification',
        error: error.message,
      };
    }
  }

  @UseGuards(WebSocketAuthGuard)
  @SubscribeMessage('get_unread_count')
  async handleGetUnreadCount(@ConnectedSocket() client: Socket) {
    try {
      const userId = client.data.user?.userId;
      
      if (!userId) {
        return {
          status: 'error',
          message: 'User not authenticated',
        };
      }
      
      // In a real implementation, you would fetch this from a database
      // For now, we'll return a mock count
      const unreadCount = Math.floor(Math.random() * 10);
      
      return {
        status: 'success',
        data: {
          unreadCount,
        },
      };
    } catch (error) {
      this.logger.error(`Error getting unread count: ${error.message}`);
      return {
        status: 'error',
        message: 'Failed to get unread count',
        error: error.message,
      };
    }
  }
}
