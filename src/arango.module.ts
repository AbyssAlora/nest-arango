import { ArangoCoreModule } from './arango-core.module';
import { DynamicModule, flatten, Module } from '@nestjs/common';
import {
  ArangoModuleOptions,
  ArangoModuleAsyncOptions,
} from './interfaces/arango-options.interface';
import {
  createArangoProviders,
  createArangoAsyncProviders,
} from './arango.providers';
import { Constructable } from './common/constructable.interface';
import { AsyncEntityFactory } from './interfaces/entity-factory.interface';

@Module({})
export class ArangoModule {
  static forRoot(options: ArangoModuleOptions): DynamicModule {
    return {
      module: ArangoModule,
      imports: [ArangoCoreModule.forRoot(options)],
    };
  }

  static forRootAsync(options: ArangoModuleAsyncOptions): DynamicModule {
    return {
      module: ArangoModule,
      imports: [ArangoCoreModule.forRootAsync(options)],
    };
  }

  static forFeature(
    entities: Constructable[],
    connectionName?: string,
  ): DynamicModule {
    const providers = createArangoProviders(entities, connectionName);
    return {
      module: ArangoModule,
      providers: [...providers],
      exports: [...providers],
    };
  }

  static forFeatureAsync(
    entityFactories: AsyncEntityFactory[],
    connectionName?: string,
  ): DynamicModule {
    const providers = createArangoAsyncProviders(
      entityFactories,
      connectionName,
    );
    const imports = entityFactories.map((factory) => factory.imports || []);
    const uniqueImports = new Set(flatten(imports));

    return {
      module: ArangoModule,
      imports: [...uniqueImports],
      providers: providers,
      exports: providers,
    };
  }
}
