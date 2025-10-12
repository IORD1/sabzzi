import { NextRequest, NextResponse } from 'next/server';
import { getSabzziDatabase } from '@/lib/mongodb';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string; itemId: string }> }
) {
  try {
    const { listId, itemId } = await params;

    const db = await getSabzziDatabase();
    const listsCollection = db.collection('lists');

    // Update the item in the list
    const result = await listsCollection.updateOne(
      { listId, 'items.itemId': itemId },
      {
        $set: {
          'items.$.isBought': false,
          'items.$.boughtBy': null,
          'items.$.boughtAt': null,
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
      message: 'Item unmarked as bought',
    });
  } catch (error) {
    console.error('Error unmarking item as bought:', error);
    return NextResponse.json(
      { error: 'Failed to unmark item as bought' },
      { status: 500 }
    );
  }
}
