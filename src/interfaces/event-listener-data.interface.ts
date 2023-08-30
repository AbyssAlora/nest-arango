import { Database } from 'arangojs';
import { Transaction } from 'arangojs/transaction';

export interface EventListenerData<T> {
  old?: T;
  new?: T;
  transaction?: Transaction;
  database?: Database;
}
