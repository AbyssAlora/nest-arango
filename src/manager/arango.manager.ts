import { Injectable } from '@nestjs/common';
import { Database } from 'arangojs';
import { Transaction } from 'arangojs/transaction';
import { TransactionCollections, TransactionOptions } from 'arangojs/database';

@Injectable()
export class ArangoManager {
  private readonly _database: Database;

  constructor(database: Database) {
    this._database = database;
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
}
