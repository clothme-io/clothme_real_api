import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface JwtPayload {
  userId: string;
  accountId?: string;
  [key: string]: any;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly jwtService: JwtService) {}

  /**
   * Verify JWT token and extract payload
   */
  async verifyToken(token: string): Promise<JwtPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      
      // Ensure required fields are present
      if (!payload.userId) {
        throw new UnauthorizedException('Invalid token payload: missing userId');
      }
      
      return payload;
    } catch (error) {
      this.logger.error(`Token verification failed: ${error.message}`);
      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * Extract token from various sources (header, query param)
   */
  extractToken(request: any): string | null {
    // From Authorization header
    if (request.handshake?.headers?.authorization) {
      const authHeader = request.handshake.headers.authorization;
      const [type, token] = authHeader.split(' ');
      if (type === 'Bearer' && token) {
        return token;
      }
    }
    
    // From query parameter
    if (request.handshake?.query?.token) {
      return request.handshake.query.token;
    }
    
    // From auth data if already processed
    if (request.handshake?.auth?.token) {
      return request.handshake.auth.token;
    }
    
    return null;
  }
}
