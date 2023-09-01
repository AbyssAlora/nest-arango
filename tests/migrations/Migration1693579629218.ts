import { Database, Migration } from 'nest-arango';

export class Migration1693579629218 implements Migration {
  async up(database: Database): Promise<void> {
    await database.createCollection('People', {
      keyOptions: {
        type: 'uuid',
      },
    });
  }

  async down(database: Database): Promise<void> {
    await database.collection('People').drop();
  }
}
