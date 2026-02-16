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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { EpisodesService } from './episodes.service';
import { CreateEpisodeDto } from './dto/create-episode.dto';
import { UpdateEpisodeDto } from './dto/update-episode.dto';

@ApiTags('episodes')
@Controller()
export class EpisodesController {
  constructor(private readonly episodesService: EpisodesService) {}

  @Post('programs/:programId/episodes')
  @ApiOperation({ summary: 'Create a new episode under a program' })
  @ApiParam({ name: 'programId', description: 'Program UUID' })
  @ApiResponse({ status: 201, description: 'Episode created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Program not found' })
  create(
    @Param('programId') programId: string,
    @Body(ValidationPipe) createEpisodeDto: CreateEpisodeDto,
  ) {
    return this.episodesService.create(programId, createEpisodeDto);
  }

  @Get('programs/:programId/episodes')
  @ApiOperation({ summary: 'Get all episodes for a program (paginated)' })
  @ApiParam({ name: 'programId', description: 'Program UUID' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'Episodes retrieved successfully' })
  findAll(
    @Param('programId') programId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.episodesService.findAll(programId, page, limit);
  }

  @Get('episodes/:id')
  @ApiOperation({ summary: 'Get a single episode by ID' })
  @ApiParam({ name: 'id', description: 'Episode UUID' })
  @ApiResponse({ status: 200, description: 'Episode retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Episode not found' })
  findOne(@Param('id') id: string) {
    return this.episodesService.findOne(id);
  }

  @Patch('episodes/:id')
  @ApiOperation({ summary: 'Update an episode' })
  @ApiParam({ name: 'id', description: 'Episode UUID' })
  @ApiResponse({ status: 200, description: 'Episode updated successfully' })
  @ApiResponse({ status: 404, description: 'Episode not found' })
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateEpisodeDto: UpdateEpisodeDto,
  ) {
    return this.episodesService.update(id, updateEpisodeDto);
  }

  @Delete('episodes/:id')
  @ApiOperation({ summary: 'Delete an episode' })
  @ApiParam({ name: 'id', description: 'Episode UUID' })
  @ApiResponse({ status: 200, description: 'Episode deleted successfully' })
  @ApiResponse({ status: 404, description: 'Episode not found' })
  remove(@Param('id') id: string) {
    return this.episodesService.remove(id);
  }
}
