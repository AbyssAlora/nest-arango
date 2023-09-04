import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ArangoModule } from 'nest-arango';
import appConfig from './config/app.config';
import arangoConfig from './config/arango.config';
import { PersonEntity } from './entities/person.entity';
import { Person_PersonEntity } from './entities/person_person.entity';
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
        ArangoModule.forFeature([PersonEntity, Person_PersonEntity]),
      ],
      providers: [TestService],
    }).compile();

    testService = module.get<TestService>(TestService);
  });

  afterEach(async () => {
    await testService.truncateCollections();
  });

  // START OF TESTS

  describe('saveAll', () => {
    it('should return 5 entries with defined "name" property', async () => {
      const result = await testService.saveAll();

      expect(result).toBeDefined();
      expect(result).toHaveLength(5);
      result.forEach((element) => {
        expect(element).toHaveProperty('name');
      });
    });
  });

  describe('saveOne', () => {
    it('should return 1 entry with defined "name" property', async () => {
      const result = await testService.saveOne();

      expect(result).toBeDefined();
      expect(result).toHaveProperty('name');
    });
  });

  describe('findOne', () => {
    it('should return 1 entry with defined "name" property', async () => {
      const result = await testService.findOne();

      expect(result).toBeDefined();
      expect(result).toHaveProperty('name');
    });
  });

  describe('findOne (null)', () => {
    it('should return null', async () => {
      const result = await testService.findOneNull();

      expect(result).toBeNull();
    });
  });

  describe('findOneBy', () => {
    it('should return 1 entry with defined "name" property', async () => {
      const result = await testService.findOneBy();

      expect(result).toBeDefined();
      expect(result).toHaveProperty('name');
    });
  });

  describe('findOneBy (null)', () => {
    it('should return null', async () => {
      const result = await testService.findOneByNull();

      expect(result).toBeUndefined();
    });
  });

  describe('findMany', () => {
    it('should return 5 entries with defined "name" property', async () => {
      const result = await testService.findMany();

      expect(result).toBeDefined();
      expect(result).toHaveLength(5);
      result.forEach((element) => {
        expect(element).toHaveProperty('name');
      });
    });
  });

  describe('findMany (empty)', () => {
    it('should return empty array', async () => {
      const result = await testService.findManyEmpty();

      expect(result).toBeDefined();
      expect(result).toHaveLength(0);
    });
  });

  describe('findManyBy', () => {
    it('should return 5 entries with defined "name" and "email" properties', async () => {
      const result = await testService.findManyBy();

      expect(result).toBeDefined();
      expect(result.results).toBeDefined();
      expect(result.results).toHaveLength(5);
      expect(result.totalCount).toBe<number>(5);
      result.results.forEach((element) => {
        expect(element).toHaveProperty('name');
        expect(element).toHaveProperty('email');
      });
    });
  });

  describe('findManyBy (empty)', () => {
    it('should return empty ResultList', async () => {
      const result = await testService.findManyByEmpty();

      expect(result).toBeDefined();
      expect(result.results).toBeDefined();
      expect(result.results).toHaveLength(0);
      expect(result.totalCount).toBe<number>(0);
    });
  });

  describe('findAll', () => {
    const numberOfCreatedEntries = 10;
    const pageSize = 5;
    it(`should return ResultList with ${pageSize} entries, totalCount of ${numberOfCreatedEntries} with defined "name" property`, async () => {
      const result = await testService.findAll(
        numberOfCreatedEntries,
        pageSize,
      );

      expect(result).toBeDefined();
      expect(result.results).toBeDefined();
      expect(result.results).toHaveLength(pageSize);
      expect(result.totalCount).toBe<number>(numberOfCreatedEntries);
      result.results.forEach((element) => {
        expect(element).toHaveProperty('name');
      });
    });
  });

  describe('getDocumentCountBy', () => {
    it('should return 5 as a number', async () => {
      const result = await testService.getDocumentCountBy();

      expect(result).toBe<number>(5);
    });
  });

  describe('getIdFor', () => {
    it('should return "People/key_123"', async () => {
      const result = await testService.getIdFor();

      expect(result).toBe<string>('People/key_123');
    });
  });

  describe('getKeyFrom', () => {
    it('should return "key_123"', async () => {
      const result = await testService.getKeyFrom();

      expect(result).toBe<string>('key_123');
    });
  });

  describe('replace (defined name + undefined email)', () => {
    it('should return new entry with defined "name" property and undefined "email" + old entry with defined "name" and "email"', async () => {
      const result = await testService.replace();

      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(result[0]).toBeDefined();
      expect(result[0]).toHaveProperty('name', 'replacedname123');
      expect(result[0].email).toBeUndefined();
      expect(result[1]).toBeDefined();
      expect(result[1]).toHaveProperty('name', 'testname123');
      expect(result[1]).toHaveProperty('email', 'example@test.com');
    });
  });

  describe('replaceAll', () => {
    it('should return new entries with defined "name" property and matching "email" + old entries with defined "name" and "email"', async () => {
      const result = await testService.replaceAll();

      expect(result).toBeDefined();
      expect(result).toHaveLength(5);
      result.forEach((element) => {
        expect(element[0]).toBeDefined();
        expect(element[1]).toBeDefined();
        expect(element[0]).toHaveProperty('name', 'Common Name');
        expect(element[1]).toHaveProperty('name', 'Common Name');
        expect(element[0]).toHaveProperty('email', 'replaced.email@test.com');
        expect(element[1]).toHaveProperty('email');
      });
    });
  });

  describe('update (defined name + undefined email)', () => {
    it('should return new entry with defined "name" property and undefined "email" + old entry with defined "name" and "email"', async () => {
      const result = await testService.update();

      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(result[0]).toBeDefined();
      expect(result[1]).toBeDefined();
      expect(result[0]).toHaveProperty('name', 'updatedname123');
      expect(result[1]).toHaveProperty('name', 'testname123');
    });
  });

  describe('updateAll', () => {
    it('should return new entries with defined "name" property and matching "email" + old entries with defined "name" and "email"', async () => {
      const result = await testService.updateAll();

      expect(result).toBeDefined();
      expect(result).toHaveLength(5);
      result.forEach((element) => {
        expect(element[0]).toBeDefined();
        expect(element[1]).toBeDefined();
        expect(element[0]).toHaveProperty('name', 'Common Name');
        expect(element[1]).toHaveProperty('name', 'Common Name');
        expect(element[0]).toHaveProperty('email', 'updated.email@test.com');
        expect(element[1]).toHaveProperty('email');
      });
    });
  });

  describe('upsert', () => {
    //TODO: change test description
    it('should return new entries with defined "name" property and matching "email" + old entries with defined "name" and "email"', async () => {
      const result = await testService.upsert();

      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(result[0]).toBeDefined();
      expect(result[1]).toBeDefined();

      expect(result[0].totalCount).toBe(1);
      expect(result[1].totalCount).toBe(1);
      expect(result[0].results).toHaveLength(1);
      expect(result[1].results).toHaveLength(1);
      expect(result[0].results[0]).toHaveLength(2);
      expect(result[1].results[0]).toHaveLength(2);
      expect(result[0].results[0][0]).toHaveProperty('name', 'Updated Name');
      expect(result[0].results[0][1]).toHaveProperty('name', 'Common Name');
      expect(result[1].results[0][0]).toHaveProperty('name', 'Inserted Name');
      expect(result[1].results[0][1]).toBeNull();
    });
  });

  //TODO: continue with remove
});
