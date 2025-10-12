import { NextRequest, NextResponse } from 'next/server';
import { getSabzziDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    // TODO: Get userId from session/auth
    // For now, using the dev user
    const userId = 'localhost-dev-user';

    const db = await getSabzziDatabase();
    const listsCollection = db.collection('lists');

    // Find all lists created by this user
    const lists = await listsCollection
      .find({ createdBy: userId })
      .sort({ createdAt: -1 })
      .toArray();

    // Add computed fields for UI
    const listsWithStats = lists.map((list) => {
      const totalItems = list.items?.length || 0;
      const boughtItems = list.items?.filter((item: any) => item.isBought).length || 0;

      return {
        listId: list.listId,
        name: list.name,
        emoji: list.emoji,
        createdBy: list.createdBy,
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
    console.error('Error fetching my lists:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lists' },
      { status: 500 }
    );
  }
}
