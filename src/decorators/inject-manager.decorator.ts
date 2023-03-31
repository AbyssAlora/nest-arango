import { Inject } from '@nestjs/common';
import { getManagerToken } from '../common/arango.util';

export const InjectManager = (connectionName?: string) =>
  Inject(getManagerToken(connectionName));
