import { NextRequest, NextResponse } from 'next/server';
import { getSabzziDatabase } from '@/lib/mongodb';
import { requireAuth } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    // Get userId from session
    const session = await requireAuth();
    const userId = session.userId;

    const db = await getSabzziDatabase();
    const listsCollection = db.collection('lists');
    const usersCollection = db.collection('users');

    // Find all lists shared with this user
    const lists = await listsCollection
      .find({ sharedWith: userId })
      .sort({ createdAt: -1 })
      .toArray();

    // Get creator names for all lists
    const creatorIds = [...new Set(lists.map((list) => list.createdBy))];
    const creators = await usersCollection
      .find({ userId: { $in: creatorIds } })
      .toArray();

    const creatorMap = new Map(creators.map((user) => [user.userId, user.name]));

    // Add computed fields for UI
    const listsWithStats = lists.map((list) => {
      const totalItems = list.items?.length || 0;
      const boughtItems = list.items?.filter((item: any) => item.isBought).length || 0;
      const creatorName = creatorMap.get(list.createdBy) || 'Unknown';

      return {
        listId: list.listId,
        name: list.name,
        emoji: list.emoji,
        createdBy: list.createdBy,
        creatorName,
        sharedWith: list.sharedWith,
        status: list.status,
        createdAt: list.createdAt,
        updatedAt: list.updatedAt,
        totalItems,
        boughtItems,
      };
    });

    return NextResponse.json({
      success: true,
      lists: listsWithStats,
    });
  } catch (error) {
    console.error('Error fetching to-buy lists:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shared lists' },
      { status: 500 }
    );
  }
}
