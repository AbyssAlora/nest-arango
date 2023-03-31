#! /usr/bin/env node

import * as dotenv from 'dotenv';

import { Command } from 'commander';
import { Database } from 'arangojs';
import figlet from 'figlet';
import { loadConfig } from './utils/config.load';
import { CreateCommand } from './commands/create.command';
import { RunCommand } from './commands/run.command';
import { RevertCommand } from './commands/revert.command';
import { join } from 'path';

async function main() {
  const pwd = process.env.PWD ?? process.cwd();
  dotenv.config({ path: join(pwd, '.env') });

  const program = new Command();

  program
    .version('1.0.0')
    .description('A CLI tool for running and managing ArangoDB migrations.')
    .option('-c, --create', 'create a migration')
    .option('-r, --run', 'run all unprocessed migrations')
    .option('-R, --revert', 'revert last migration')
    .parse(process.argv);

  const options = program.opts();

  const config = await loadConfig(pwd);

  if (options.create) {
    await CreateCommand.execute(join(pwd, config.cli.migrationsDir));
    return;
  }

  const database: Database = new Database(config.database);

  if (options.run) {
    await RunCommand.execute(
      join(pwd, config.cli.migrationsDir),
      database,
      config.migrationsCollection,
    );
  } else if (options.revert) {
    await RevertCommand.execute(
      join(pwd, config.cli.migrationsDir),
      database,
      config.migrationsCollection,
    );
  } else {
    console.log(figlet.textSync('Nest-Arango'), '\n');
    program.outputHelp();
  }
}

main().catch((err: Error) => console.log(err));
