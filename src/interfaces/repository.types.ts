import { GeneratedAqlQuery } from 'arangojs/aql';
import {
  CollectionInsertOptions,
  CollectionReplaceOptions,
  CollectionUpdateOptions,
} from 'arangojs/collection';
import {
  Document,
  EdgeMetadata,
  ObjectWithId,
  ObjectWithKey,
} from 'arangojs/documents';
import { Transaction } from 'arangojs/transaction';
import { DeepPartial } from '../common';
import { ArangoDocument, ArangoDocumentEdge } from '../documents';

export type DocumentTemplate<T extends ArangoDocument> = DeepPartial<T>;

export type DocumentSave<T extends ArangoDocument | ArangoDocumentEdge> =
  T extends {
    _from?: string | undefined;
    _to?: string | undefined;
  }
    ? OnlyProperties<T> & EdgeMetadata
    : OnlyProperties<T>;

export type DocumentUpdate<T extends ArangoDocument | ArangoDocumentEdge> = {
  [K in keyof T as T[K] extends Function ? never : K]?: T[K] extends object
    ? DocumentUpdate<T[K]>
    : T[K];
} & (ObjectWithKey | ObjectWithId);

export type DocumentUpdateWithAql<
  T extends ArangoDocument | ArangoDocumentEdge,
> = {
  [K in keyof T as T[K] extends Function ? never : K]?: T[K] extends object
    ? DocumentUpdateWithAql<T[K]> | GeneratedAqlQuery
    : T[K] | GeneratedAqlQuery;
} & (ObjectWithKey | ObjectWithId);

export type DocumentUpsertUpdate<
  T extends ArangoDocument | ArangoDocumentEdge,
> = {
  [K in keyof T as T[K] extends Function ? never : K]?: T[K] extends object
    ? DocumentUpsertUpdate<T[K]>
    : T[K];
};

export type DocumentUpsertUpdateWithAql<
  T extends ArangoDocument | ArangoDocumentEdge,
> = {
  [K in keyof T as T[K] extends Function ? never : K]?: T[K] extends object
    ? DocumentUpsertUpdateWithAql<T[K]> | GeneratedAqlQuery
    : T[K] | GeneratedAqlQuery;
};

export type DocumentReplace<T extends ArangoDocument | ArangoDocumentEdge> =
  DocumentSave<T> & (ObjectWithKey | ObjectWithId);

export type OnlyProperties<T extends ArangoDocument | ArangoDocumentEdge> = {
  [K in keyof T as T[K] extends Function ? never : K]: T[K];
};

interface TransactionOptions {
  transaction?: Transaction;
}

interface ContextOptions<ContextData = any> {
  emitEvents?: boolean;
  data?: ContextData;
}

interface PaginationOptions {
  page?: number;
  pageSize?: number;
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
  CollectionUpdateOptions;

export type ReplaceOptions<R = any> = TransactionOptions &
  ContextOptions<R> &
  CollectionReplaceOptions;

export type UpsertOptions<R = any> = TransactionOptions &
  ContextOptions<R> &
  CollectionUpdateOptions &
  CollectionInsertOptions;

export type RemoveOptions<R = any> = TransactionOptions & ContextOptions<R>;

export type TruncateOptions = TransactionOptions;

export type ResultList<T extends ArangoDocument | ArangoDocumentEdge> = {
  totalCount: number;
  results: Document<T>[];
};

export class ArangoNewOldResult<T> extends Array<T> {
  get new(): T | undefined {
    return this[0];
  }

  get old(): T | undefined {
    return this[1];
  }
}
