import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'User email',
    example: 'demo@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Password',
    example: 'demo-password',
    minLength: 1,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  password: string;
}
