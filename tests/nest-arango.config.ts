import { CliConfig } from 'nest-arango';

const config: CliConfig = {
  database: {
    url: process.env.ARANGO__URL,
    databaseName: process.env.ARANGO__DATABASE,
    auth: {
      username: process.env.ARANGO__USERNAME,
      password: process.env.ARANGO__PASSWORD,
    },
    agentOptions: {
      rejectUnauthorized:
        process.env.ARANGO__REJECT_UNAUTHORIZED_CERT === 'true',
    },
  },
  migrationsCollection: 'Migrations',
  cli: {
    migrationsDir: 'migrations',
  },
};

export default config;
