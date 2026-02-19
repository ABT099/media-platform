import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { StorageService } from './storage.service';
import { SignUploadDto } from './dto/create-signed-file.dto';

@ApiTags('upload')
@ApiBearerAuth()
@Controller('upload')
export class UploadController {
  constructor(private readonly storageService: StorageService) {}

  @Post('sign-video')
  @ApiOperation({
    summary: 'Generate presigned URL for video upload (fallback / replacement)',
    description:
      `Generates a presigned S3 URL that allows direct upload of large video files to S3. The URL is valid for 1 hour.
This endpoint serves as a fallback when the presigned URL returned by POST /programs/:programId/episodes has expired,
or when you need to upload a replacement video for an existing episode with a custom fileName and contentType.
After uploading to S3, the system will automatically detect the upload via SQS and update the episode accordingly:
if no publicationDate is set the episode will be published immediately; if a future publicationDate exists, it will be scheduled.`
  })
  @ApiBody({
    type: SignUploadDto,
    description: 'Video upload request details',
    examples: {
      'expired-url': {
        summary: 'Re-request after expired presigned URL',
        description:
          'The presigned URL from episode creation expired (1 hour). Request a fresh one.',
        value: {
          episodeId: '223e4567-e89b-12d3-a456-426614174000',
          fileName: 'episode-1.mp4',
          contentType: 'video/mp4',
        },
      },
      'replace-video': {
        summary: 'Replace existing video with a new file',
        description:
          'Upload a different video file to an episode that already has a video.',
        value: {
          episodeId: '223e4567-e89b-12d3-a456-426614174000',
          fileName: 'episode-1-v2.mp4',
          contentType: 'video/mp4',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Presigned URL generated successfully',
    schema: {
      example: {
        uploadUrl:
          'https://s3.amazonaws.com/bucket/episodes/223e4567-e89b-12d3-a456-426614174000/episode-1.mp4?X-Amz-Algorithm=...',
        fileKey: 'episodes/223e4567-e89b-12d3-a456-426614174000/episode-1.mp4',
        publicUrl:
          'https://cdn.example.com/episodes/223e4567-e89b-12d3-a456-426614174000/episode-1.mp4',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input - validation failed',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'episodeId must be a UUID',
          'fileName should not be empty',
          'contentType should not be empty',
        ],
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Episode not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Episode with ID 223e4567-e89b-12d3-a456-426614174000 not found',
        error: 'Not Found',
      },
    },
  })
  async signVideo(@Body() dto: SignUploadDto) {
    return this.storageService.generatePresignedUrl(
      dto.episodeId,
      dto.fileName,
      dto.contentType,
    );
  }
}
