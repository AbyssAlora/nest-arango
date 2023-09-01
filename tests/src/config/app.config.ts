import { registerAs } from '@nestjs/config';

export default registerAs('APP', () => ({
  VERSION: '0.0.1',
  PORT: parseInt(process.env.APP__PORT) || 3000,
  NODE: {
    ENV: process.env.NODE_ENV || 'dev',
  },
}));
