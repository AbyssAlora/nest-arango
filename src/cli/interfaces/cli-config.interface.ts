import { Config as DatabaseConfig } from 'arangojs/connection';

export interface CliConfig {
  database: DatabaseConfig;
  migrationsCollection: string;
  cli: {
    migrationsDir: string;
  };
}
