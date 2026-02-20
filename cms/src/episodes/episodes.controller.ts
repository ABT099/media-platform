import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ValidationPipe,
  ParseIntPipe,
  DefaultValuePipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { EpisodesService } from './episodes.service';
import { PublicationService } from './publication.service';
import { CreateEpisodeDto } from './dto/create-episode.dto';
import { UpdateEpisodeDto } from './dto/update-episode.dto';

@ApiTags('episodes')
@ApiBearerAuth()
@Controller()
export class EpisodesController {
  constructor(
    private readonly episodesService: EpisodesService,
    private readonly publicationService: PublicationService,
  ) {}

  @Post('programs/:programId/episodes')
  @ApiOperation({
    summary: 'Create a new episode under a program',
    description:
      'Creates a new episode for a specific program. Optionally upload a thumbnail image file. If a future publicationDate is provided, the episode will be scheduled for automatic publication once the video is uploaded. Otherwise, it will be created with status "draft" and uploading a video will publish it immediately. The response always includes an "upload" object with a presigned S3 URL (valid for 1 hour) so the frontend can start uploading the video right away. If the presigned URL expires before the upload completes, use POST /upload/sign-video to request a new one.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateEpisodeDto })
  @UseInterceptors(FileInterceptor('thumbnail'))
  @ApiParam({
    name: 'programId',
    description: 'Program UUID',
  })
  @ApiResponse({
    status: 201,
    description:
      'Episode created successfully. Includes a presigned S3 upload URL valid for 1 hour.',
    schema: {
      example: {
        id: '223e4567-e89b-12d3-a456-426614174000',
        title: 'Episode 1: Introduction',
        description: 'The first episode of the series',
        programId: '123e4567-e89b-12d3-a456-426614174000',
        durationInSeconds: 3600,
        episodeNumber: 1,
        seasonNumber: 1,
        thumbnailUrl: 'https://cdn.example.com/thumbnails/uuid-thumb.jpg',
        status: 'draft',
        videoUrl: null,
        publicationDate: '2024-02-17T14:30:00.000Z',
        createdAt: '2024-02-17T14:30:00.000Z',
        updatedAt: '2024-02-17T14:30:00.000Z',
        upload: {
          uploadUrl:
            'https://s3.amazonaws.com/bucket/episodes/223e4567-e89b-12d3-a456-426614174000/original?X-Amz-Algorithm=...',
          fileKey:
            'episodes/223e4567-e89b-12d3-a456-426614174000/original',
          publicUrl:
            'https://cdn.example.com/episodes/223e4567-e89b-12d3-a456-426614174000/original',
        },
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
          'title should not be empty',
          'durationInSeconds must be a positive integer',
          'episodeNumber must be at least 1',
        ],
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Program not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Program with ID 123e4567-e89b-12d3-a456-426614174000 not found',
        error: 'Not Found',
      },
    },
  })
  create(
    @Param('programId') programId: string,
    @Body(ValidationPipe) createEpisodeDto: CreateEpisodeDto,
    @UploadedFile() thumbnail?: Express.Multer.File,
  ) {
    return this.episodesService.create(programId, createEpisodeDto, thumbnail);
  }

  @Get('programs/:programId/episodes')
  @ApiOperation({
    summary: 'Get all episodes for a program (paginated)',
    description:
      'Retrieves a paginated list of all episodes for a specific program. Episodes are ordered by season number and episode number (ascending). Supports filtering by status and publication date range.',
  })
  @ApiParam({
    name: 'programId',
    description: 'Program UUID',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Page number (starts at 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
    description: 'Number of items per page (default: 10)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['draft', 'scheduled', 'published'],
    description: 'Filter by episode status',
  })
  @ApiQuery({
    name: 'publishedAfter',
    required: false,
    type: String,
    format: 'date-time',
    description: 'Filter episodes published after this date (ISO 8601)',
  })
  @ApiQuery({
    name: 'publishedBefore',
    required: false,
    type: String,
    format: 'date-time',
    description: 'Filter episodes published before this date (ISO 8601)',
  })
  @ApiResponse({
    status: 200,
    description: 'Episodes retrieved successfully',
    schema: {
      example: {
        items: [
          {
            id: '223e4567-e89b-12d3-a456-426614174000',
            title: 'Episode 1',
            episodeNumber: 1,
            seasonNumber: 1,
            durationInSeconds: 3600,
            thumbnailUrl: 'https://cdn.example.com/thumbnails/uuid-thumb.jpg',
            status: 'published',
          },
        ],
        total: 15,
        page: 1,
        limit: 10,
        totalPages: 2,
      },
    },
  })
  findAll(
    @Param('programId') programId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('status') status?: 'draft' | 'scheduled' | 'published',
    @Query('publishedAfter') publishedAfter?: string,
    @Query('publishedBefore') publishedBefore?: string,
  ) {
    return this.episodesService.findAll(
      programId,
      page,
      limit,
      status,
      publishedAfter ? new Date(publishedAfter) : undefined,
      publishedBefore ? new Date(publishedBefore) : undefined,
    );
  }

  @Get('episodes/:id')
  @ApiOperation({
    summary: 'Get a single episode by ID',
    description: 'Retrieves detailed information about a specific episode by its UUID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Episode UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Episode retrieved successfully',
    schema: {
      example: {
        id: '223e4567-e89b-12d3-a456-426614174000',
        title: 'Episode 1: Introduction',
        description: 'The first episode of the series',
        programId: '123e4567-e89b-12d3-a456-426614174000',
        durationInSeconds: 3600,
        episodeNumber: 1,
        seasonNumber: 1,
        thumbnailUrl: 'https://cdn.example.com/thumbnails/uuid-thumb.jpg',
        videoUrl: 'https://cdn.example.com/episodes/uuid/episode.mp4',
        status: 'published',
        publicationDate: '2024-02-17T14:30:00.000Z',
        createdAt: '2024-02-17T14:30:00.000Z',
        updatedAt: '2024-02-17T14:30:00.000Z',
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
  findOne(@Param('id') id: string) {
    return this.episodesService.findOne(id);
  }

  @Patch('episodes/:id')
  @ApiOperation({
    summary: 'Update an episode',
    description:
      'Updates an existing episode. All fields are optional. Only provided fields will be updated. Optionally upload a new thumbnail image file to replace the existing one. If publicationDate is updated to a future date, the episode will be scheduled. If set to null, any scheduled publication will be cancelled. If set to a past date and the episode has a video, it will be published immediately.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UpdateEpisodeDto })
  @UseInterceptors(FileInterceptor('thumbnail'))
  @ApiParam({
    name: 'id',
    description: 'Episode UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Episode updated successfully',
    schema: {
      example: {
        id: '223e4567-e89b-12d3-a456-426614174000',
        title: 'Episode 1: Updated Title',
        description: 'Updated description',
        programId: '123e4567-e89b-12d3-a456-426614174000',
        durationInSeconds: 3600,
        episodeNumber: 1,
        seasonNumber: 1,
        thumbnailUrl: 'https://cdn.example.com/thumbnails/uuid-thumb.jpg',
        videoUrl: 'https://cdn.example.com/episodes/uuid/episode.mp4',
        status: 'published',
        publicationDate: '2024-02-17T14:30:00.000Z',
        createdAt: '2024-02-17T14:30:00.000Z',
        updatedAt: '2024-02-18T10:15:00.000Z',
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
          'durationInSeconds must be a positive integer',
          'episodeNumber must be at least 1',
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
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateEpisodeDto: UpdateEpisodeDto,
    @UploadedFile() thumbnail?: Express.Multer.File,
  ) {
    return this.episodesService.update(id, updateEpisodeDto, thumbnail);
  }

  @Delete('episodes/:id')
  @ApiOperation({
    summary: 'Delete an episode',
    description:
      'Permanently deletes an episode. This action cannot be undone. The episode will also be removed from search indexes.',
  })
  @ApiParam({
    name: 'id',
    description: 'Episode UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Episode deleted successfully',
    schema: {
      example: {
        message: 'Episode deleted successfully',
        id: '223e4567-e89b-12d3-a456-426614174000',
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
  remove(@Param('id') id: string) {
    return this.episodesService.remove(id);
  }

  @Patch('episodes/:id/cancel-schedule')
  @ApiOperation({
    summary: 'Cancel scheduled publication',
    description:
      'Cancels a scheduled publication for an episode. The episode status will be changed to "draft" and the publication date will be cleared.',
  })
  @ApiParam({
    name: 'id',
    description: 'Episode UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Scheduled publication cancelled successfully',
    schema: {
      example: {
        id: '223e4567-e89b-12d3-a456-426614174000',
        title: 'Episode 1',
        status: 'draft',
        publicationDate: null,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Episode is not scheduled',
    schema: {
      example: {
        statusCode: 400,
        message: 'Episode is not scheduled for publication',
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
  cancelSchedule(@Param('id') id: string) {
    return this.publicationService.cancelSchedule(id);
  }
}
