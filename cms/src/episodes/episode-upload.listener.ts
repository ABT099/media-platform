import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EpisodesService } from './episodes.service';
import { VideoUploadedEvent } from '../common/events/video-uploaded.event';

@Injectable()
export class EpisodeUploadListener {
  private readonly logger = new Logger(EpisodeUploadListener.name);

  constructor(private readonly episodeService: EpisodesService) {}

  @OnEvent('video.uploaded')
  async handleVideoUpload(payload: VideoUploadedEvent) {
    this.logger.log(`Received upload event for Episode ${payload.uploadId}`);

    await this.episodeService.markAsUploaded(payload.uploadId, payload.fileKey);
  }
}
