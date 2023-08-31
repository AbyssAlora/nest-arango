import { Database } from 'arangojs';
import { Transaction } from 'arangojs/transaction';

export interface EventListenerContext<T = any, R = any> {
  old?: T;
  new?: T;
  info: { current: number; };
  transaction?: Transaction;
  database?: Database;
  data?: R;
}
