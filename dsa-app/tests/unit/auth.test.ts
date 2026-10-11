import { describe, it } from 'node:test';
import assert from 'node:assert';
import { verifyOwnership, UnauthorizedError, ForbiddenError } from '../../src/lib/auth';

describe('Authentication & Authorization Helpers', () => {
  it('allows access when resource owner matches current authenticated user', () => {
    assert.doesNotThrow(() => {
      verifyOwnership('user_clerk_123', 'user_clerk_123');
    });
  });

  it('throws ForbiddenError when user tries to access another user\'s private resource', () => {
    assert.throws(
      () => {
        verifyOwnership('user_victim_123', 'user_attacker_456');
      },
      (err: unknown) => {
        return err instanceof ForbiddenError;
      }
    );
  });

  it('provides correct default messages on error instances', () => {
    const unauth = new UnauthorizedError();
    assert.strictEqual(unauth.message, 'Authentication required. Please sign in.');

    const forbidden = new ForbiddenError();
    assert.strictEqual(
      forbidden.message,
      'Access denied. You do not have permission to access this resource.'
    );
  });
});
