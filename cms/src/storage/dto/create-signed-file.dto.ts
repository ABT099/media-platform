import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignUploadDto {
  @ApiProperty({
    description: 'Episode UUID - The ID of the episode this video belongs to',
    example: '223e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  episodeId: string;

  @ApiProperty({
    description: 'File name - The name of the video file to upload (e.g., episode-1.mp4)',
    example: 'episode-1.mp4',
    minLength: 1,
  })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({
    description:
      'Content type - The MIME type of the video file (e.g., video/mp4, video/webm, video/quicktime)',
    example: 'video/mp4',
    examples: {
      mp4: { value: 'video/mp4', description: 'MP4 video format' },
      webm: { value: 'video/webm', description: 'WebM video format' },
      mov: { value: 'video/quicktime', description: 'QuickTime MOV format' },
    },
  })
  @IsString()
  @IsNotEmpty()
  contentType: string;
}
