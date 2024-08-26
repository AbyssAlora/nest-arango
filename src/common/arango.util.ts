import { AqlValue, isGeneratedAqlQuery } from 'arangojs/aql';
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

type AqlPart = {
  templateStrings: string[];
  args: AqlValue[];
};

export function aqlPart(
  templateStrings: TemplateStringsArray,
  ...args: AqlValue[]
): AqlPart {
  return {
    templateStrings: [...templateStrings],
    args: [...args],
  };
}

export const aqlConcat = (...parts: (AqlPart | string)[]) => {
  const result: AqlPart = {
    templateStrings: [],
    args: [],
  };

  for (const part of parts) {
    if (typeof part === 'string') {
      if (!result.templateStrings.length) {
        result.templateStrings.push(part);
      } else {
        result.templateStrings[result.templateStrings.length - 1] += part;
      }
    } else {
      if (!result.templateStrings.length) {
        result.templateStrings.push(...part.templateStrings);
      } else {
        result.templateStrings[result.templateStrings.length - 1] +=
          part.templateStrings[0];
        result.templateStrings.push(...part.templateStrings.slice(1));
      }

      result.args.push(...part.args);
    }
  }

  return result;
};

export const documentAQLBuilder = (obj: any) => {
  const objType = typeof obj;

  if (
    objType === 'number' ||
    objType === 'boolean' ||
    objType === 'string' ||
    isGeneratedAqlQuery(obj) ||
    obj === null
  ) {
    return aqlPart`${obj}`;
  }

  if (objType !== 'object') {
    throw new Error('cannot serialize object');
  }

  const _parts: (AqlPart | string)[] = [];

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      if (typeof obj[i] !== 'undefined') {
        _parts.push(...[documentAQLBuilder(obj[i]), ',']);
      }
    }
    return aqlConcat('[', ..._parts.slice(0, _parts.length - 1), ']');
  }

  const _keys = Object.keys(obj);
  for (let i = 0; i < _keys.length; i++) {
    if (typeof obj[_keys[i]] !== 'undefined') {
      _parts.push(
        ...[`"${_keys[i]}":`, documentAQLBuilder(obj[_keys[i]]), ','],
      );
    }
  }

  return aqlConcat('{', ..._parts.slice(0, _parts.length - 1), '}');
};
