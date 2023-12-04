import { ArangoDocument } from './arango.document';

export class ArangoDocumentEdge extends ArangoDocument {
  _from?: string | undefined;
  _to?: string | undefined;
}
