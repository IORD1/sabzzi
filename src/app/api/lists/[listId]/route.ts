import { NextRequest, NextResponse } from 'next/server';
import { getSabzziDatabase } from '@/lib/mongodb';

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    // TODO: Get userId from session/auth
    const userId = 'localhost-dev-user';
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
