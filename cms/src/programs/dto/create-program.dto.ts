import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ProgramType {
  PODCAST = 'podcast',
  DOCUMENTARY = 'documentary',
  SERIES = 'series',
}

export enum Language {
  ARABIC = 'ar',
  ENGLISH = 'en',
}

export class CreateProgramDto {
  @ApiProperty({ description: 'Program title', example: 'فنجان' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Program description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Program type',
    enum: ProgramType,
    enumName: 'ProgramType',
    example: ProgramType.PODCAST,
  })
  @IsEnum(ProgramType)
  @IsNotEmpty()
  type: ProgramType;

  @ApiProperty({
    description: 'Program category',
    example: 'Culture',
  })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({
    description: 'Program language (ISO 639-1)',
    enum: Language,
    enumName: 'Language',
    example: Language.ARABIC,
  })
  @IsEnum(Language)
  @IsNotEmpty()
  language: Language;

  @ApiPropertyOptional({ description: 'Cover image URL' })
  @IsString()
  @IsOptional()
  coverImageUrl?: string;
}
