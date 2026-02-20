import { IsString, IsNotEmpty, IsOptional, IsDate, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsFutureDate } from '../validators/is-future-date.validator';
import { IsIntFormData } from '../validators/is-int.validator';

export class CreateEpisodeDto {
  @ApiProperty({ example: 'كيف تنجح العلاقات مع ياسر الحزيمي' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'حلقة مع ياسر الحزيمي حول أسرار النجاح في العلاقات الشخصية' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 3600, minimum: 0, type: Number })
  @IsIntFormData(0)
  durationInSeconds: number;

  @ApiPropertyOptional({ example: '2024-12-25T14:30:00.000Z', type: String, format: 'date-time' })
  @IsOptional()
  @IsDate()
  @IsFutureDate({ message: 'Publication date must be in the future for scheduling' })
  @Type(() => Date)
  publicationDate?: Date;

  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  @IsOptional()
  thumbnail?: any;

  @ApiProperty({ example: 1, minimum: 1, type: Number })
  @IsIntFormData(1)
  episodeNumber: number;

  @ApiPropertyOptional({ example: 1, minimum: 1, type: Number })
  @IsOptional()
  @IsIntFormData(1)
  seasonNumber?: number;

  @ApiPropertyOptional({ example: { director: 'Name', location: 'Riyadh' } })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    return typeof value === 'string' ? JSON.parse(value) : value;
  })
  @IsObject({ message: 'extraInfo must be an object' })
  extraInfo?: Record<string, unknown>;
}