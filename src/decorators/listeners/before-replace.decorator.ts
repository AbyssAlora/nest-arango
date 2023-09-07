import { EventListenerMetadataStorage } from '../../metadata/storages/event-metadata.storage';
import {
  EventListener,
  EventListenerType,
} from '../../metadata/types/listener.type';

export const BeforeReplace = (): PropertyDecorator => {
  return (target: any, propertyKey: string | symbol): void => {
    EventListenerMetadataStorage.registerMetadata(
      target.constructor.name,
      EventListenerType.BEFORE_REPLACE,
      target[propertyKey] as EventListener<any>,
    );
  };
};
