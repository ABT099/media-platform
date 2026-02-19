import { CreateEpisodeDto } from 'src/episodes/dto/create-episode.dto';
import { CreateProgramDto } from 'src/programs/dto/create-program.dto';

/** Episode data returned by a content provider, extending the base DTO with import-specific fields. */
export interface ImportEpisodeData extends CreateEpisodeDto {
  videoUrl?: string;
  thumbnailUrl?: string;
}

export interface ImportResult {
  program: CreateProgramDto;
  episodes: ImportEpisodeData[];
}

export interface ContentProvider {
  // Returns true if this provider can handle this URL
  canHandle(url: string): boolean;

  // The actual logic to fetch metadata
  fetchContent(url: string): Promise<ImportResult>;
}
