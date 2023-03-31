import { loadMigrationCollection } from './../utils/collection.load';
import { aql, Database } from 'arangojs';
import { loadMigration, registerTSCompiler } from './../utils/migration.load';
import { join } from 'path';

export class RevertCommand {
  static async execute(
    migrationsDir: string,
    database: Database,
    collectionName: string,
  ): Promise<void> {
    await registerTSCompiler();

    const migrationCol = await loadMigrationCollection(
      collectionName,
      database,
    );

    const cursor = await database.query(aql`
      WITH ${migrationCol}
      FOR migration IN ${migrationCol}
        SORT migration.timestamp DESC
        LIMIT 1
        RETURN migration
    `);

    if (!cursor.hasNext) {
      return;
    }

    const lastProcessedMigration = await cursor.next();
    const migrationFilePath = join(migrationsDir, lastProcessedMigration.name);

    try {
      const migration = await loadMigration(migrationFilePath);
      await migration.down(database);
      await migrationCol.remove(lastProcessedMigration);
      console.log(
        `\x1b[31m↓ \x1b[0mMigration \x1b[34m${migrationFilePath}\x1b[0m reverted.`,
      );
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.log(err.message);
      } else {
        console.log(err);
      }
      return;
    }
  }
}
