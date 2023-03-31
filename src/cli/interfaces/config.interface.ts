import { Config as DatabaseConfig } from 'arangojs/connection';

interface CliConfig {
  migrationsDir: string;
}

export interface Config {
  database: DatabaseConfig;
  migrationsCollection: string;
  cli: CliConfig;
}
