import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true }); // allow any origin
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Setup Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Media Platform CMS API')
    .setDescription(
      'Content Management System API for managing visual programs (podcasts, documentaries, series) and episodes. ' +
        'Use the demo account (demo@example.com / demo) to log in via POST /auth/login, then click Authorize and paste the returned accessToken.',
    )
    .setVersion('1.0')
    .addServer('/')
    .addBearerAuth()
    .addTag('auth', 'Login and token refresh')
    .addTag('programs', 'Program management endpoints - Create, read, update, and delete programs')
    .addTag('episodes', 'Episode management endpoints - Manage episodes within programs')
    .addTag('upload', 'File upload endpoints - Generate presigned URLs for direct S3 uploads')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
