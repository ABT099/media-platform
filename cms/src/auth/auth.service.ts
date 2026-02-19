import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from './users.repository';

export interface JwtPayload {
  sub: string;
  email: string;
  type: 'access';
}

export interface TokenResponse {
  accessToken: string;
  expiresIn: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
  ) { }

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
    );

    return {
      accessToken,
      expiresIn: '1d',
    };
  }
}
