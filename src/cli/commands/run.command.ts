import { loadMigrationCollection } from './../utils/collection.load';
import { aql, Database } from 'arangojs';
import { loadMigration, registerTSCompiler } from './../utils/migration.load';
import { readdirSync } from 'fs';
import { join } from 'path';

export class RunCommand {
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
        SORT migration.timestamp
        RETURN migration
    `);

    const processedMigrations: string[] = [];

    while (cursor.hasNext) {
      const migration = await cursor.next();
      processedMigrations.push(migration.name);
    }

    const migrationFiles = readdirSync(migrationsDir)
      .sort((a,b) => a.localeCompare(b));
    for (const migrationFile of migrationFiles) {
      try {
        const migrationFilePath = join(migrationsDir, migrationFile);
        const migration = await loadMigration(migrationFilePath);

        if (processedMigrations.includes(migrationFile)) {
          continue;
        }

        await migration.up(database);

        await migrationCol.save({
          name: migrationFile,
          timestamp: Date.now(),
        });

        console.log(
          `\x1b[32m↑ \x1b[0mMigration \x1b[34m${migrationFilePath}\x1b[0m done.`,
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
}
