import { Provider } from '@nestjs/common';
import { Database } from 'arangojs';
import { getDocumentToken, getConnectionToken } from './common/arango.util';
import { Constructable } from './common/constructable.interface';
import { AsyncEntityFactory } from './interfaces/entity-factory.interface';
import { ArangoRepository } from './repository/arango.repository';

export const createArangoProviders = (
  entities: Constructable[],
  connectionName?: string,
): Provider[] => {
  const arangoConnectionName = getConnectionToken(connectionName);

  const repositoryProviders: Provider[] = entities.map((entity) => {
    return {
      provide: getDocumentToken(entity.name, connectionName),
      useFactory: async (database: Database) => {
        return new ArangoRepository(database, new entity());
      },
      inject: [arangoConnectionName],
    };
  });

  return [...repositoryProviders];
};

export const createArangoAsyncProviders = (
  entitieFactories: AsyncEntityFactory[],
  connectionName?: string,
): Provider[] => {
  const arangoConnectionName = getConnectionToken(connectionName);

  const repositoryProviders: Provider[] = entitieFactories.map((provider) => {
    return {
      provide: getDocumentToken(provider.name, connectionName),
      useFactory: async (database: Database, ...args: unknown[]) => {
        const entity = await provider.useFactory(args);
        return new ArangoRepository(database, entity);
      },
      inject: [arangoConnectionName, ...(provider.inject || [])],
    };
  });

  return [...repositoryProviders];
};
