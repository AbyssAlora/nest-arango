import { Database } from 'arangojs';

export interface Migration {
  up(database: Database): Promise<void>;
  down(database: Database): Promise<void>;
}
