import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ImportService } from './import.service';
import { ImportFromUrlDto } from './dto/import-from-url.dto';

@ApiTags('import')
@ApiBearerAuth()
@Controller('import')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post()
  @ApiOperation({
    summary: 'Import content from URL',
    description:
      'Import a program and its episodes from an external source (e.g. YouTube playlist). Creates the program and all episodes in a single transaction.',
  })
  @ApiResponse({
    status: 201,
    description: 'Content imported successfully',
    schema: {
      example: {
        message: 'Import successful',
        programId: '223e4567-e89b-12d3-a456-426614174000',
        programTitle: 'فنجان',
        episodesImported: 42,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Unsupported URL or provider/YouTube API error',
    schema: {
      example: {
        statusCode: 400,
        message: 'No provider found for this URL',
        error: 'Bad Request',
      },
    },
  })
  importFromUrl(@Body() dto: ImportFromUrlDto) {
    return this.importService.importFromUrl(dto.url);
  }
}
