import { ArangoDocument } from '../..';
import { EventListenerContext } from '../../interfaces/event-listener-context.interface';

export type EventListener<T extends ArangoDocument = any, R = any> = (
  context: EventListenerContext<T, R>,
) => void;

export enum EventListenerType {
  BEFORE_SAVE = 'before-save',
  AFTER_SAVE = 'after-save',

  BEFORE_UPDATE = 'before-update',
  AFTER_UPDATE = 'after-update',

  AFTER_REMOVE = 'after-remove',

  BEFORE_REPLACE = 'before-replace',
  AFTER_REPLACE = 'after-replace',

  BEFORE_UPSERT = 'before-upsert',
}
