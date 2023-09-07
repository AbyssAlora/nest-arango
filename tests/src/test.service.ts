import { Injectable } from '@nestjs/common';
import {
  ArangoManager,
  ArangoRepository,
  InjectManager,
  InjectRepository,
} from 'nest-arango';
import { CollectionName } from './collection-names';
import { PersonEntity } from './entities/person.entity';

@Injectable()
export class TestService {
  @InjectManager()
  private readonly databaseManager: ArangoManager;
  @InjectRepository(PersonEntity)
  private readonly personRepository: ArangoRepository<PersonEntity>;

  async truncateCollections() {
    await this.personRepository.truncate();
  }

  async saveAll(options: { emitEvents: boolean }) {
    return await this.personRepository.saveAll(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      Array.from(new Array(5), (_val, index) => ({
        name: `test${index}`,
      })),
      { emitEvents: options.emitEvents },
    );
  }

  async saveOne(options: { emitEvents: boolean }) {
    return await this.personRepository.save(
      {
        name: 'testname123',
      },
      { emitEvents: options.emitEvents, data: { order: 0 } },
    );
  }

  async findOne() {
    const person = await this.personRepository.save(
      {
        name: 'testname123',
      },
      { emitEvents: false },
    );

    return await this.personRepository.findOne(person._key);
  }

  async findOneNull() {
    return await this.personRepository.findOne('invalid_key_1235448949196');
  }

  async findOneBy() {
    await this.personRepository.save(
      {
        name: 'testname123',
      },
      { emitEvents: false },
    );

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
      { emitEvents: false },
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
      { emitEvents: false },
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
      { emitEvents: false },
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
      { emitEvents: false },
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

  async replace(options: { emitEvents: boolean }) {
    const entry = await this.personRepository.save(
      {
        name: 'testname123',
        email: 'example@test.com',
      },
      { emitEvents: false },
    );

    return await this.personRepository.replace(
      entry._key,
      {
        name: 'replacedname123',
      },
      { returnOld: true, emitEvents: options.emitEvents, data: { order: 0 } },
    );
  }

  async replaceAll(options: { emitEvents: boolean }) {
    const entries = await this.personRepository.saveAll(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      Array.from(new Array(5), (_val, index) => ({
        name: `Common Name`,
        email: `email${index}@test.com`,
      })),
      { emitEvents: false },
    );

    return await this.personRepository.replaceAll(
      entries.map((entry) => {
        return { ...entry, email: 'replaced.email@test.com' };
      }),
      { returnOld: true, emitEvents: options.emitEvents },
    );
  }

  async update(options: { emitEvents: boolean }) {
    const entry = await this.personRepository.save(
      {
        name: 'testname123',
      },
      { emitEvents: false },
    );

    return await this.personRepository.update(
      {
        _key: entry._key,
        name: 'updatedname123',
      },
      { returnOld: true, emitEvents: options.emitEvents, data: { order: 0 } },
    );
  }

  async updateAll(options: { emitEvents: boolean }) {
    const entries = await this.personRepository.saveAll(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      Array.from(new Array(5), (_val, index) => ({
        name: `Common Name`,
        email: `email${index}@test.com`,
      })),
      { emitEvents: false },
    );

    return await this.personRepository.updateAll(
      entries.map((entry) => {
        return { _key: entry._key, email: 'updated.email@test.com' };
      }),
      { returnOld: true, emitEvents: options.emitEvents },
    );
  }

  async upsert(options: { emitEvents: boolean }) {
    await this.personRepository.save(
      {
        name: `Common Name`,
      },
      { emitEvents: false },
    );
    const result = [];
    try {
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
        { emitEvents: options.emitEvents, data: { order: 0 } },
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
        { emitEvents: options.emitEvents, data: { order: 1 } },
      );

      return result;
    } catch (error) {}
  }

  async remove(options: { emitEvents: boolean }) {
    const entry = await this.personRepository.save(
      {
        name: 'testname123',
      },
      { emitEvents: false },
    );

    return await this.personRepository.remove(entry._key, {
      emitEvents: options.emitEvents,
      data: { order: 0 },
    });
  }

  async removeBy(options: { emitEvents: boolean }) {
    await this.personRepository.saveAll(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      Array.from(new Array(5), (_val, index) => ({
        name: `test${index}`,
        email: 'common.email@test.com',
      })),
      { emitEvents: false },
    );

    return await this.personRepository.removeBy(
      {
        email: 'common.email@test.com',
      },
      { emitEvents: options.emitEvents },
    );
  }

  async removeAll(options: { emitEvents: boolean }) {
    const entries = await this.personRepository.saveAll(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      Array.from(new Array(5), (_val, index) => ({
        name: `test${index}`,
        email: 'common.email@test.com',
      })),
      { emitEvents: false },
    );

    return await this.personRepository.removeAll(
      entries.map((entry) => entry._key),
      { emitEvents: options.emitEvents },
    );
  }

  async truncate() {
    await this.personRepository.saveAll(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      Array.from(new Array(5), (_val, index) => ({
        name: `test${index}`,
        email: 'common.email@test.com',
      })),
      { emitEvents: false },
    );
    await this.personRepository.truncate();

    return await this.personRepository.findAll();
  }

  async upsertDecorator() {
    await this.upsert({ emitEvents: true });

    const result = await this.personRepository.findMany([
      'beforeUpsert0',
      'beforeUpsert1',
      'afterUpdate0',
      'afterSave1',
    ]);
    return result;
  }

  async updateDecorator() {
    await this.update({ emitEvents: true });

    const result = await this.personRepository.findMany([
      'beforeUpdate0',
      'afterUpdate0',
    ]);
    return result;
  }

  async replaceDecorator() {
    await this.replace({ emitEvents: true });

    const result = await this.personRepository.findMany([
      'beforeReplace0',
      'afterReplace0',
    ]);
    return result;
  }

  async saveDecorator() {
    await this.saveOne({ emitEvents: true });

    const result = await this.personRepository.findMany([
      'beforeSave0',
      'afterSave0',
    ]);
    return result;
  }

  async removeDecorator() {
    await this.remove({ emitEvents: true });

    const result = await this.personRepository.findOne('afterRemove0');
    return result;
  }
}
