import { Injectable, Logger } from '@nestjs/common';
import { SqsMessageHandler } from '@ssut/nestjs-sqs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { type Message } from '@aws-sdk/client-sqs';
import { VideoUploadedEvent } from 'src/common/events/video-uploaded.event';

type S3EventRecord = {
  s3: {
    object: {
      key: string;
      size: number;
      eTag: string;
    };
    bucket: {
      name: string;
      arn: string;
    };
  };
};

type S3EventNotification = {
  Records: S3EventRecord[];
};

@Injectable()
export class S3UploadConsumer {
  private readonly logger = new Logger(S3UploadConsumer.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  @SqsMessageHandler('s3-upload-events-queue', false)
  async handleMessage(message: Message) {
    try {
      if (!message.Body) {
        this.logger.warn('Received SQS message with empty body');
        return;
      }

      const body = JSON.parse(message.Body) as S3EventNotification;

      if (body.Records) {
        for (const record of body.Records) {
          const key = decodeURIComponent(
            record.s3.object.key.replace(/\+/g, ' '),
          );

          this.logger.log(`Processing S3 Upload Event: ${key}`);

          const match = key.match(/^episodes\/([a-f0-9-]+)\//);

          if (match && match[1]) {
            const id = match[1];
            this.logger.log(`File Uploaded. Emitting Event for ID: ${id}`);

            await this.eventEmitter.emitAsync(
              'video.uploaded',
              new VideoUploadedEvent(id, key),
            );
          }
        }
      }
    } catch (error) {
      this.logger.error('Error processing SQS message', error);
      throw error;
    }
  }
}
