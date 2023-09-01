import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ArangoModule } from 'nest-arango';
import appConfig from './config/app.config';
import arangoConfig from './config/arango.config';
import { PersonEntity } from './entities/person.entity';
import { TestService } from './test.service';

describe('TestService', () => {
  let testService: TestService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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
        ArangoModule.forFeature([PersonEntity]),
      ],
      providers: [TestService],
    }).compile();

    testService = module.get<TestService>(TestService);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(testService.getHello()).toBe('Hello World!');
    });
  });
});
