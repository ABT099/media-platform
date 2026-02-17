import { IsNotEmpty, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ImportFromUrlDto {
  @ApiProperty({
    description: 'The URL of the content to import (e.g. a YouTube playlist)',
    example: 'https://www.youtube.com/playlist?list=PLxxxxxxxxxxxxxxxx',
  })
  @IsUrl()
  @IsNotEmpty()
  url: string;
}
