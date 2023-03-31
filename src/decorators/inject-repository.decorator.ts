import { Inject } from '@nestjs/common';
import { getDocumentToken } from '../common/arango.util';
import { Constructable } from '../common/constructable.interface';

export const InjectRepository = (
  entity: Constructable,
  connectionName?: string,
) => Inject(getDocumentToken(entity.name, connectionName));
