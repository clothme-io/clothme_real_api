import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private redisClient: Redis;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    
    if (!redisUrl) {
      this.logger.warn('REDIS_URL not provided, using localhost:6379');
    }
    
    this.redisClient = new Redis(redisUrl || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        this.logger.log(`Redis connection retry in ${delay}ms`);
        return delay;
      },
    });

    this.redisClient.on('connect', () => {
      this.logger.log('Redis client connected');
    });

    this.redisClient.on('error', (error) => {
      this.logger.error(`Redis client error: ${error.message}`);
    });
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      await this.redisClient.quit();
      this.logger.log('Redis client disconnected');
    }
  }

  /**
   * Get Redis client instance
   */
  getClient(): Redis {
    return this.redisClient;
  }

  /**
   * Set user presence status
   */
  async setUserPresence(userId: string, status: 'online' | 'away' | 'offline'): Promise<void> {
    const key = `presence:${userId}`;
    await this.redisClient.set(key, status);
    
    // Set expiration for online/away status (24 hours)
    if (status !== 'offline') {
      await this.redisClient.expire(key, 86400);
    }
  }

  /**
   * Get user presence status
   */
  async getUserPresence(userId: string): Promise<string> {
    const key = `presence:${userId}`;
    const status = await this.redisClient.get(key);
    return status || 'offline';
  }

  /**
   * Store socket connection for a user
   */
  async addUserSocket(userId: string, socketId: string): Promise<void> {
    const key = `sockets:${userId}`;
    await this.redisClient.sadd(key, socketId);
    await this.redisClient.expire(key, 86400); // 24 hours
  }

  /**
   * Remove socket connection for a user
   */
  async removeUserSocket(userId: string, socketId: string): Promise<void> {
    const key = `sockets:${userId}`;
    await this.redisClient.srem(key, socketId);
  }

  /**
   * Get all socket connections for a user
   */
  async getUserSockets(userId: string): Promise<string[]> {
    const key = `sockets:${userId}`;
    return this.redisClient.smembers(key);
  }
}
