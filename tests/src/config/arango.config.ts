import { registerAs } from '@nestjs/config';

export default registerAs('ARANGO', () => ({
  URL: process.env.ARANGO__URL,
  USERNAME: process.env.ARANGO__USERNAME,
  PASSWORD: process.env.ARANGO__PASSWORD,
  DATABASE: process.env.ARANGO__DATABASE,
  REJECT_UNAUTHORIZED_CERT:
    process.env.ARANGO__REJECT_UNAUTHORIZED_CERT === 'true',
}));
