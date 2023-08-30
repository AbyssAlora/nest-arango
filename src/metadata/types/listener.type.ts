import { EventListenerData } from '../../interfaces/event-listener-data.interface';

export type EventListener<T> = (data: EventListenerData<T>) => void;

export enum EventListenerType {
  BEFORE_SAVE = 'before-save',
  BEFORE_UPDATE = 'before-update',

  AFTER_SAVE = 'after-save',
  AFTER_UPDATE = 'after-update',

  BEFORE_REMOVE = 'before-remove',
  AFTER_REMOVE = 'after-remove',
}
