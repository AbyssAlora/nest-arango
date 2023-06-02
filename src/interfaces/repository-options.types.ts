import { Transaction } from 'arangojs/transaction';

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

export type GetDocumentCountByOptions = TransactionOptions;

export type FindOneOptions = TransactionOptions;

export type FindOneByOptions = TransactionOptions;

export type FindManyOptions = TransactionOptions;

export type FindManyByOptions = TransactionOptions & PaginationOptions;

export type FindAllOptions = TransactionOptions & PaginationOptions;

export type SaveOptions = TransactionOptions;

export type UpdateOptions = TransactionOptions & ReturnOldOptions;

export type ReplaceOptions = TransactionOptions & ReturnOldOptions;

export type RemoveOptions = TransactionOptions;

export type TruncateOptions = TransactionOptions;
