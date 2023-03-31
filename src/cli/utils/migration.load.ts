import { Migration } from '../interfaces/migration.interface';
import { register } from 'ts-node';

export const loadMigration = async (filepath: string): Promise<Migration> => {
  const result = await import(filepath);
  const exported = result.default || result;

  for (const migration of Object.keys(exported)) {
    return new exported[migration]() as Migration;
  }

  throw new Error(
    `\x1b[31m* \x1b[0mMigration \x1b[34m${filepath}\x1b[0m is invalid.`,
  );
};

export const registerTSCompiler = async (): Promise<void> => {
  register({
    compilerOptions: {
      module: 'CommonJS',
      target: 'ESNext',
      importHelpers: true,
      allowJs: true,
      skipLibCheck: true,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      strict: true,
      forceConsistentCasingInFileNames: true,
      noFallthroughCasesInSwitch: true,
      moduleResolution: 'node',
      resolveJsonModule: true,
      isolatedModules: false,
      noEmit: true,
    },
  });
};
