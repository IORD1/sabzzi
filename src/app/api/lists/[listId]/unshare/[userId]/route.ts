import { NextRequest, NextResponse } from 'next/server';
import { getSabzziDatabase } from '@/lib/mongodb';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string; userId: string }> }
) {
  try {
    // TODO: Get currentUserId from session/auth
    const currentUserId = 'localhost-dev-user';
    const { listId, userId } = await params;

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
    if (list.createdBy !== currentUserId) {
      return NextResponse.json(
        { error: 'Not authorized to unshare this list' },
        { status: 403 }
      );
    }

    // Remove user from sharedWith array in list
    await listsCollection.updateOne(
      { listId },
      {
        $pull: { sharedWith: userId } as any,
        $set: { updatedAt: new Date() },
      }
    );

    // Remove list from user's sharedLists array
    await usersCollection.updateOne(
      { userId },
      {
        $pull: { sharedLists: listId } as any,
        $set: { updatedAt: new Date() },
      }
    );

    return NextResponse.json({
      success: true,
      message: 'List unshared successfully',
    });
  } catch (error) {
    console.error('Error unsharing list:', error);
    return NextResponse.json(
      { error: 'Failed to unshare list' },
      { status: 500 }
    );
  }
}
