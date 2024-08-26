import { register } from 'ts-node';

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
