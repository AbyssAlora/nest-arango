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
  T extends { _from?: string | undefined; _to?: string | undefined }
    ? T & EdgeMetadata
    : T;

export type DocumentUpdate<T extends ArangoDocument | ArangoDocumentEdge> = T &
  (ObjectWithKey | ObjectWithId);

export type DocumentUpsertUpdate<T extends ArangoDocument | ArangoDocumentEdge> = {
  [K in keyof T]: T[K] extends object
    ? DocumentUpdate<T[K]> | GeneratedAqlQuery
    : T[K] | GeneratedAqlQuery;
};

export type DocumentReplace<T extends ArangoDocument | ArangoDocumentEdge> = T &
  (ObjectWithKey | ObjectWithId);

interface TransactionOptions {
  transaction?: Transaction;
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

export type SaveOptions = TransactionOptions;

export type UpdateOptions = TransactionOptions & ReturnOldOptions;

export type ReplaceOptions = TransactionOptions & ReturnOldOptions;

export type UpsertOptions = TransactionOptions;

export type RemoveOptions = TransactionOptions;

export type TruncateOptions = TransactionOptions;

export type ResultList<T extends ArangoDocument | ArangoDocumentEdge> = {
  totalCount: number;
  results: Document<T>[];
};
