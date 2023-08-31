import {
  Document,
  DocumentData,
  DocumentMetadata,
  DocumentSelector,
  Patch,
} from 'arangojs/documents';
import { Transaction } from 'arangojs/transaction';
import { DeepPartial } from '../common';
import { ArangoDocument, ArangoDocumentEdge } from '../documents';

interface TransactionOptions {
  transaction?: Transaction;
}

interface ContextOptions<ContextData = any> {
  data?: ContextData;
}

interface PaginationOptions {
  page?: number;
  pageSize?: number;
}

interface ReturnOldOptions {
  returnOld?: boolean;
}

interface SortingOptions {
  sort?: Record<string, SortDirection>;
}

export enum SortDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

export type GetDocumentCountByOptions = TransactionOptions;

export type FindOneOptions = TransactionOptions;

export type FindOneByOptions = TransactionOptions;

export type FindManyOptions = TransactionOptions;

export type FindManyByOptions = TransactionOptions &
  PaginationOptions &
  SortingOptions;

export type FindAllOptions = TransactionOptions &
  PaginationOptions &
  SortingOptions;

export type SaveOptions<R = any> = TransactionOptions & ContextOptions<R>;

export type UpdateOptions<R = any> = TransactionOptions &
  ContextOptions<R> &
  ReturnOldOptions;

export type ReplaceOptions<R = any> = TransactionOptions &
  ContextOptions<R> &
  ReturnOldOptions;

export type UpsertOptions<R = any> = TransactionOptions & ContextOptions<R>;

export type RemoveOptions<R = any> = TransactionOptions & ContextOptions<R>;

export type TruncateOptions = TransactionOptions;

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

export type ResultList<T extends ArangoDocument | ArangoDocumentEdge> = {
  totalCount: number;
  results: Document<T>[];
};
