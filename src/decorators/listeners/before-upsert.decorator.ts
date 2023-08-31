import { EventListenerMetadataStorage } from '../../metadata/storages/event-metadata.storage';
import {
  EventListenerType,
  EventListener,
} from '../../metadata/types/listener.type';

export const BeforeUpsert = (): PropertyDecorator => {
  return (target: any, propertyKey: string | symbol): void => {
    EventListenerMetadataStorage.registerMetadata(
      target.constructor.name,
      EventListenerType.BEFORE_UPSERT,
      target[propertyKey] as EventListener<any>,
    );
  };
};
