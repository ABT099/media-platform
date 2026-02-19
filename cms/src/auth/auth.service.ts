import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { UsersRepository } from './users.repository';

export interface JwtPayload {
  sub: string;
  email: string;
  type: 'access';
}

export interface RefreshPayload {
  sub: string;
  email: string;
  type: 'refresh';
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(email: string, password: string): Promise<TokenResponse> {
    const user = await this.usersRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email, type: 'access' },
      { expiresIn: '15m' } as any,
    );

    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    if (!refreshSecret) {
      throw new Error('JWT_REFRESH_SECRET is required');
    }
    const refreshToken = jwt.sign(
      { sub: user.id, email: user.email, type: 'refresh' },
      refreshSecret,
      { expiresIn: '7d' } as jwt.SignOptions,
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: '15m',
    };
  }

  async refresh(refreshToken: string): Promise<Omit<TokenResponse, 'refreshToken'>> {
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    if (!refreshSecret) {
      throw new Error('JWT_REFRESH_SECRET is required');
    }
    let decoded: RefreshPayload;
    try {
      decoded = jwt.verify(refreshToken, refreshSecret) as RefreshPayload;
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    if (decoded.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersRepository.findById(decoded.sub);
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email, type: 'access' },
      { expiresIn: '15m' } as any,
    );

    return {
      accessToken,
      expiresIn: '15m',
    };
  }
}
