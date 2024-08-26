import {
  DynamicModule,
  Global,
  Inject,
  Module,
  OnApplicationShutdown,
  Provider,
  Type,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Database } from 'arangojs';
import {
  ARANGO_CONNECTION_NAME,
  ARANGO_MODULE_OPTIONS,
} from './arango.constants';
import { getConnectionToken, getManagerToken } from './common/arango.util';
import {
  ArangoModuleAsyncOptions,
  ArangoModuleFactoryOptions,
  ArangoModuleOptions,
  ArangoOptionsFactory,
} from './interfaces/arango-options.interface';
import { ArangoManager } from './manager/arango.manager';

@Global()
@Module({})
export class ArangoCoreModule implements OnApplicationShutdown {
  constructor(
    @Inject(ARANGO_CONNECTION_NAME) private readonly connectionName: string,
    private readonly moduleRef: ModuleRef,
  ) {}

  static forRoot(options: ArangoModuleOptions): DynamicModule {
    const { config, logLevel, connectionName, connectionFactory } = options;

    const arangoConnectionFactory =
      connectionFactory || ((config) => new Database(config));

    const arangoConnectionName = getConnectionToken(connectionName);

    const arangoConnectionNameProvider = {
      provide: ARANGO_CONNECTION_NAME,
      useValue: arangoConnectionName,
    };

    const connectionProvider: Provider = {
      provide: arangoConnectionName,
      useFactory: async (): Promise<Database> => {
        try {
          return arangoConnectionFactory(config);
        } catch (error) {
          throw error;
        }
      },
    };

    const managerProvider: Provider = {
      provide: getManagerToken(connectionName),
      useFactory: async (database: Database): Promise<ArangoManager> => {
        return new ArangoManager(database, logLevel);
      },
      inject: [arangoConnectionName],
    };

    return {
      module: ArangoCoreModule,
      providers: [
        connectionProvider,
        managerProvider,
        arangoConnectionNameProvider,
      ],
      exports: [connectionProvider, managerProvider],
    };
  }

  static forRootAsync(options: ArangoModuleAsyncOptions): DynamicModule {
    const arangoConnectionName = getConnectionToken(options.connectionName);
    const arangoManagerName = getManagerToken(options.connectionName);

    const arangoConnectionNameProvider = {
      provide: ARANGO_CONNECTION_NAME,
      useValue: arangoConnectionName,
    };

    const connectionProvider: Provider = {
      provide: arangoConnectionName,
      useFactory: async (
        arangoModuleOptions: ArangoModuleFactoryOptions,
      ): Promise<Database> => {
        const { config, connectionFactory } = arangoModuleOptions;

        const arangoConnectionFactory =
          connectionFactory || ((config) => new Database(config));

        try {
          return arangoConnectionFactory(config);
        } catch (error) {
          throw error;
        }
      },
      inject: [ARANGO_MODULE_OPTIONS],
    };

    const managerProvider: Provider = {
      provide: arangoManagerName,
      useFactory: async (
        database: Database,
        arangoModuleOptions: ArangoModuleFactoryOptions,
      ): Promise<ArangoManager> => {
        const { logLevel } = arangoModuleOptions;
        return new ArangoManager(database, logLevel);
      },
      inject: [arangoConnectionName, ARANGO_MODULE_OPTIONS],
    };

    const asyncProviders = this.createAsyncProviders(options);

    return {
      module: ArangoCoreModule,
      imports: options.imports,
      providers: [
        ...asyncProviders,
        connectionProvider,
        managerProvider,
        arangoConnectionNameProvider,
      ],
      exports: [connectionProvider, managerProvider],
    };
  }

  async onApplicationShutdown() {
    const connection = this.moduleRef?.get<Database>(this.connectionName);
    connection && connection.close();
  }

  private static createAsyncProviders(
    options: ArangoModuleAsyncOptions,
  ): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }
    const useClass = options.useClass as Type<ArangoOptionsFactory>;
    return [
      this.createAsyncOptionsProvider(options),
      {
        provide: useClass,
        useClass,
      },
    ];
  }

  private static createAsyncOptionsProvider(
    options: ArangoModuleAsyncOptions,
  ): Provider {
    if (options.useFactory) {
      return {
        provide: ARANGO_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }
    // `as Type<ArangoOptionsFactory>` is a workaround for microsoft/TypeScript#31603
    const inject = [
      (options.useClass || options.useExisting) as Type<ArangoOptionsFactory>,
    ];
    return {
      provide: ARANGO_MODULE_OPTIONS,
      useFactory: async (optionsFactory: ArangoOptionsFactory) =>
        await optionsFactory.createArangoOptions(),
      inject,
    };
  }
}
