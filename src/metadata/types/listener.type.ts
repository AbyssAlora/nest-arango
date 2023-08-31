import { EventListenerContext } from '../../interfaces/event-listener-context.interface';

export type EventListener<T = any, R = any> = (context: EventListenerContext<T, R>) => void;

export enum EventListenerType {
  BEFORE_SAVE = 'before-save',
  BEFORE_UPDATE = 'before-update',

  AFTER_SAVE = 'after-save',
  AFTER_UPDATE = 'after-update',

  BEFORE_REMOVE = 'before-remove',
  AFTER_REMOVE = 'after-remove',

  BEFORE_UPSERT = 'before-upsert',
}
