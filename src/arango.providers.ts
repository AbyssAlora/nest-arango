import { Provider } from '@nestjs/common';
import { getDocumentToken, getManagerToken } from './common/arango.util';
import { Constructable } from './common/constructable.interface';
import { AsyncEntityFactory } from './interfaces/entity-factory.interface';
import { ArangoManager } from './manager';
import { ArangoRepository } from './repository/arango.repository';

export const createArangoProviders = (
  entities: Constructable[],
  connectionName?: string,
): Provider[] => {
  const arangoManagerName = getManagerToken(connectionName);

  const repositoryProviders: Provider[] = entities.map((entity) => {
    return {
      provide: getDocumentToken(entity.name, connectionName),
      useFactory: async (arangoManager: ArangoManager) => {
        return new ArangoRepository(arangoManager, new entity());
      },
      inject: [arangoManagerName],
    };
  });

  return [...repositoryProviders];
};

export const createArangoAsyncProviders = (
  entitieFactories: AsyncEntityFactory[],
  connectionName?: string,
): Provider[] => {
  const arangoManagerName = getManagerToken(connectionName);

  const repositoryProviders: Provider[] = entitieFactories.map((provider) => {
    return {
      provide: getDocumentToken(provider.name, connectionName),
      useFactory: async (arangoManager: ArangoManager, ...args: unknown[]) => {
        const entity = await provider.useFactory(args);
        return new ArangoRepository(arangoManager, entity);
      },
      inject: [arangoManagerName, ...(provider.inject || [])],
    };
  });

  return [...repositoryProviders];
};
