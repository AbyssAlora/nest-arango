import { ConfigOptions as DatabaseConfig } from 'arangojs/configuration';

export interface CliConfig {
  database: DatabaseConfig;
  migrationsCollection: string;
  cli: {
    migrationsDir: string;
  };
}
