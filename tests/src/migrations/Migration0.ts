import { Database, Migration } from '../../../src';
import { CollectionName } from '../enums/collection-name.enum';

export class Migration1740260291949 implements Migration {
  async up(database: Database): Promise<void> {
    await database.createCollection(CollectionName.People);
  }

  async down(database: Database): Promise<void> {
    await database.collection(CollectionName.People).drop();
  }
}
