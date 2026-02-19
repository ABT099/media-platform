import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { DatabaseModule } from '../database/database.module';
import { UsersRepository } from './users.repository';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    DatabaseModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const secret = configService.getOrThrow<string>('JWT_SECRET');
        return {
          secret,
          signOptions: { expiresIn: '15m' },
        } as JwtModuleOptions;
      },
    }),
  ],
  controllers: [AuthController],
  providers: [UsersRepository, AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
