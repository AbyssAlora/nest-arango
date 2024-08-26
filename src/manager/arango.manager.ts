import { Injectable, Logger } from '@nestjs/common';
import { Database } from 'arangojs';
import { AqlLiteral, AqlQuery, isAqlLiteral, isAqlQuery } from 'arangojs/aql';
import { ArrayCursor } from 'arangojs/cursor';
import {
  QueryOptions,
  TransactionCollections,
  TransactionOptions,
} from 'arangojs/database';
import { Transaction } from 'arangojs/transaction';

@Injectable()
export class ArangoManager {
  private readonly _logger = new Logger(ArangoManager.name);

  private readonly _database: Database;
  private readonly _logLevel: number;

  constructor(database: Database, logLevel?: number) {
    this._database = database;
    this._logLevel = logLevel ?? 0;
  }

  get database(): Database {
    return this._database;
  }

  async beginTransaction(
    collections: TransactionCollections,
    options?: TransactionOptions,
  ): Promise<Transaction> {
    return await this._database.beginTransaction(collections, options);
  }

  async query<T = any>(
    query: AqlQuery<T>,
    options?: QueryOptions,
  ): Promise<ArrayCursor<T>>;
  async query<T = any>(
    query: string | AqlLiteral,
    bindVars?: Record<string, any>,
    options?: QueryOptions,
  ): Promise<ArrayCursor<T>>;
  async query<T = any>(
    query: string | AqlQuery | AqlLiteral,
    bindVars?: Record<string, any>,
    options: QueryOptions = {},
  ): Promise<ArrayCursor<T>> {
    if (isAqlQuery(query)) {
      options = bindVars ?? {};
      bindVars = query.bindVars;
      query = query.query;
    } else if (isAqlLiteral(query)) {
      query = query.toAQL();
    }

    if (this._logLevel == 1) {
      this._logger.debug(
        `-- query: ${query} -- bindVars: ${bindVars} -- options: ${options}`,
      );
    }

    return await this._database.query(query, bindVars, options);
  }
}
