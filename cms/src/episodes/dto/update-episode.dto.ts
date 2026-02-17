import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateEpisodeDto } from './create-episode.dto';
import { IsOptional, ValidateIf, IsDate } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateEpisodeDto extends PartialType(
  OmitType(CreateEpisodeDto, ['publicationDate'] as const),
) {
  @ApiPropertyOptional({
    description:
      'Publication date - When the episode should be published (ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ). Can be a future date to schedule publication, a past date to publish immediately, or null to cancel a scheduled publication. If not provided, the publication date will not be changed.',
    example: '2024-12-25T14:30:00.000Z',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((o) => o.publicationDate !== null)
  @IsDate()
  @Type(() => Date)
  publicationDate?: Date | null;
}
