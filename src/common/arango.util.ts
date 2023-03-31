import { DEFAULT_DB_CONNECTION } from '../arango.constants';

export const getDocumentToken = (
  model: string,
  connectionName?: string,
): string => {
  if (connectionName === undefined) {
    return `${model}Document`;
  }
  return `${getConnectionToken(connectionName)}/${model}Document`;
};

export const getConnectionToken = (name?: string): string => {
  return name && name !== DEFAULT_DB_CONNECTION
    ? `${name}Connection`
    : DEFAULT_DB_CONNECTION;
};

export const getManagerToken = (connectionName?: string): string => {
  return `${getConnectionToken(connectionName)}/Manager`;
};
