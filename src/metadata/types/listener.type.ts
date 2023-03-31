export type EventListener = () => void;

export enum EventListenerType {
  BEFORE_SAVE = 'before-save',
  BEFORE_UPDATE = 'before-update',
}
