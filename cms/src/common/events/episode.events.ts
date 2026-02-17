import { Episode } from 'src/database/schema';

export class EpisodeStatusChangedEvent {
  constructor(public readonly episode: Episode) {}
}

export class EpisodeDeletedEvent {
  constructor(public readonly episodeId: string) {}
}
