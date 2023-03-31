import { Constructable } from '../common/constructable.interface';
import { TypeMetadataStorage } from '../metadata/storages/type-metadata.storage';

type CollectionDecorator<T extends Constructable> = (constructor: T) => T;

export function Collection<T extends Constructable>(
  name: string,
): CollectionDecorator<T> {
  return function (constructor: T): T {
    TypeMetadataStorage.registerMetadata({
      collection: name,
      entity: constructor.name,
      constructor: constructor,
    });
    return constructor;
  };
}
