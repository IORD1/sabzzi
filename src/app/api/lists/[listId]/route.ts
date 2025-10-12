import { NextRequest, NextResponse } from 'next/server';
import { getSabzziDatabase } from '@/lib/mongodb';
import { getSessionUserId } from '@/lib/session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    const { listId } = await params;

    const db = await getSabzziDatabase();
    const listsCollection = db.collection('lists');

    // Find the list by listId
    const list = await listsCollection.findOne({ listId });

    if (!list) {
      return NextResponse.json(
        { error: 'List not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      list: {
        listId: list.listId,
        name: list.name,
        emoji: list.emoji,
        createdBy: list.createdBy,
        sharedWith: list.sharedWith,
        items: list.items,
        comments: list.comments || [],
        status: list.status,
        createdAt: list.createdAt,
        updatedAt: list.updatedAt,
        duplicatedFrom: list.duplicatedFrom,
      },
    });
  } catch (error) {
    console.error('Error fetching list:', error);
    return NextResponse.json(
      { error: 'Failed to fetch list' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    const userId = await getSessionUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { listId } = await params;
    const body = await request.json();
    const { name, emoji, items } = body;

    const db = await getSabzziDatabase();
    const listsCollection = db.collection('lists');
    const itemsCollection = db.collection('items');

    // Find the list
    const list = await listsCollection.findOne({ listId });

    if (!list) {
      return NextResponse.json(
        { error: 'List not found' },
        { status: 404 }
      );
    }

    // Check if user is the creator
    if (list.createdBy !== userId) {
      return NextResponse.json(
        { error: 'Not authorized to edit this list' },
        { status: 403 }
      );
    }

    // Update the list
    await listsCollection.updateOne(
      { listId },
      {
        $set: {
          name,
          emoji,
          items,
          updatedAt: new Date(),
        },
      }
    );

    // Increment usage count for newly added items
    const itemIds = items
      .map((item: any) => item.itemId)
      .filter((id: string) => id);

    if (itemIds.length > 0) {
      await itemsCollection.updateMany(
        { itemId: { $in: itemIds } },
        {
          $inc: { usageCount: 1 },
          $set: { updatedAt: new Date() },
        }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'List updated successfully',
    });
  } catch (error) {
    console.error('Error updating list:', error);
    return NextResponse.json(
      { error: 'Failed to update list' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    const userId = await getSessionUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { listId } = await params;

    const db = await getSabzziDatabase();
    const listsCollection = db.collection('lists');
    const usersCollection = db.collection('users');

    // Find the list
    const list = await listsCollection.findOne({ listId });

    if (!list) {
      return NextResponse.json(
        { error: 'List not found' },
        { status: 404 }
      );
    }

    // Check if user is the creator
    if (list.createdBy !== userId) {
      return NextResponse.json(
        { error: 'Not authorized to delete this list' },
        { status: 403 }
      );
    }

    // Delete the list
    await listsCollection.deleteOne({ listId });

    // Remove from user's myLists array
    await usersCollection.updateOne(
      { userId },
      {
        $pull: { myLists: listId } as any,
        $set: { updatedAt: new Date() },
      }
    );

    return NextResponse.json({
      success: true,
      message: 'List deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting list:', error);
    return NextResponse.json(
      { error: 'Failed to delete list' },
      { status: 500 }
    );
  }
}
