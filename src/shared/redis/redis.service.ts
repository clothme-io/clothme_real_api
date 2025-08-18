import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit {

  private readonly logger = new Logger(RedisService.name);
  private redisClient: Redis;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Initialize Redis client when the module is initialized
   */
  onModuleInit() {
    this.initializeRedisClient();
  }

  /**
   * Initialize the Redis client
   */
  private initializeRedisClient(): void {
    const redisUrlFromEnv = this.configService.get<string>('REDIS_URL');
    if (!redisUrlFromEnv) {
      this.logger.error('REDIS_URL environment variable is not defined');
      throw new Error('REDIS_URL environment variable is not defined');
    }

    const options = {
      maxRetriesPerRequest: null,
    };

    this.logger.log('Initializing Redis client...');
    
    try {
      const redis = new Redis(redisUrlFromEnv + '?family=0', options);

      redis.on('error', (err) => {
        this.logger.error(`Redis client error: ${err.message}`, err.stack);
      });

      redis.on('connect', () => {
        this.logger.log('Successfully connected to Redis.');
      });

      redis.on('ready', () => {
        this.logger.log('Redis client is ready to use.');
      });

      redis.on('close', () => {
        this.logger.log('Connection to Redis closed.');
      });

      redis.on('reconnecting', (delay) => {
        this.logger.log(`Redis client reconnecting in ${delay}ms...`);
      });

      redis.on('end', () => {
        this.logger.log('Redis client connection has ended. No more reconnections will be attempted.');
      });
      
      this.redisClient = redis;
    } catch (error) {
      this.logger.error(`Failed to initialize Redis client: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Returns the existing Redis client or creates a new one if it doesn't exist
   */
  public createRedisClient(): Redis {
    if (!this.redisClient) {
      this.logger.log('Redis client not initialized, creating a new one');
      this.initializeRedisClient();
    }
    return this.redisClient;
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
