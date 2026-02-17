import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ContentProvider,
  ImportResult,
} from '../interfaces/content-provider.interface';
import { CreateProgramDto } from 'src/programs/dto/create-program.dto';
import { CreateEpisodeDto } from 'src/episodes/dto/create-episode.dto';
import { ProgramType, Language } from 'src/common/enums/program.enums';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const PLAYLIST_ITEM_PAGE_SIZE = 50;
const VIDEOS_BATCH_SIZE = 50;

/** YouTube playlist URL patterns that include a list= param */
const PLAYLIST_URL_PATTERNS = [
  /youtube\.com\/playlist\?.*list=/i,
  /youtube\.com\/watch\?.*list=/i,
  /youtu\.be\/.*\?.*list=/i,
];

type YoutubePlaylistSnippet = {
  title: string;
  description?: string;
  thumbnails?: Record<string, { url: string }>;
}

type YoutubePlaylistItemSnippet = {
  title: string;
  description?: string;
  publishedAt?: string;
  resourceId?: { videoId: string };
  position?: number;
}

type YoutubePlaylistItem = {
  snippet?: YoutubePlaylistItemSnippet;
  contentDetails?: { videoId: string };
}

type YoutubeVideoContentDetails = {
  duration?: string;
}

/** Video resource from videos.list with part=snippet,contentDetails */
type YoutubeVideoResource = {
  id?: string;
  snippet?: { title?: string; description?: string };
  contentDetails?: YoutubeVideoContentDetails;
};

@Injectable()
export class YoutubeProvider implements ContentProvider {
  private readonly logger = new Logger(YoutubeProvider.name);

  constructor(private readonly configService: ConfigService) {}

