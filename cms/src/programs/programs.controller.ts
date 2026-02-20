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
import { ProgramsService } from './programs.service';
import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';

@ApiTags('programs')
@ApiBearerAuth()
@Controller('programs')
export class ProgramsController {
  constructor(private readonly programsService: ProgramsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new program',
    description:
      'Creates a new program (podcast, documentary, or series). Optionally upload a cover image file. The cover image will be uploaded to S3 and the URL will be stored automatically.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateProgramDto })
  @UseInterceptors(FileInterceptor('coverImage'))
  @ApiResponse({
    status: 201,
    description: 'Program created successfully',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'فنجان',
        description: 'A cultural podcast',
        type: 'podcast',
        category: 'Culture',
        language: 'ar',
        coverImageUrl: 'https://cdn.example.com/thumbnails/uuid-cover.jpg',
        createdAt: '2024-02-17T14:30:00.000Z',
        updatedAt: '2024-02-17T14:30:00.000Z',
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
          'type must be one of: podcast, documentary, series',
        ],
        error: 'Bad Request',
      },
    },
  })
  create(
    @Body(ValidationPipe) createProgramDto: CreateProgramDto,
    @UploadedFile() coverImage?: Express.Multer.File,
  ) {
    return this.programsService.create(createProgramDto, coverImage);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all programs (paginated)',
    description:
      'Retrieves a paginated list of all programs. Results are ordered by creation date (newest first).',
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
  @ApiResponse({
    status: 200,
    description: 'Programs retrieved successfully',
    schema: {
      example: {
        items: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            title: 'فنجان',
            description: 'A cultural podcast',
            type: 'podcast',
            category: 'Culture',
            language: 'ar',
            coverImageUrl: 'https://cdn.example.com/thumbnails/uuid-cover.jpg',
            createdAt: '2024-02-17T14:30:00.000Z',
            updatedAt: '2024-02-17T14:30:00.000Z',
          },
        ],
        total: 25,
        page: 1,
        limit: 10,
        totalPages: 3,
      },
    },
  })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.programsService.findAll(page, limit);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a program by ID with its episodes',
    description:
      'Retrieves a single program by its UUID, including all associated episodes ordered by season and episode number.',
  })
  @ApiParam({
    name: 'id',
    description: 'Program UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Program retrieved successfully',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'فنجان',
        description: 'A cultural podcast',
        type: 'podcast',
        category: 'Culture',
        language: 'ar',
        coverImageUrl: 'https://cdn.example.com/thumbnails/uuid-cover.jpg',
        createdAt: '2024-02-17T14:30:00.000Z',
        updatedAt: '2024-02-17T14:30:00.000Z',
        episodes: [
          {
            id: '223e4567-e89b-12d3-a456-426614174000',
            title: 'Episode 1',
            episodeNumber: 1,
            seasonNumber: null,
            durationInSeconds: 3600,
            thumbnailUrl: 'https://cdn.example.com/thumbnails/uuid-thumb.jpg',
            status: 'published',
          },
        ],
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
  findOne(@Param('id') id: string) {
    return this.programsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a program',
    description:
      'Updates an existing program. All fields are optional. Optionally upload a new cover image file to replace the existing one.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UpdateProgramDto })
  @UseInterceptors(FileInterceptor('coverImage'))
  @ApiParam({
    name: 'id',
    description: 'Program UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Program updated successfully',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'فنجان',
        description: 'Updated description',
        type: 'podcast',
        category: 'Culture',
        language: 'ar',
        coverImageUrl: 'https://cdn.example.com/thumbnails/uuid-new-cover.jpg',
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
          'type must be one of: podcast, documentary, series',
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
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateProgramDto: UpdateProgramDto,
    @UploadedFile() coverImage?: Express.Multer.File,
  ) {
    return this.programsService.update(id, updateProgramDto, coverImage);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a program (cascades to episodes)',
    description:
      'Permanently deletes a program and all its associated episodes. This action cannot be undone.',
  })
  @ApiParam({
    name: 'id',
    description: 'Program UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Program deleted successfully',
    schema: {
      example: {
        message: 'Program deleted successfully',
        id: '123e4567-e89b-12d3-a456-426614174000',
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
  remove(@Param('id') id: string) {
    return this.programsService.remove(id);
  }
}
