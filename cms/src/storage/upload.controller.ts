import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { StorageService } from './storage.service';
import { SignUploadDto } from './dto/create-signed-file.dto';

@ApiTags('upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly storageService: StorageService) {}

  @Post('sign-video')
  @ApiOperation({
    summary: 'Generate presigned URL for video upload',
    description:
      'Generates a presigned S3 URL that allows direct upload of large video files to S3. The URL is valid for 1 hour. Can be used for both initial video uploads and video replacements. After uploading to S3, the system will automatically detect the upload and update the episode status to "published". To replace an existing video, call this endpoint again with the same episodeId to get a new presigned URL.',
  })
  @ApiBody({
    type: SignUploadDto,
    description: 'Video upload request details',
    examples: {
      example1: {
        summary: 'Upload MP4 video',
        value: {
          episodeId: '223e4567-e89b-12d3-a456-426614174000',
          fileName: 'episode-1.mp4',
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
