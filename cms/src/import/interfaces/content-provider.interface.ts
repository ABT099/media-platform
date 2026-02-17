import { CreateEpisodeDto } from 'src/episodes/dto/create-episode.dto';
import { CreateProgramDto } from 'src/programs/dto/create-program.dto';

export interface ImportResult {
  program: CreateProgramDto;
  episodes: CreateEpisodeDto[];
}

export interface ContentProvider {
  // Returns true if this provider can handle this URL
  canHandle(url: string): boolean;

  // The actual logic to fetch metadata
  fetchContent(url: string): Promise<ImportResult>;
}
