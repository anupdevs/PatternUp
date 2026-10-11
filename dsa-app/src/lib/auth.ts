import { auth } from '@clerk/nextjs/server';

export class UnauthorizedError extends Error {
  constructor(message = 'Authentication required. Please sign in.') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Access denied. You do not have permission to access this resource.') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/**
 * Retrieves the current authenticated user's ID from Clerk server session.
 * Returns null if the request is unauthenticated.
 */
export async function getAuthenticatedUser(): Promise<string | null> {
  try {
    const { userId } = await auth();
    return userId || null;
  } catch {
    return null;
  }
}

/**
 * Requires an authenticated user session.
 * Throws UnauthorizedError if no valid Clerk session exists.
 * NEVER trust user IDs sent from client payloads.
 */
export async function requireAuth(): Promise<string> {
  const userId = await getAuthenticatedUser();
  if (!userId) {
    throw new UnauthorizedError();
  }
  return userId;
}

/**
 * Asserts that the authenticated user owns the resource being accessed or modified.
 * Throws ForbiddenError if user IDs do not match.
 */
export function verifyOwnership(resourceOwnerId: string, currentUserId: string): void {
  if (resourceOwnerId !== currentUserId) {
    throw new ForbiddenError();
  }
}