  canHandle(url: string): boolean {
    try {
      const parsed = new URL(url);
      const list = parsed.searchParams.get('list');
      if (list) return true;
      if (PLAYLIST_URL_PATTERNS.some((re) => re.test(url))) return true;
      // Single video: youtube.com/watch?v=... or youtu.be/VIDEO_ID
      if (parsed.hostname.includes('youtube.com') && parsed.searchParams.get('v'))
        return true;
      if (parsed.hostname === 'youtu.be') {
        const segment = parsed.pathname.replace(/^\/+/, '').split('/')[0];
        if (segment) return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async fetchContent(url: string): Promise<ImportResult> {
    const apiKey = this.configService.get<string>('YOUTUBE_API_KEY');
    if (!apiKey) {
      throw new BadRequestException(
        'YOUTUBE_API_KEY is not configured. Set it in .env to import from YouTube.',
      );
    }

    try {
      const parsed = new URL(url);
      const list = parsed.searchParams.get('list');
      if (list) {
        return this.fetchContentFromPlaylist(url, apiKey);
      }
    } catch {
      // fall through
    }

    const videoId = this.parseVideoId(url);
    if (videoId) {
      return this.fetchContentFromSingleVideo(videoId, apiKey);
    }

    throw new BadRequestException(
      'URL must be a YouTube playlist or single video (e.g. youtube.com/watch?v=... or youtu.be/VIDEO_ID).',
    );
  }

  private async fetchContentFromPlaylist(
    url: string,
    apiKey: string,
  ): Promise<ImportResult> {
    const playlistId = this.parsePlaylistId(url);
    const [playlistMeta, items] = await Promise.all([
      this.fetchPlaylistMetadata(playlistId, apiKey),
      this.fetchAllPlaylistItems(playlistId, apiKey),
    ]);

    const videoIds = [...new Set(items
      .map((i) => i.snippet?.resourceId?.videoId ?? i.contentDetails?.videoId)
      .filter((id): id is string => !!id))];

    const durations = await this.fetchVideoDurations(videoIds, apiKey);

    const program: CreateProgramDto = {
      title: playlistMeta.snippet?.title ?? 'Imported from YouTube',
      description: playlistMeta.snippet?.description ?? undefined,
      type: ProgramType.SERIES,
      category: 'Entertainment',
      language: Language.ARABIC,
    };

    const episodes: CreateEpisodeDto[] = [];
    let episodeNumber = 1;
    for (const item of items) {
      const videoId =
        item.snippet?.resourceId?.videoId ?? item.contentDetails?.videoId;
      const title = item.snippet?.title?.trim();
      if (
        !videoId ||
        !title ||
        title === 'Deleted video' ||
        title === 'Private video'
      ) {
        continue;
      }
      const durationSeconds = durations.get(videoId) ?? 0;
      episodes.push({
        title,
        description: item.snippet?.description ?? undefined,
        durationInSeconds: durationSeconds,
        episodeNumber,
        seasonNumber: 1,
        publicationDate: undefined,
      });
      episodeNumber += 1;
    }

    return { program, episodes };
  }

  private async fetchContentFromSingleVideo(
    videoId: string,
    apiKey: string,
  ): Promise<ImportResult> {
    const video = await this.fetchSingleVideoMetadata(videoId, apiKey);
    const title = video.snippet?.title?.trim() ?? 'Imported from YouTube';
    const description = video.snippet?.description ?? undefined;
    const durationSeconds = video.contentDetails?.duration
      ? this.parseIsoDuration(video.contentDetails.duration)
      : 0;

    const program: CreateProgramDto = {
      title,
      description,
      type: ProgramType.SERIES,
      category: 'Entertainment',
      language: Language.ARABIC,
    };

    const episodes: CreateEpisodeDto[] = [
      {
        title,
        description,
        durationInSeconds: durationSeconds,
        episodeNumber: 1,
        seasonNumber: 1,
        publicationDate: undefined,
      },
    ];

    return { program, episodes };
  }

  /**
   * Extracts video ID from a single-video URL (youtube.com/watch?v=... or youtu.be/ID).
   * Returns null if the URL is not a valid single-video URL.
   */
  parseVideoId(url: string): string | null {
    try {
      const parsed = new URL(url);
      if (parsed.hostname.includes('youtube.com')) {
        const v = parsed.searchParams.get('v');
        if (v) return v;
      }
      if (parsed.hostname === 'youtu.be') {
        const segment = parsed.pathname.replace(/^\/+/, '').split('/')[0];
        if (segment) return segment;
      }
    } catch {
      // fall through
    }
    return null;
  }

  parsePlaylistId(url: string): string {
    try {
      const parsed = new URL(url);
      const list = parsed.searchParams.get('list');
      if (list) return list;
    } catch {
      // fall through
    }
    throw new BadRequestException(
      'Invalid YouTube URL: could not find playlist ID (expected ?list=... or .../playlist?list=...).',
    );
  }

  private async fetchPlaylistMetadata(
    playlistId: string,
    apiKey: string,
  ): Promise<{ snippet?: YoutubePlaylistSnippet }> {
    const params = new URLSearchParams({
      part: 'snippet',
      id: playlistId,
      key: apiKey,
    });
    const res = await fetch(`${YOUTUBE_API_BASE}/playlists?${params}`);
    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`YouTube playlists.list failed: ${res.status} ${body}`);
      throw new BadRequestException(
        `YouTube API error: ${res.status}. Check playlist ID and YOUTUBE_API_KEY.`,
      );
    }
    const data = (await res.json()) as {
      items?: Array<{ snippet?: YoutubePlaylistSnippet }>;
      error?: { message?: string };
    };
    if (data.error) {
      this.logger.error(`YouTube API error: ${JSON.stringify(data.error)}`);
      throw new BadRequestException(
        data.error.message ?? 'YouTube API returned an error.',
      );
    }
    const playlist = data.items?.[0];
    if (!playlist) {
      throw new BadRequestException('Playlist not found or not accessible.');
    }
    return playlist;
  }

  private async fetchAllPlaylistItems(
    playlistId: string,
    apiKey: string,
  ): Promise<YoutubePlaylistItem[]> {
    const all: YoutubePlaylistItem[] = [];
    let pageToken: string | undefined;
    do {
      const params = new URLSearchParams({
        part: 'snippet,contentDetails',
        playlistId,
        maxResults: String(PLAYLIST_ITEM_PAGE_SIZE),
        key: apiKey,
      });
      if (pageToken) params.set('pageToken', pageToken);
      const res = await fetch(`${YOUTUBE_API_BASE}/playlistItems?${params}`);
      if (!res.ok) {
        const body = await res.text();
        this.logger.error(
          `YouTube playlistItems.list failed: ${res.status} ${body}`,
        );
        throw new BadRequestException(
          `YouTube API error: ${res.status}. Check playlist visibility and API key.`,
        );
      }
      const data = (await res.json()) as {
        items?: YoutubePlaylistItem[];
        nextPageToken?: string;
        error?: { message?: string };
      };
      if (data.error) {
        this.logger.error(`YouTube API error: ${JSON.stringify(data.error)}`);
        throw new BadRequestException(
          data.error.message ?? 'YouTube API returned an error.',
        );
      }
      if (data.items?.length) all.push(...data.items);
      pageToken = data.nextPageToken;
    } while (pageToken);
    return all;
  }

  private async fetchSingleVideoMetadata(
    videoId: string,
    apiKey: string,
  ): Promise<YoutubeVideoResource> {
    const params = new URLSearchParams({
      part: 'snippet,contentDetails',
      id: videoId,
      key: apiKey,
    });
    const res = await fetch(`${YOUTUBE_API_BASE}/videos?${params}`);
    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`YouTube videos.list failed: ${res.status} ${body}`);
      throw new BadRequestException(
        `YouTube API error: ${res.status}. Check video ID and YOUTUBE_API_KEY.`,
      );
    }
    const data = (await res.json()) as {
      items?: YoutubeVideoResource[];
      error?: { message?: string };
    };
    if (data.error) {
      this.logger.error(`YouTube API error: ${JSON.stringify(data.error)}`);
      throw new BadRequestException(
        data.error.message ?? 'YouTube API returned an error.',
      );
    }
    const video = data.items?.[0];
    if (!video) {
      throw new BadRequestException('Video not found or not accessible.');
    }
    return video;
  }

  private async fetchVideoDurations(
    videoIds: string[],
    apiKey: string,
  ): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (videoIds.length === 0) return map;

    for (let i = 0; i < videoIds.length; i += VIDEOS_BATCH_SIZE) {
      const batch = videoIds.slice(i, i + VIDEOS_BATCH_SIZE);
      const params = new URLSearchParams({
        part: 'contentDetails',
        id: batch.join(','),
        key: apiKey,
      });
      const res = await fetch(`${YOUTUBE_API_BASE}/videos?${params}`);
      if (!res.ok) {
        const body = await res.text();
        this.logger.error(`YouTube videos.list failed: ${res.status} ${body}`);
        throw new BadRequestException(
          `YouTube API error: ${res.status}. Could not fetch video durations.`,
        );
      }
      const data = (await res.json()) as {
        items?: Array<{
          id?: string;
          contentDetails?: YoutubeVideoContentDetails;
        }>;
        error?: { message?: string };
      };
      if (data.error) {
        this.logger.error(`YouTube API error: ${JSON.stringify(data.error)}`);
        throw new BadRequestException(
          data.error.message ?? 'YouTube API returned an error.',
        );
      }
      for (const item of data.items ?? []) {
        const id = item.id;
        const duration = item.contentDetails?.duration;
        if (id && duration !== undefined) {
          map.set(id, this.parseIsoDuration(duration));
        }
      }
    }
    return map;
  }

  /**
   * Converts ISO 8601 duration (e.g. PT1H2M3S, PT4M13S) to seconds.
   */
  parseIsoDuration(iso: string): number {
    const re = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
    const m = re.exec(iso);
    if (!m) return 0;
    const hours = parseInt(m[1] ?? '0', 10);
    const minutes = parseInt(m[2] ?? '0', 10);
    const seconds = parseInt(m[3] ?? '0', 10);
    return hours * 3600 + minutes * 60 + seconds;
  }
}
