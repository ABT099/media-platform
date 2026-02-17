import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Program, Episode } from '../database/schema';
import { Client } from '@elastic/elasticsearch';

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private readonly client: Client;
  private readonly programsIndex = 'programs';
  private readonly episodesIndex = 'episodes';

  constructor() {
    this.client = new Client({
      node: process.env.ELASTIC_NODE || 'http://localhost:9200',
    });
  }

  async onModuleInit() {
    await this.createIndices();
  }

  private async createIndices() {
    try {
      // Create programs index
      const programsExists = await this.client.indices.exists({
        index: this.programsIndex,
      });

      if (!programsExists) {
        await this.client.indices.create({
          index: this.programsIndex,
          mappings: {
            properties: {
              id: { type: 'keyword' },
              title: { type: 'text', analyzer: 'arabic' },
              description: { type: 'text', analyzer: 'arabic' },
              type: { type: 'keyword' },
              category: { type: 'keyword' },
              language: { type: 'keyword' },
              coverImageUrl: { type: 'keyword' },
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' },
            },
          },
        });
        this.logger.log('Programs index created');
      }

      // Create episodes index
      const episodesExists = await this.client.indices.exists({
        index: this.episodesIndex,
      });

      if (!episodesExists) {
        await this.client.indices.create({
          index: this.episodesIndex,
          mappings: {
            properties: {
              id: { type: 'keyword' },
              programId: { type: 'keyword' },
              title: { type: 'text', analyzer: 'arabic' },
              description: { type: 'text', analyzer: 'arabic' },
              durationInSeconds: { type: 'integer' },
              publicationDate: { type: 'date' },
              videoUrl: { type: 'keyword' },
              thumbnailUrl: { type: 'keyword' },
              status: { type: 'keyword' },
              episodeNumber: { type: 'integer' },
              seasonNumber: { type: 'integer' },
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' },
            },
          },
        });
        this.logger.log('Episodes index created');
      }
    } catch (error) {
      this.logger.error('Error creating indices', error);
    }
  }

  async indexProgram(program: Program) {
    try {
      await this.client.index({
        index: this.programsIndex,
        id: program.id,
        document: {
          id: program.id,
          title: program.title,
          description: program.description,
          type: program.type,
          category: program.category,
          language: program.language,
          coverImageUrl: program.coverImageUrl,
          createdAt: program.createdAt,
          updatedAt: program.updatedAt,
        },
        refresh: false,
      });
      this.logger.log(`Program ${program.id} indexed`);
    } catch (error) {
      this.logger.error(`Error indexing program ${program.id}`, error);
      throw error;
    }
  }

  async updateProgram(program: Program) {
    await this.indexProgram(program);
  }

  async deleteProgram(id: string) {
    try {
      await this.client.delete({
        index: this.programsIndex,
        id,
      });
      this.logger.log(`Program ${id} deleted from index`);
    } catch (error) {
      this.logger.error(`Error deleting program ${id} from index`, error);
    }
  }

  async indexEpisode(episode: Episode) {
    try {
      await this.client.index({
        index: this.episodesIndex,
        id: episode.id,
        document: {
          id: episode.id,
          programId: episode.programId,
          title: episode.title,
          description: episode.description,
          durationInSeconds: episode.durationInSeconds,
          publicationDate: episode.publicationDate,
          videoUrl: episode.videoUrl,
          thumbnailUrl: episode.thumbnailUrl,
          status: episode.status,
          episodeNumber: episode.episodeNumber,
          seasonNumber: episode.seasonNumber,
          createdAt: episode.createdAt,
          updatedAt: episode.updatedAt,
        },
        refresh: false,
      });
      this.logger.log(`Episode ${episode.id} indexed`);
    } catch (error) {
      this.logger.error(`Error indexing episode ${episode.id}`, error);
      throw error;
    }
  }

  async updateEpisode(episode: Episode) {
    if (episode.status === 'published') {
      await this.indexEpisode(episode);
    } else {
      await this.deleteEpisode(episode.id);
    }
  }

  async deleteEpisode(id: string) {
    try {
      await this.client.delete({
        index: this.episodesIndex,
        id,
      });
      this.logger.log(`Episode ${id} deleted from index`);
    } catch (error) {
      this.logger.error(`Error deleting episode ${id} from index`, error);
    }
  }
}
