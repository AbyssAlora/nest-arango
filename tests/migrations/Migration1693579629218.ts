import { Database, Migration } from 'nest-arango';
import { CollectionName } from '../src/collection-names';

export class Migration1693579629218 implements Migration {
  async up(database: Database): Promise<void> {
    await database.createCollection(CollectionName.People, {
      keyOptions: {
        type: 'uuid',
      },
    });
  }

  async down(database: Database): Promise<void> {
    await database.collection(CollectionName.People).drop();
  }
}
