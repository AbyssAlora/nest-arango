import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { TestModule } from './test.module';

async function bootstrap() {
  const app = await NestFactory.create(TestModule);
  const config = app.get(ConfigService);

  await app.listen(config.getOrThrow<number>('APP.PORT'));
}
bootstrap();
