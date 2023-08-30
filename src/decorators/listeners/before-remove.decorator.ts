import { EventListenerMetadataStorage } from '../../metadata/storages/event-metadata.storage';
import {
  EventListenerType,
  EventListener,
} from '../../metadata/types/listener.type';

export const BeforeRemove = (): PropertyDecorator => {
  return (target: any, propertyKey: string | symbol): void => {
    EventListenerMetadataStorage.registerMetadata(
      target.constructor.name,
      EventListenerType.BEFORE_REMOVE,
      target[propertyKey] as EventListener<any>,
    );
  };
};
