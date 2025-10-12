import { NextRequest, NextResponse } from 'next/server';
import { getSabzziDatabase } from '@/lib/mongodb';
import { requireAuth } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    // Get userId from session
    const session = await requireAuth();
    const userId = session.userId;

    const body = await request.json();
    const { name, emoji, items } = body;

    if (!name || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Name and items are required' },
        { status: 400 }
      );
    }

    const db = await getSabzziDatabase();
    const listsCollection = db.collection('lists');
    const usersCollection = db.collection('users');
    const itemsCollection = db.collection('items');

    // Generate list ID
    const listId = crypto.randomUUID();

    // Create list document
    const listDoc = {
      listId,
      name,
      emoji: emoji || '🛒',
      createdBy: userId,
      sharedWith: [],
      items: items.map((item: any) => ({
        itemId: item.itemId || crypto.randomUUID(),
        itemName: item.itemName,
        itemNameHindi: item.itemNameHindi || '',
        itemNameMarathi: item.itemNameMarathi || '',
        quantity: item.quantity,
        isBought: false,
        boughtBy: null,
        boughtAt: null,
      })),
      comments: [],
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      duplicatedFrom: null,
    };

    // Insert list
    await listsCollection.insertOne(listDoc);

    // Update user's myLists array
    await usersCollection.updateOne(
      { userId },
      {
        $push: { myLists: listId } as any,
        $set: { updatedAt: new Date() },
      }
    );

    // Increment usage count for each item that exists in items collection
    const itemIds = items
      .map((item: any) => item.itemId)
      .filter((id: string) => id); // Only items with IDs (from database)

    if (itemIds.length > 0) {
      await itemsCollection.updateMany(
        { itemId: { $in: itemIds } },
        {
          $inc: { usageCount: 1 },
          $set: { updatedAt: new Date() },
        }
      );
      console.log(`✅ Incremented usage count for ${itemIds.length} items`);
    }

    return NextResponse.json({
      success: true,
      listId,
      message: 'List created successfully',
    });
  } catch (error) {
    console.error('Error creating list:', error);
    return NextResponse.json(
      { error: 'Failed to create list' },
      { status: 500 }
    );
  }
}
