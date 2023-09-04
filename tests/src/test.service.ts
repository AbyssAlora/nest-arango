import { Injectable } from '@nestjs/common';
import {
  ArangoManager,
  ArangoRepository,
  InjectManager,
  InjectRepository,
} from 'nest-arango';
import { CollectionName } from './collection-names';
import { PersonEntity } from './entities/person.entity';
import { Person_PersonEntity } from './entities/person_person.entity';

@Injectable()
export class TestService {
  @InjectManager()
  private readonly databaseManager: ArangoManager;
  @InjectRepository(PersonEntity)
  private readonly personRepository: ArangoRepository<PersonEntity>;
  @InjectRepository(Person_PersonEntity)
  private readonly person_personRepository: ArangoRepository<Person_PersonEntity>;

  async truncateCollections() {
    await this.personRepository.truncate();
    await this.person_personRepository.truncate();
  }

  async saveAll() {
    return await this.personRepository.saveAll(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      Array.from(new Array(5), (_val, index) => ({
        name: `test${index}`,
      })),
    );
  }

  async saveOne() {
    return await this.personRepository.save({
      name: 'testname123',
    });
  }

  async findOne() {
    const person = await this.personRepository.save({
      name: 'testname123',
    });
    return await this.personRepository.findOne(person._key);
  }

  async findOneNull() {
    return await this.personRepository.findOne('invalid_key_1235448949196');
  }

  async findOneBy() {
    await this.personRepository.save({
      name: 'testname123',
    });
    return await this.personRepository.findOneBy({
      name: 'testname123',
    });
  }

  async findOneByNull() {
    return await this.personRepository.findOneBy({
      _key: 'invalid_key_1235448949196',
    });
  }

  async findMany() {
    const entries = await this.personRepository.saveAll(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      Array.from(new Array(5), (_val, index) => ({
        name: `test${index}`,
      })),
    );
    return await this.personRepository.findMany(
      entries.map((entry) => entry._key),
    );
  }

  async findManyEmpty() {
    return await this.personRepository.findMany(
      Array.from(new Array(5), (_val, index) => `invalid_key_${index}`),
    );
  }

  async findManyBy() {
    await this.personRepository.saveAll(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      Array.from(new Array(5), (_val, index) => ({
        name: `Common Name`,
        email: `email${index}@test.com`,
      })),
    );
    return await this.personRepository.findManyBy({
      name: 'Common Name',
    });
  }

  async findManyByEmpty() {
    return await this.personRepository.findManyBy({
      name: `Fake Name`,
    });
  }

  async findAll(entriesToCreateCount: number, pageSize: number) {
    await this.personRepository.saveAll(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      Array.from(new Array(entriesToCreateCount), (_val, index) => ({
        name: `test${index}`,
      })),
    );
    const findAll = await this.personRepository.findAll({
      pageSize: pageSize,
      page: 0,
    });
    return findAll;
  }

  async getDocumentCountBy() {
    await this.personRepository.saveAll(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      Array.from(new Array(5), (_val, index) => ({
        name: `Common Name`,
        email: `email${index}@test.com`,
      })),
    );

    return await this.personRepository.getDocumentCountBy({
      name: 'Common Name',
    });
  }

  async getIdFor() {
    return this.personRepository.getIdFor('key_123');
  }

  async getKeyFrom() {
    return this.personRepository.getKeyFrom(`${CollectionName.People}/key_123`);
  }

  async replace() {
    const entry = await this.personRepository.save({
      name: 'testname123',
      email: 'example@test.com',
    });

    return await this.personRepository.replace(
      entry._key,
      {
        name: 'replacedname123',
      },
      { returnOld: true },
    );
  }

  async replaceAll() {
    const entries = await this.personRepository.saveAll(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      Array.from(new Array(5), (_val, index) => ({
        name: `Common Name`,
        email: `email${index}@test.com`,
      })),
    );

    return await this.personRepository.replaceAll(
      entries.map((entry) => {
        return { ...entry, email: 'replaced.email@test.com' };
      }),
      { returnOld: true },
    );
  }

  async update() {
    const entry = await this.personRepository.save({
      name: 'testname123',
    });

    return await this.personRepository.update(
      {
        _key: entry._key,
        name: 'updatedname123',
      },
      { returnOld: true },
    );
  }

  async updateAll() {
    const entries = await this.personRepository.saveAll(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      Array.from(new Array(5), (_val, index) => ({
        name: `Common Name`,
        email: `email${index}@test.com`,
      })),
    );

    return await this.personRepository.updateAll(
      entries.map((entry) => {
        return { _key: entry._key, email: 'updated.email@test.com' };
      }),
      { returnOld: true },
    );
  }

  async upsert() {
    await this.personRepository.save({
      name: `Common Name`,
    });
    const result = [];
    result[0] = await this.personRepository.upsert(
      {
        name: `Common Name`,
      },
      {
        name: `Inserted Name`,
      },
      {
        name: `Updated Name`,
      },
    );
    result[1] = await this.personRepository.upsert(
      {
        name: `Random Name`,
      },
      {
        name: `Inserted Name`,
      },
      {
        name: `Updated Name`,
      },
    );
    return result;
  }

  async remove() {
    const entry = await this.personRepository.save({
      name: 'testname123',
    });

    return await this.personRepository.remove(entry._key);
  }

  async removeBy() {
    await this.personRepository.saveAll(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      Array.from(new Array(5), (_val, index) => ({
        name: `test${index}`,
        email: 'common.email@test.com',
      })),
    );

    return await this.personRepository.removeBy({
      email: 'common.email@test.com',
    });
  }

  async removeAll() {
    const entries = await this.personRepository.saveAll(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      Array.from(new Array(5), (_val, index) => ({
        name: `test${index}`,
        email: 'common.email@test.com',
      })),
    );

    return await this.personRepository.removeAll(
      entries.map((entry) => entry._key),
    );
  }

  async truncate_returnZeroEntries() {
    await this.personRepository.saveAll(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      Array.from(new Array(5), (_val, index) => ({
        name: `test${index}`,
        email: 'common.email@test.com',
      })),
    );
    await this.personRepository.truncate();
    return await this.personRepository.findAll();
  }
}
