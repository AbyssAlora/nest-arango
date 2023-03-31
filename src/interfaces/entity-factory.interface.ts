import { ArangoDocumentEdge } from '../documents/arango-edge.document';
import { ArangoDocument } from '../documents/arango.document';
import { ModuleMetadata } from '@nestjs/common';

export interface AsyncEntityFactory extends Pick<ModuleMetadata, 'imports'> {
  name: string;
  useFactory: (
    ...args: any[]
  ) =>
    | ArangoDocument
    | ArangoDocumentEdge
    | Promise<ArangoDocument | ArangoDocumentEdge>;
  inject?: any[];
}
