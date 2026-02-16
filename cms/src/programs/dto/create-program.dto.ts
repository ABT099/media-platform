import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ProgramType {
  PODCAST = 'podcast',
  DOCUMENTARY = 'documentary',
  SERIES = 'series',
}

export class CreateProgramDto {
  @ApiProperty({ description: 'Program title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Program description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: ProgramType, description: 'Program type' })
  @IsEnum(ProgramType)
  @IsNotEmpty()
  type: ProgramType;

  @ApiProperty({
    description: 'Program category (e.g., Technology, Culture, Business)',
  })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ description: 'Program language (e.g., ar, en)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  language: string;

  @ApiPropertyOptional({ description: 'Cover image URL' })
  @IsString()
  @IsOptional()
  coverImageUrl?: string;
}
