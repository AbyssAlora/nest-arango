import { Database } from 'arangojs';
import { Transaction } from 'arangojs/transactions';
import { ArangoDocument, ArangoRepository } from '..';

export interface EventListenerContext<T extends ArangoDocument = any, R = any> {
  old?: T;
  new?: T;
  info: { current: number };
  transaction?: Transaction;
  database?: Database;
  data?: R;
  repository?: ArangoRepository<T>;
}
