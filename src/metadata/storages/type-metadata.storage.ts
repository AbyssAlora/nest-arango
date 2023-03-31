import { Constructable } from '../../common/constructable.interface';

export interface TypeMetadata {
  collection: string;
  entity: string;
  constructor: Constructable;
}

export class TypeMetadataStorageHost {
  private metadataMap = new Map<string, TypeMetadata>();

  registerMetadata(metadata: TypeMetadata) {
    this.metadataMap.set(metadata.entity, metadata);
  }

  getMetadata(entity: string): TypeMetadata {
    return this.metadataMap.get(entity) as TypeMetadata;
  }
}

const globalRef = global as any;
export const TypeMetadataStorage: TypeMetadataStorageHost =
  globalRef.ArangoTypeMetadataStorage ||
  (globalRef.ArangoTypeMetadataStorage = new TypeMetadataStorageHost());
