import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import multerS3 from 'multer-s3';
import { v4 as uuid } from 'uuid';
import { StorageService } from './storage.service';
import { Request } from 'express';
import { SqsModule } from '@ssut/nestjs-sqs';
import { S3UploadConsumer } from './s3-upload.consumer';
import { UploadController } from './upload.controller';

@Module({
  imports: [
    ConfigModule,
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const region = configService.getOrThrow<string>('AWS_REGION');
        const accessKeyId =
          configService.getOrThrow<string>('AWS_ACCESS_KEY_ID');
        const secretAccessKey = configService.getOrThrow<string>(
          'AWS_SECRET_ACCESS_KEY',
        );
        const bucket = configService.getOrThrow<string>('S3_BUCKET');

        return {
          storage: multerS3({
            s3: new S3Client({
              region,
              credentials: {
                accessKeyId,
                secretAccessKey,
              },
            }),
            bucket,
            contentType: (req, file, cb) => {
              multerS3.AUTO_CONTENT_TYPE(req, file, cb);
            },
            key: (
              req: Request,
              file: Express.Multer.File,
              cb: (error: any, key?: string) => void,
            ) => {
              // Organize images in a separate folder
              const fileName = `episodes/covers/${uuid()}-${file.originalname}`;
              cb(null, fileName);
            },
          }),
          limits: { fileSize: 5 * 1024 * 1024 }, // 5MB Limit
        };
      },
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
export class StorageModule {}
