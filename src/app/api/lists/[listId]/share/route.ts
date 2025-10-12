import { NextRequest, NextResponse } from 'next/server';
import { getSabzziDatabase } from '@/lib/mongodb';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    // TODO: Get userId from session/auth
    const userId = 'localhost-dev-user';
    const { listId } = await params;
    const body = await request.json();
    const { userIds } = body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'userIds array is required' },
        { status: 400 }
      );
    }

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
    
    // Get current shared users
    const currentSharedWith = list.sharedWith || [];

    // Filter out users already shared with
    const newUsers = userIds.filter(
      (uid: string) => !currentSharedWith.includes(uid)
    );

    if (newUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All selected users already have access',
      });
    }

    // Add new users to sharedWith array in list
    await listsCollection.updateOne(
      { listId },
      {
        $addToSet: { sharedWith: { $each: newUsers } } as any,
        $set: { updatedAt: new Date() },
      }
    );

    // Add list to each user's sharedLists array
    await usersCollection.updateMany(
      { userId: { $in: newUsers } },
      {
        $addToSet: { sharedLists: listId } as any,
        $set: { updatedAt: new Date() },
      }
    );

    return NextResponse.json({
      success: true,
      message: `List shared with ${newUsers.length} user(s)`,
    });
  } catch (error) {
    console.error('Error sharing list:', error);
    return NextResponse.json(
      { error: 'Failed to share list' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
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

    // Get user details for all shared users
    const sharedWith = list.sharedWith || [];
    const users = await usersCollection
      .find({ userId: { $in: sharedWith } })
      .project({ userId: 1, name: 1 })
      .toArray();

    return NextResponse.json({
      success: true,
      sharedWith: users.map((user) => ({
        userId: user.userId,
        name: user.name,
      })),
    });
  } catch (error) {
    console.error('Error fetching shared users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shared users' },
      { status: 500 }
    );
  }
}
