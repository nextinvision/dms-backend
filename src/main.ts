import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ValidationExceptionFilter } from './common/filters/validation-exception.filter';
import { SanitizationPipe } from './common/pipes/sanitization.pipe';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api');

  // Global exception filters (order matters - most specific first)
  app.useGlobalFilters(
    new ValidationExceptionFilter(),
    new AllExceptionsFilter(),
  );

  // Global validation pipe with transformation and sanitization
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
    new SanitizationPipe(),
  );

  // Global interceptors
  const { TransformInterceptor } = await import('./common/interceptors/transform.interceptor');
  app.useGlobalInterceptors(new TransformInterceptor(), new LoggingInterceptor());

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  });

  const port = process.env.PORT || 3001; // Spec says 3001
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();

