import {
  DocumentData,
  DocumentMetadata,
  DocumentSelector,
  Patch,
} from 'arangojs/documents';
import { DeepPartial } from '../common';
import { ArangoDocument, ArangoDocumentEdge } from '../documents';

export type DocumentUpdate<T extends ArangoDocument | ArangoDocumentEdge> =
  DeepPartial<T> & ({ _key: string } | { _id: string });

export type DocumentsReplaceAll<T extends ArangoDocument | ArangoDocumentEdge> =
  (DeepPartial<T> &
    (
      | {
          _key: string;
        }
      | {
          _id: string;
        }
    ))[];

export type DocumentsUpdateAll<T extends ArangoDocument | ArangoDocumentEdge> =
  (Patch<DocumentData<T>> & { _key: string })[];

export type DocumentsFindMany = string[] | DocumentMetadata[];

export type DocumentsFindOne = string | DocumentSelector;
