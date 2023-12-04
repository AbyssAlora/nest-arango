import { EventListenerMetadataStorage } from '../../metadata/storages/event-metadata.storage';
import {
  EventListenerType,
  EventListener,
} from '../../metadata/types/listener.type';

export const AfterUpdate = (): PropertyDecorator => {
  return (target: any, propertyKey: string | symbol): void => {
    EventListenerMetadataStorage.registerMetadata(
      target.constructor.name,
      EventListenerType.AFTER_UPDATE,
      target[propertyKey] as EventListener<any>,
    );
  };
};
