import {
  BusinessLogicError,
  DuplicateError,
  NotFoundError,
  PermissionError,
  ValidationError
} from "@fjell/core";

/**
 * Transforms Firestore-specific errors into Fjell error types.
 *
 * Firebase SDK provides consistent string codes across all environments:
 * - 'already-exists', 'not-found', 'permission-denied', 'invalid-argument', etc.
 * - These are based on gRPC status names (not numeric gRPC codes)
 * - No numeric codes are exposed by the Firebase SDK
 *
 * @param error - The Firestore error to transform
 * @param itemType - The type of item being operated on
 * @param key - Optional key context for the error
 * @returns A Fjell error type or the original error if not recognized
 */
export function transformFirestoreError(error: any, itemType: string, key?: any): Error {
  // Handle Firestore 'already-exists' errors
  if (error.code === 'already-exists') {
    return new DuplicateError(
      `${itemType} already exists`,
      key,
      'document'
    );
  }

  // Handle Firestore 'not-found' errors
  if (error.code === 'not-found') {
    return new NotFoundError(
      `${itemType} not found`,
      itemType,
      key
    );
  }

  // Handle permission denied errors
  if (error.code === 'permission-denied') {
    return new PermissionError(
      'Insufficient permissions for this operation',
      'write',
      ['read', 'write']
    );
  }

  // Handle invalid argument errors
  if (error.code === 'invalid-argument') {
    return new ValidationError(
      error.message || `Invalid data for ${itemType}`,
      void 0,
      'Check the data format and try again'
    );
  }

  // Handle failed precondition errors
  if (error.code === 'failed-precondition') {
    return new BusinessLogicError(
      error.message || 'Operation failed due to precondition',
      'Ensure all prerequisites are met before retrying',
      false
    );
  }

  // Handle rate limit / quota exceeded errors
  if (error.code === 'resource-exhausted') {
    return new BusinessLogicError(
      'Rate limit exceeded',
      'Wait a moment before retrying',
      true
    );
  }

  // Handle unauthenticated errors
  if (error.code === 'unauthenticated') {
    return new PermissionError(
      'Authentication required',
      'authenticate',
      ['authenticate']
    );
  }

  // Handle transaction abort errors
  if (error.code === 'aborted') {
    return new BusinessLogicError(
      'Operation was aborted due to a concurrent modification',
      'Retry the operation',
      true
    );
  }

  // Handle deadline exceeded (timeout) errors
  if (error.code === 'deadline-exceeded') {
    return new BusinessLogicError(
      'Operation timed out',
      'Try again or simplify the operation',
      true
    );
  }

  // Handle unavailable errors (service temporarily down)
  if (error.code === 'unavailable') {
    return new BusinessLogicError(
      'Service temporarily unavailable',
      'Try again in a few moments',
      true
    );
  }

  // Handle data loss errors
  if (error.code === 'data-loss') {
    return new BusinessLogicError(
      'Unrecoverable data loss or corruption',
      'Contact support',
      false
    );
  }

  // Handle cancelled errors
  if (error.code === 'cancelled') {
    return new BusinessLogicError(
      'Operation was cancelled',
      'Try the operation again if needed',
      true
    );
  }

  // Pass through other errors unchanged
  return error;
}

