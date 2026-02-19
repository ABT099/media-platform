import { IsString, IsNotEmpty, IsEnum, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProgramType, Language } from 'src/common/enums/program.enums';
import { Transform } from 'class-transformer';

export { ProgramType, Language };

export class CreateProgramDto {
  @ApiProperty({
    description: 'Program title - The name of the program',
    example: 'فنجان',
    minLength: 1,
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    description: 'Program description - A detailed description of the program content',
    example: 'بودكاست ثقافي أسبوعي يستضيف شخصيات عربية مؤثرة في حوارات عميقة',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Program type - The category of content',
    enum: ProgramType,
    enumName: 'ProgramType',
    example: ProgramType.PODCAST,
    examples: {
      podcast: { value: ProgramType.PODCAST, description: 'Audio podcast series' },
      documentary: { value: ProgramType.DOCUMENTARY, description: 'Documentary film or series' },
      series: { value: ProgramType.SERIES, description: 'TV or web series' },
    },
  })
  @IsEnum(ProgramType)
  @IsNotEmpty()
  type: ProgramType;

  @ApiProperty({
    description: 'Program category - The subject matter category (e.g., Society & Culture, Business, Government, History, Documentary, Tech News, Sports)',
    example: 'Society & Culture',
    minLength: 1,
  })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({
    description: 'Program language - ISO 639-1 language code',
    enum: Language,
    enumName: 'Language',
    example: Language.ARABIC,
    examples: {
      arabic: { value: Language.ARABIC, description: 'Arabic language content' },
      english: { value: Language.ENGLISH, description: 'English language content' },
    },
  })
  @IsEnum(Language)
  @IsNotEmpty()
  language: Language;

  @ApiPropertyOptional({
    description: 'Extra info - flexible key-value metadata (JSON object)',
    example: { producer: 'Studio X', year: 2024 },
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    return typeof value === 'string' ? JSON.parse(value) : value;
  })
  @IsObject({ message: 'extraInfo must be an object' })
  extraInfo?: Record<string, unknown>;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Cover image file (JPEG/PNG, max 5MB). Optional - if not provided, coverImageUrl can be set manually.',
  })
  @IsOptional()
  coverImage?: any;
}
