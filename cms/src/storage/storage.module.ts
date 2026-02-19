import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { memoryStorage } from 'multer';
import { StorageService } from './storage.service';
import { SqsModule } from '@ssut/nestjs-sqs';
import { S3UploadConsumer } from './s3-upload.consumer';
import { UploadController } from './upload.controller';

@Module({
  imports: [
    ConfigModule,
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: () => ({
        storage: memoryStorage(),
        limits: { fileSize: 5 * 1024 * 1024 },
      }),
    }),
    SqsModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const region = configService.getOrThrow<string>('AWS_REGION');
        const queueUrl = configService.getOrThrow<string>('SQS_QUEUE_URL');
        return {
          consumers: [
            {
              name: 's3-upload-events-queue',
              queueUrl,
              region,
            },
          ],
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [StorageService, S3UploadConsumer],
  exports: [StorageService, MulterModule],
  controllers: [UploadController],
})
export class StorageModule { }