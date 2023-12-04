import { GeneratedAqlQuery } from 'arangojs/aql';
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
    ? ExcludeFunctions<T> & EdgeMetadata
    : ExcludeFunctions<T>;

export type DocumentUpdate<T extends ArangoDocument | ArangoDocumentEdge> =
  ExcludeFunctions<DeepPartial<T>> & (ObjectWithKey | ObjectWithId);

export type DocumentUpsertUpdate<
  T extends ArangoDocument | ArangoDocumentEdge,
> = {
  [K in keyof T]: T[K] extends object
    ? DocumentUpsertUpdate<T[K]> | GeneratedAqlQuery | null | undefined
    : T[K] | null | undefined | GeneratedAqlQuery;
};

export type DocumentReplace<T extends ArangoDocument | ArangoDocumentEdge> =
  ExcludeFunctions<T> & (ObjectWithKey | ObjectWithId);

type FunctionPropertyNames<T> = {
  [K in keyof T]: T[K] extends Function ? K : never;
}[keyof T];

export type ExcludeFunctions<T> = Omit<T, FunctionPropertyNames<T>>;

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
