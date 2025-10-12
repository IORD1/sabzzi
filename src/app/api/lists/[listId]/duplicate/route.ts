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

    const db = await getSabzziDatabase();
    const listsCollection = db.collection('lists');
    const usersCollection = db.collection('users');
    const itemsCollection = db.collection('items');

    // Find the original list
    const originalList = await listsCollection.findOne({ listId });

    if (!originalList) {
      return NextResponse.json(
        { error: 'List not found' },
        { status: 404 }
      );
    }

    // Generate new list name based on date
    const date = new Date();
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const baseName = `${day} ${month} LIST`;

    // Find lists created today with similar names
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

    const existingLists = await listsCollection
      .find({
        createdBy: userId,
        createdAt: {
          $gte: startOfDay,
          $lt: endOfDay,
        },
        name: {
          $regex: `^${day} ${month} LIST`,
        },
      })
      .toArray();

    let newName = baseName;
    if (existingLists.length > 0) {
      newName = `${baseName}#${existingLists.length + 1}`;
    }

    // Generate new listId
    const newListId = crypto.randomUUID();

    // Create duplicated list with all items unmarked as bought
    const duplicatedList = {
      listId: newListId,
      name: newName,
      emoji: originalList.emoji,
      createdBy: userId,
      sharedWith: [],
      items: originalList.items.map((item: any) => ({
        itemId: item.itemId,
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
      duplicatedFrom: listId,
    };

    // Insert duplicated list
    await listsCollection.insertOne(duplicatedList);

    // Update user's myLists array
    await usersCollection.updateOne(
      { userId },
      {
        $push: { myLists: newListId } as any,
        $set: { updatedAt: new Date() },
      }
    );

    // Increment usage count for each item
    const itemIds = duplicatedList.items
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
      console.log(`✅ Incremented usage count for ${itemIds.length} items (duplicate list)`);
    }

    return NextResponse.json({
      success: true,
      listId: newListId,
      name: newName,
      message: 'List duplicated successfully',
    });
  } catch (error) {
    console.error('Error duplicating list:', error);
    return NextResponse.json(
      { error: 'Failed to duplicate list' },
      { status: 500 }
    );
  }
}
