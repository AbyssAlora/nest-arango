import { DocumentOperationFailure } from 'arangojs/documents';

export function isDocumentOperationFailure(
  result: any,
): result is DocumentOperationFailure {
  if (result._key || result._id) return false;

  const error = result as unknown as DocumentOperationFailure;
  if (typeof error.error !== 'boolean') return false;
  if (typeof error.errorMessage !== 'string') return false;
  return (
    typeof error.errorNum === 'number' || typeof error.errorNum === 'string'
  );
}
