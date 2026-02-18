import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from './auth.config';

/**
 * Result type for requireAuth helper.
 * Either returns an authenticated user context or an error response.
 */
export type AuthResult =
  | { success: true; userId: string; email: string }
  | { success: false; response: NextResponse };

/**
 * Server helper to require authentication for API routes.
 * Returns the authenticated userId or an unauthorized response.
 *
 * @example
 * ```ts
 * export async function GET() {
 *   const auth = await requireAuth();
 *   if (!auth.success) {
 *     return auth.response;
 *   }
 *   const { userId } = auth;
 *   // ... use userId for scoped queries
 * }
 * ```
 */
export async function requireAuth(): Promise<AuthResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      ),
    };
  }

  return {
    success: true,
    userId: session.user.id,
    email: session.user.email,
  };
}

/**
 * Get the authenticated user's ID or throw an error.
 * Use this in server actions or when you want to throw rather than return a response.
 *
 * @throws Error if not authenticated
 *
 * @example
 * ```ts
 * const userId = await getAuthUserId();
 * // userId is guaranteed to be a string
 * ```
 */
export async function getAuthUserId(): Promise<string> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error('Unauthorized: Authentication required');
  }

  return session.user.id;
}

/**
 * Get the full authenticated user context or throw an error.
 * Use this in server actions or when you need both userId and email.
 *
 * @throws Error if not authenticated
 */
export async function getAuthUser(): Promise<{ userId: string; email: string }> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error('Unauthorized: Authentication required');
  }

  return {
    userId: session.user.id,
    email: session.user.email,
  };
}
