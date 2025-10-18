import { describe, expect, it } from 'vitest';
import { transformFirestoreError } from '../../src/errors/firestoreErrorHandler';
import { BusinessLogicError, DuplicateError, NotFoundError, PermissionError, ValidationError } from '@fjell/core';

describe('transformFirestoreError', () => {
  const itemType = 'user';
  const key = { pk: 'user123', kt: 'user' };

  describe('Already exists errors', () => {
    it('should transform already-exists error', () => {
      const error = {
        code: 'already-exists',
        message: 'Document already exists'
      };

      const result = transformFirestoreError(error, itemType, key);

      expect(result).toBeInstanceOf(DuplicateError);
      expect(result.message).toContain('user already exists');
      expect((result as DuplicateError).errorInfo.context.key?.primary).toBe('user123');
    });
  });

  describe('Not found errors', () => {
    it('should transform not-found error', () => {
      const error = {
        code: 'not-found',
        message: 'Document not found'
      };

      const result = transformFirestoreError(error, itemType, key);

      expect(result).toBeInstanceOf(NotFoundError);
      expect(result.message).toContain('user not found');
      expect((result as NotFoundError).errorInfo.context.itemType).toBe('user');
    });
  });

  describe('Permission errors', () => {
    it('should transform permission-denied error', () => {
      const error = {
        code: 'permission-denied',
        message: 'Missing or insufficient permissions'
      };

      const result = transformFirestoreError(error, itemType, key);

      expect(result).toBeInstanceOf(PermissionError);
      expect(result.message).toContain('Insufficient permissions');
      expect((result as PermissionError).errorInfo.context.requiredPermission).toBe('write');
    });

    it('should transform unauthenticated error', () => {
      const error = {
        code: 'unauthenticated',
        message: 'Request is missing authentication'
      };

      const result = transformFirestoreError(error, itemType, key);

      expect(result).toBeInstanceOf(PermissionError);
      expect(result.message).toContain('Authentication required');
    });
  });

  describe('Validation errors', () => {
    it('should transform invalid-argument error', () => {
      const error = {
        code: 'invalid-argument',
        message: 'Invalid field value'
      };

      const result = transformFirestoreError(error, itemType, key);

      expect(result).toBeInstanceOf(ValidationError);
      expect(result.message).toContain('Invalid field value');
    });

    it('should transform invalid-argument error with default message', () => {
      const error = {
        code: 'invalid-argument'
      };

      const result = transformFirestoreError(error, itemType, key);

      expect(result).toBeInstanceOf(ValidationError);
      expect(result.message).toContain('Invalid data for user');
    });
  });

  describe('Business logic errors', () => {
    it('should transform failed-precondition error', () => {
      const error = {
        code: 'failed-precondition',
        message: 'Document must be created before updating'
      };

      const result = transformFirestoreError(error, itemType, key);

      expect(result).toBeInstanceOf(BusinessLogicError);
      expect(result.message).toContain('Document must be created before updating');
      expect((result as BusinessLogicError).errorInfo.details?.retryable).toBe(false);
    });

    it('should transform resource-exhausted error', () => {
      const error = {
        code: 'resource-exhausted',
        message: 'Quota exceeded'
      };

      const result = transformFirestoreError(error, itemType, key);

      expect(result).toBeInstanceOf(BusinessLogicError);
      expect(result.message).toContain('Rate limit exceeded');
      expect((result as BusinessLogicError).errorInfo.details?.retryable).toBe(true);
    });

    it('should transform aborted error', () => {
      const error = {
        code: 'aborted',
        message: 'Transaction aborted'
      };

      const result = transformFirestoreError(error, itemType, key);

      expect(result).toBeInstanceOf(BusinessLogicError);
      expect(result.message).toContain('concurrent modification');
      expect((result as BusinessLogicError).errorInfo.details?.retryable).toBe(true);
    });

    it('should transform deadline-exceeded error', () => {
      const error = {
        code: 'deadline-exceeded',
        message: 'Operation timeout'
      };

      const result = transformFirestoreError(error, itemType, key);

      expect(result).toBeInstanceOf(BusinessLogicError);
      expect(result.message).toContain('timed out');
      expect((result as BusinessLogicError).errorInfo.details?.retryable).toBe(true);
    });

    it('should transform unavailable error', () => {
      const error = {
        code: 'unavailable',
        message: 'Service unavailable'
      };

      const result = transformFirestoreError(error, itemType, key);

      expect(result).toBeInstanceOf(BusinessLogicError);
      expect(result.message).toContain('temporarily unavailable');
      expect((result as BusinessLogicError).errorInfo.details?.retryable).toBe(true);
    });

    it('should transform data-loss error', () => {
      const error = {
        code: 'data-loss',
        message: 'Data corruption detected'
      };

      const result = transformFirestoreError(error, itemType, key);

      expect(result).toBeInstanceOf(BusinessLogicError);
      expect(result.message).toContain('data loss');
      expect((result as BusinessLogicError).errorInfo.details?.retryable).toBe(false);
    });

    it('should transform cancelled error', () => {
      const error = {
        code: 'cancelled',
        message: 'Operation cancelled'
      };

      const result = transformFirestoreError(error, itemType, key);

      expect(result).toBeInstanceOf(BusinessLogicError);
      expect(result.message).toContain('cancelled');
      expect((result as BusinessLogicError).errorInfo.details?.retryable).toBe(true);
    });
  });

  describe('Unknown errors', () => {
    it('should pass through unknown errors unchanged', () => {
      const error = new Error('Unknown error');

      const result = transformFirestoreError(error, itemType, key);

      expect(result).toBe(error);
      expect(result.message).toBe('Unknown error');
    });

    it('should pass through errors without codes', () => {
      const error = {
        message: 'Something went wrong'
      };

      const result = transformFirestoreError(error, itemType, key);

      expect(result).toBe(error);
    });
  });
});

