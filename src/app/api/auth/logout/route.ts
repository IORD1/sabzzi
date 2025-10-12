import { NextResponse } from 'next/server';
import { deleteSession } from '@/lib/session';

/**
 * POST - Logout (delete session)
 */
export async function POST() {
  try {
    await deleteSession();

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Error logging out:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}
