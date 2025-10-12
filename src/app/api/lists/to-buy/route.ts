import { NextRequest, NextResponse } from 'next/server';
import { getSabzziDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    // TODO: Get userId from session/auth
    // For now, using the dev user
    const userId = 'localhost-dev-user';

    const db = await getSabzziDatabase();
    const listsCollection = db.collection('lists');

    // Find all lists shared with this user
    const lists = await listsCollection
      .find({ sharedWith: userId })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      lists,
    });
  } catch (error) {
    console.error('Error fetching to-buy lists:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shared lists' },
      { status: 500 }
    );
  }
}
