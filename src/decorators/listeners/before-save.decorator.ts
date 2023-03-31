import { EventListenerMetadataStorage } from '../../metadata/storages/event-metadata.storage';
import {
  EventListenerType,
  EventListener,
} from '../../metadata/types/listener.type';

export const BeforeSave = (): PropertyDecorator => {
  return (target: any, propertyKey: string | symbol): void => {
    EventListenerMetadataStorage.registerMetadata(
      target.constructor.name,
      EventListenerType.BEFORE_SAVE,
      target[propertyKey] as EventListener,
    );
  };
};
