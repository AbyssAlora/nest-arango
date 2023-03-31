import { EventListenerType, EventListener } from '../types/listener.type';

export class EventListenerMetadataStorageHost {
  private metadataMap = new Map<
    string,
    Map<EventListenerType, EventListener>
  >();

  registerMetadata(
    entity: string,
    event: EventListenerType,
    action: EventListener,
  ) {
    if (!this.metadataMap.get(entity)) {
      this.metadataMap.set(entity, new Map<EventListenerType, EventListener>());
    }
    this.metadataMap.get(entity)?.set(event, action);
  }

  getMetadata(
    entity: string,
  ): Map<EventListenerType, EventListener> | undefined {
    return this.metadataMap.get(entity);
  }
}

const globalRef = global as any;
export const EventListenerMetadataStorage: EventListenerMetadataStorageHost =
  globalRef.ArangoEventListenerMetadataStorage ||
  (globalRef.ArangoEventListenerMetadataStorage =
    new EventListenerMetadataStorageHost());
