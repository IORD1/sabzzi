import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const SESSION_COOKIE_NAME = 'sabzzi-session';

export interface SessionData {
  userId: string;
  name: string;
}

/**
 * Create a session by setting a secure cookie
 */
export async function createSession(userId: string, name: string): Promise<void> {
  const sessionData: SessionData = { userId, name };
  const cookieStore = await cookies();

  const isProduction = process.env.NODE_ENV === 'production';

  cookieStore.set(SESSION_COOKIE_NAME, JSON.stringify(sessionData), {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax', // 'strict' for better security in production
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });
}

/**
 * Get session data from cookie
 */
export async function getSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

    if (!sessionCookie?.value) {
      return null;
    }

    const sessionData = JSON.parse(sessionCookie.value) as SessionData;
    return sessionData;
  } catch (error) {
    console.error('Error parsing session:', error);
    return null;
  }
}

/**
 * Delete session cookie
 */
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Get userId from session, throw error if not authenticated
 */
export async function requireAuth(): Promise<SessionData> {
  const session = await getSession();

  if (!session) {
    throw new Error('Unauthorized');
  }

  return session;
}

/**
 * Add session cookie to a response
 */
export function setSessionCookie(
  response: NextResponse,
  userId: string,
  name: string
): NextResponse {
  const sessionData: SessionData = { userId, name };

  const isProduction = process.env.NODE_ENV === 'production';

  response.cookies.set(SESSION_COOKIE_NAME, JSON.stringify(sessionData), {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax', // 'strict' for better security in production
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });

  return response;
}
