import { NextRequest, NextResponse } from 'next/server';
import { getSabzziDatabase } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    // TODO: Get userId from session/auth
    const userId = 'localhost-dev-user';

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
