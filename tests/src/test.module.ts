import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ArangoModule } from 'nest-arango';
import appConfig from './config/app.config';
import arangoConfig from './config/arango.config';
import { LogEntity } from './entities/log.entity';
import { PersonEntity } from './entities/person.entity';
import { TestService } from './test.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [arangoConfig, appConfig],
    }),
    ArangoModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        config: {
          url: configService.getOrThrow<string>('ARANGO.URL'),
          databaseName: configService.getOrThrow<string>('ARANGO.DATABASE'),
          auth: {
            username: configService.getOrThrow<string>('ARANGO.USERNAME'),
            password: configService.getOrThrow<string>('ARANGO.PASSWORD'),
          },
          agentOptions: {
            rejectUnauthorized: configService.getOrThrow<boolean>(
              'ARANGO.REJECT_UNAUTHORIZED_CERT',
            ),
          },
        },
      }),
      inject: [ConfigService],
    }),
    ArangoModule.forFeature([PersonEntity, LogEntity]),
  ],
  providers: [TestService],
})
export class TestModule {}
