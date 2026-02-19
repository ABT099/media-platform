import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService, type TokenResponse } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Public } from './decorators/public.decorator';

@ApiTags('auth')
@Controller('auth')
@Public()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login', description: 'Authenticate with email and password. Returns access and refresh tokens.' })
  @ApiBody({
    type: LoginDto,
    examples: {
      demo: {
        summary: 'Demo account',
        value: { email: 'demo@example.com', password: 'demo' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
        expiresIn: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  async login(@Body() dto: LoginDto): Promise<TokenResponse> {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh token', description: 'Exchange a valid refresh token for a new access token.' })
  @ApiResponse({
    status: 200,
    description: 'New access token',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        expiresIn: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }
}
