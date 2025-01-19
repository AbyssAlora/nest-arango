import { ModuleMetadata, Type } from '@nestjs/common';
import { Database } from 'arangojs';
import { Config } from 'arangojs/connection';

export interface ArangoModuleOptions {
  config: Config;
  connectionName?: string;
  debug?: boolean;
  connectionFactory?: (config: Config) => Database;
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
