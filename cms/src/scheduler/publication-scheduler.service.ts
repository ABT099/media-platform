import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PublicationService } from '../episodes/publication.service';

@Injectable()
export class PublicationScheduler {
  private readonly logger = new Logger(PublicationScheduler.name);

  constructor(private readonly publicationService: PublicationService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleScheduledPublications() {
    this.logger.log('Checking for scheduled episodes ready to publish...');

    try {
      const publishedCount =
        await this.publicationService.processScheduledPublications();

      if (publishedCount > 0) {
        this.logger.log(`Published ${publishedCount} scheduled episode(s)`);
      }
    } catch (error) {
      this.logger.error('Error processing scheduled publications:', error);
    }
  }
}
