import { ModuleMetadata, Type } from '@nestjs/common';
import { Database } from 'arangojs';
import { ConfigOptions } from 'arangojs/configuration';

export interface ArangoModuleOptions {
  config: ConfigOptions;
  connectionName?: string;
  debug?: boolean;
  connectionFactory?: (config: ConfigOptions) => Database;
}

export interface ArangoOptionsFactory {
  createArangoOptions(): Promise<ArangoModuleOptions> | ArangoModuleOptions;
}

export type ArangoModuleFactoryOptions = Omit<
  ArangoModuleOptions,
  'connectionName'
>;

export interface ArangoModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  connectionName?: string;
  useExisting?: Type<ArangoOptionsFactory>;
  useClass?: Type<ArangoOptionsFactory>;
  useFactory?: (
    ...args: any[]
  ) => Promise<ArangoModuleFactoryOptions> | ArangoModuleFactoryOptions;
  inject?: any[];
}
