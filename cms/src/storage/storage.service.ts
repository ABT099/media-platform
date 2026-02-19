import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';
import { v4 as uuid } from 'uuid';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly cloudfrontDomain: string;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.getOrThrow<string>('S3_BUCKET');
    this.cloudfrontDomain = this.configService.getOrThrow<string>(
      'AWS_CLOUDFRONT_DOMAIN',
    );

    this.s3Client = new S3Client({
      region: this.configService.getOrThrow<string>('AWS_REGION'),
    });
  }

  /**
   * Generates a Presigned URL for uploading large video files to S3.
   * Can be used for both initial uploads and video replacements.
   * Client uploads DIRECTLY to S3 using this URL.
   */
  async generatePresignedUrl(
    episodeId: string,
    fileName: string,
    contentType: string,
  ) {
    const fileKey = `episodes/${episodeId}/${fileName}`;
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
        ContentType: contentType,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: 3600, // 1 hour (Video uploads take time)
      });

      return {
        uploadUrl: signedUrl,
        fileKey: fileKey,
        publicUrl: `https://${this.cloudfrontDomain}/${fileKey}`, // Playable URL
      };
    } catch (error) {
      this.logger.error('Error generating presigned URL', error);
      throw new InternalServerErrorException('Could not generate upload URL');
    }
  }

  /**
   * Generates a presigned URL with a default key pattern and no ContentType restriction.
   * Used during episode creation so the frontend can start uploading immediately.
   * The URL expires in 1 hour; use generatePresignedUrl() as a fallback if it expires.
   */
  async generateDefaultPresignedUrl(episodeId: string) {
    const fileKey = `episodes/${episodeId}/original`;
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: 3600,
      });

      return {
        uploadUrl: signedUrl,
        fileKey,
        publicUrl: `https://${this.cloudfrontDomain}/${fileKey}`,
      };
    } catch (error) {
      this.logger.error('Error generating default presigned URL', error);
      throw new InternalServerErrorException('Could not generate upload URL');
    }
  }

  /**
   * Verifies that a file actually exists in S3.
   * Prevents users from submitting a fake "fileKey".
   */
  async verifyFileExists(fileKey: string): Promise<boolean> {
    try {
      await this.s3Client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: fileKey }),
      );
      return true;
    } catch (error) {
      this.logger.warn(`File verification failed for key: ${fileKey}`, error);
      return false;
    }
  }

  getPublicUrl(fileKey: string): string {
    return `https://${this.cloudfrontDomain}/${fileKey}`;
  }

  async uploadPublicFile(
    file: Express.Multer.File,
    folder: 'thumbnails' | 'avatars',
  ): Promise<string> {
    const key = `${folder}/${uuid()}-${file.originalname}`;

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );

      return this.getPublicUrl(key);
    } catch (error) {
      this.logger.error(`Failed to upload ${folder}`, error);
      throw new InternalServerErrorException('Image upload failed');
    }
  }
}
