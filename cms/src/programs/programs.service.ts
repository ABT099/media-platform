import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';
import { StorageService } from '../storage/storage.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ProgramCreatedEvent,
  ProgramUpdatedEvent,
  ProgramDeletedEvent,
} from 'src/common/events/program.events';
import { EpisodeDeletedEvent } from 'src/common/events/episode.events';
import { ProgramsRepository } from './programs.repository';
import { EpisodesRepository } from '../episodes/episodes.repository';
import {
  buildPaginatedResult,
  toOffset,
} from 'src/common/pagination/paginate';

@Injectable()
export class ProgramsService {
  constructor(
    private readonly programsRepository: ProgramsRepository,
    private readonly episodesRepository: EpisodesRepository,
    private readonly storageService: StorageService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(data: CreateProgramDto, coverImage?: Express.Multer.File) {
    let coverImageUrl: string | undefined;
    if (coverImage) {
      coverImageUrl = await this.storageService.uploadPublicFile(
        coverImage,
        'thumbnails',
      );
    }

    const { coverImage: _, ...programData } = data;

    const program = await this.programsRepository.insert({
      ...programData,
      coverImageUrl,
    });

    this.eventEmitter.emit('program.created', new ProgramCreatedEvent(program));

    return program;
  }

  async findAll(page: number = 1, limit: number = 10) {
    const offset = toOffset(page, limit);
    const [items, total] = await Promise.all([
      this.programsRepository.findAll(offset, limit),
      this.programsRepository.count(),
    ]);

    return buildPaginatedResult(items, total, page, limit);
  }

  async findOne(id: string) {
    const program = await this.programsRepository.findById(id);

    if (!program) {
      throw new NotFoundException(`Program with ID ${id} not found`);
    }

    const episodes = await this.episodesRepository.findByProgramId(id);

    return { ...program, episodes };
  }

  async update(
    id: string,
    data: UpdateProgramDto,
    coverImage?: Express.Multer.File,
  ) {
    let coverImageUrl: string | undefined;
    if (coverImage) {
      coverImageUrl = await this.storageService.uploadPublicFile(
        coverImage,
        'thumbnails',
      );
    }

    const { coverImage: _, ...programData } = data;

    const program = await this.programsRepository.update(id, {
      ...programData,
      ...(coverImageUrl && { coverImageUrl }),
      updatedAt: new Date(),
    });

    if (!program) {
      throw new NotFoundException(`Program with ID ${id} not found`);
    }

    this.eventEmitter.emit('program.updated', new ProgramUpdatedEvent(program));

    return program;
  }

  async remove(id: string) {
    const episodes = await this.episodesRepository.findByProgramId(id);

    const program = await this.programsRepository.delete(id);

    if (!program) {
      throw new NotFoundException(`Program with ID ${id} not found`);
    }

    this.eventEmitter.emit(
      'program.deleted',
      new ProgramDeletedEvent(program.id),
    );

    for (const episode of episodes) {
      this.eventEmitter.emit(
        'episode.deleted',
        new EpisodeDeletedEvent(episode.id),
      );
    }

    return { message: 'Program deleted successfully', id };
  }
}
