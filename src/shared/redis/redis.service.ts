import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService {

  private readonly logger = new Logger(RedisService.name);
  private redisClient: Redis;

  constructor(private readonly configService: ConfigService) {}

  public createRedisClient(): Redis {

    const redisUrlFromEnv = this.configService.get<string>('REDIS_URL');

    const options = {
      maxRetriesPerRequest: null,
    };

    const redis = new Redis(redisUrlFromEnv + '?family=0', options);

    redis.on('error', (err) => {
      console.error('Redis client error:', err);
      // Depending on your app's needs, you might want to handle errors more gracefully,
      // e.g., by attempting to reconnect or by flagging the service as unhealthy.
    });

    redis.on('connect', () => {
      console.log('Successfully connected to Redis.');
    });

    redis.on('ready', () => {
      console.log('Redis client is ready to use.');
    });

    redis.on('close', () => {
      console.log('Connection to Redis closed.');
    });

    redis.on('reconnecting', (delay) => {
      console.log(`Redis client reconnecting in ${delay}ms...`);
    });

    redis.on('end', () => {
      console.log('Redis client connection has ended. No more reconnections will be attempted.');
    });
    
    this.redisClient = redis;

    return redis;
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
