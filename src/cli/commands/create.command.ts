import { writeFileSync } from 'fs';
import { join } from 'path';

export class CreateCommand {
  static async execute(outDir: string): Promise<void> {
    const migrationName = `Migration${Date.now()}`;
    const outputFile = join(outDir, `${migrationName}.ts`);

    const template = CreateCommand.templateTs(migrationName);

    writeFileSync(outputFile, template);
    console.log(
      `\x1b[32m* \x1b[0mMigration \x1b[34m${outputFile}\x1b[0m created.`,
    );
  }

  protected static templateTs(name: string): string {
    return `import { Migration, Database } from 'nest-arango';

export class ${name} implements Migration {
  async up(database: Database): Promise<void> {
    return;
  }

  async down(database: Database): Promise<void> {
    return;
  }
}
`;
  }
}
