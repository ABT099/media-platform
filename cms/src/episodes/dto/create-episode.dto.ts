import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  IsDate,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsFutureDate } from '../validators/is-future-date.validator';

export class CreateEpisodeDto {
  @ApiProperty({
    description: 'Episode title - The name of the episode',
    example: 'كيف تنجح العلاقات مع ياسر الحزيمي',
    minLength: 1,
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    description: 'Episode description - A detailed description of the episode content',
    example: 'حلقة مع ياسر الحزيمي حول أسرار النجاح في العلاقات الشخصية',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Episode duration in seconds - The total length of the episode video',
    example: 3600,
    minimum: 0,
    type: Number,
  })
  @IsInt()
  @Min(0)
  durationInSeconds: number;

  @ApiPropertyOptional({
    description:
      'Publication date - When the episode should be published (ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ). Must be a future date for scheduling. If provided, the episode will be automatically published at this time once the video is uploaded. If not provided, the episode will remain in draft status until manually published or until a video is uploaded (which will publish it immediately).',
    example: '2024-12-25T14:30:00.000Z',
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @IsDate()
  @IsFutureDate({ message: 'Publication date must be in the future for scheduling' })
  @Type(() => Date)
  publicationDate?: Date;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description:
      'Thumbnail image file - JPEG or PNG format, maximum 5MB. The image will be uploaded to S3 and the URL will be stored automatically.',
  })
  @IsOptional()
  thumbnail?: any;

  @ApiProperty({
    description: 'Episode number - The sequential number of this episode within the program/season',
    example: 1,
    minimum: 1,
    type: Number,
  })
  @IsInt()
  @Min(1)
  episodeNumber: number;

  @ApiPropertyOptional({
    description:
      'Season number - The season this episode belongs to. Required for series, optional for podcasts/documentaries.',
    example: 1,
    minimum: 1,
    type: Number,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  seasonNumber?: number;

  @ApiPropertyOptional({
    description: 'Extra info - flexible key-value metadata (JSON object)',
    example: { director: 'Name', location: 'Riyadh' },
  })
  @IsObject()
  @IsOptional()
  extraInfo?: Record<string, unknown>;
}
