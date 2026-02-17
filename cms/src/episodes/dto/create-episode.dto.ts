import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  IsDate,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateEpisodeDto {
  @ApiProperty({ description: 'Episode title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Episode description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Episode duration in seconds' })
  @IsInt()
  @Min(0)
  durationInSeconds: number;

  @ApiPropertyOptional({
    description: 'Publication date (ISO 8601 format: YYYY-MM-DDTHH:mm:ssZ)',
    example: '2024-02-17T14:30:00.000Z',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  publicationDate?: Date;

  @ApiProperty({ description: 'Media URL (video/audio)' })
  @IsString()
  mediaUrl: string;

  @ApiPropertyOptional({ description: 'Thumbnail URL' })
  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  @ApiProperty({ description: 'Episode number' })
  @IsInt()
  @Min(1)
  episodeNumber: number;

  @ApiPropertyOptional({ description: 'Season number' })
  @IsInt()
  @Min(1)
  @IsOptional()
  seasonNumber?: number;
}
