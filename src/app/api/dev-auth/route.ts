import { NextResponse } from 'next/server';
import { ensureDevUser, isDevelopment } from '@/lib/dev-auth';

export async function POST() {
  if (!isDevelopment()) {
    return NextResponse.json(
      { error: 'Dev auth only available in development mode' },
      { status: 403 }
    );
  }

  try {
    const user = await ensureDevUser();

    return NextResponse.json({
      success: true,
      user,
      message: 'Dev user authenticated',
    });
  } catch (error) {
    console.error('Dev auth error:', error);
    return NextResponse.json(
      { error: 'Failed to authenticate dev user' },
      { status: 500 }
    );
  }
}
