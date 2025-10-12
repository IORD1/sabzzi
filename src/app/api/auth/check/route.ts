import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

/**
 * GET - Check if user is authenticated
 */
export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      userId: session.userId,
      name: session.name,
    });
  } catch (error) {
    console.error('Error checking auth:', error);
    return NextResponse.json(
      { authenticated: false },
      { status: 401 }
    );
  }
}
