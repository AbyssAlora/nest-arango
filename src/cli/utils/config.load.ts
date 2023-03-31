import { join } from 'path';
import { Config } from './../interfaces/config.interface';

const EnvTypesMap: { [x: string]: (k: string) => string | number | boolean } = {
  boolean: (value: string) => value === 'true',
  number: (value: string) => parseFloat(value),
  string: (value: string) => value,
};

const processProperties = (obj: any) => {
  for (const k in obj) {
    if (typeof obj[k] === 'object' && obj[k] !== null) {
      processProperties(obj[k]);
    } else if (obj.hasOwnProperty(k)) {
      if (typeof obj[k] === 'string') {
        const [loadFrom, key, type] = (obj[k] as string).split(':');
        if (loadFrom === 'env') {
          obj[k] = EnvTypesMap[type ?? 'string'](process.env[key] ?? '');
        }
      }
    }
  }
};

export const loadConfig = async (pwd: string) => {
  const config = await import(join(pwd, 'nest-arango.json'));
  processProperties(config);
  return config as Config;
};
