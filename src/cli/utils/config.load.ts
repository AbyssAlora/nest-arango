import { join } from 'path';
import { CliConfig } from '../interfaces/cli-config.interface';

export const loadConfig = async (pwd: string): Promise<CliConfig> => {
  const filepath = join(pwd, 'nest-arango.config.ts');
  const result = await import(filepath);
  return result.default || result;
};
