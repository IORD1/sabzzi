import { NextRequest, NextResponse } from 'next/server';
import { getSabzziDatabase } from '@/lib/mongodb';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string; itemId: string }> }
) {
  try {
    // TODO: Get userId from session/auth
    const userId = 'localhost-dev-user';
    const { listId, itemId } = await params;

    const db = await getSabzziDatabase();
    const listsCollection = db.collection('lists');
    const usersCollection = db.collection('users');

    // Get user name
    const user = await usersCollection.findOne({ userId });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update the item in the list
    const result = await listsCollection.updateOne(
      { listId, 'items.itemId': itemId },
      {
        $set: {
          'items.$.isBought': true,
          'items.$.boughtBy': userId,
          'items.$.boughtAt': new Date(),
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'List or item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Item marked as bought',
    });
  } catch (error) {
    console.error('Error marking item as bought:', error);
    return NextResponse.json(
      { error: 'Failed to mark item as bought' },
      { status: 500 }
    );
  }
}
