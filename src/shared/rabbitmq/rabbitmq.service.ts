import { Injectable, Logger } from '@nestjs/common';
import { AmqpConnection, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Server } from 'socket.io';
import { WebSocketServer } from '@nestjs/websockets';

@Injectable()
export class RabbitMQService {
  private readonly logger = new Logger(RabbitMQService.name);
  
  @WebSocketServer() server: Server;
  
  constructor(private readonly amqpConnection: AmqpConnection) {}

  /**
   * Publish a message to RabbitMQ
   */
  async publish(exchange: string, routingKey: string, message: any): Promise<void> {
    try {
      await this.amqpConnection.publish(exchange, routingKey, message);
      this.logger.debug(`Published message to ${exchange}.${routingKey}`);
    } catch (error) {
      this.logger.error(`Failed to publish message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Subscribe to inbox notifications
   */
  @RabbitSubscribe({
    exchange: 'clothme.notifications',
    routingKey: 'inbox.*',
    queue: 'realtime-inbox-notifications',
  })
  async handleInboxNotification(message: any): Promise<void> {
    this.logger.debug(`Received inbox notification: ${JSON.stringify(message)}`);
    
    try {
      // Extract user ID from the message
      const { userId, type, data } = message;
      
      if (!userId) {
        this.logger.warn('Received notification without userId');
        return;
      }
      
      // Emit to the user's room
      this.server.to(`user_${userId}`).emit('notification', {
        type,
        data,
        timestamp: new Date().toISOString(),
      });
      
      this.logger.debug(`Emitted notification to user_${userId}`);
    } catch (error) {
      this.logger.error(`Error processing notification: ${error.message}`);
    }
  }

  /**
   * Subscribe to chat messages
   */
  @RabbitSubscribe({
    exchange: 'clothme.notifications',
    routingKey: 'chat.*',
    queue: 'realtime-chat-messages',
  })
  async handleChatMessage(message: any): Promise<void> {
    this.logger.debug(`Received chat message: ${JSON.stringify(message)}`);
    
    try {
      // Extract recipient ID from the message
      const { recipientId, senderId, conversationId, content } = message;
      
      if (!recipientId) {
        this.logger.warn('Received chat message without recipientId');
        return;
      }
      
      // Emit to the recipient's room
      this.server.to(`user_${recipientId}`).emit('chat_message', {
        senderId,
        conversationId,
        content,
        timestamp: new Date().toISOString(),
      });
      
      this.logger.debug(`Emitted chat message to user_${recipientId}`);
    } catch (error) {
      this.logger.error(`Error processing chat message: ${error.message}`);
    }
  }

  /**
   * Subscribe to presence updates
   */
  @RabbitSubscribe({
    exchange: 'clothme.notifications',
    routingKey: 'presence.*',
    queue: 'realtime-presence-updates',
  })
  async handlePresenceUpdate(message: any): Promise<void> {
    this.logger.debug(`Received presence update: ${JSON.stringify(message)}`);
    
    try {
      // Extract user ID and status from the message
      const { userId, status } = message;
      
      if (!userId || !status) {
        this.logger.warn('Received presence update without userId or status');
        return;
      }
      
      // Broadcast to all connected clients
      this.server.emit('presence_update', {
        userId,
        status,
        timestamp: new Date().toISOString(),
      });
      
      this.logger.debug(`Broadcasted presence update for user ${userId}`);
    } catch (error) {
      this.logger.error(`Error processing presence update: ${error.message}`);
    }
  }
}
