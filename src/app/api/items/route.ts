import { NextRequest, NextResponse } from 'next/server';
import { getSabzziDatabase } from '@/lib/mongodb';

// GET /api/items - Search for items
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    const db = await getSabzziDatabase();
    const itemsCollection = db.collection('items');

    // Search across English, Hindi, and Marathi names
    const items = await itemsCollection
      .find({
        $or: [
          { itemName: { $regex: query, $options: 'i' } },
          { itemNameHindi: { $regex: query, $options: 'i' } },
          { itemNameMarathi: { $regex: query, $options: 'i' } },
        ],
      })
      .limit(10)
      .toArray();

    return NextResponse.json({
      success: true,
      items: items.map((item) => ({
        itemId: item.itemId,
        itemName: item.itemName,
        itemNameHindi: item.itemNameHindi,
        itemNameMarathi: item.itemNameMarathi,
        defaultQuantity: item.defaultQuantity,
      })),
    });
  } catch (error) {
    console.error('Error searching items:', error);
    return NextResponse.json(
      { error: 'Failed to search items' },
      { status: 500 }
    );
  }
}

// POST /api/items - Create a new item
export async function POST(request: NextRequest) {
  try {
    // TODO: Get userId from session/auth
    const userId = 'localhost-dev-user';

    const body = await request.json();
    const { itemName, itemNameHindi, itemNameMarathi, defaultQuantity } = body;

    if (!itemName) {
      return NextResponse.json(
        { error: 'Item name is required' },
        { status: 400 }
      );
    }

    const db = await getSabzziDatabase();
    const itemsCollection = db.collection('items');

    // Check if item already exists
    const existingItem = await itemsCollection.findOne({
      $or: [
        { itemName: { $regex: `^${itemName}$`, $options: 'i' } },
        ...(itemNameHindi
          ? [{ itemNameHindi: { $regex: `^${itemNameHindi}$`, $options: 'i' } }]
          : []),
        ...(itemNameMarathi
          ? [
              {
                itemNameMarathi: {
                  $regex: `^${itemNameMarathi}$`,
                  $options: 'i',
                },
              },
            ]
          : []),
      ],
    });

    if (existingItem) {
      return NextResponse.json(
        { error: 'Item already exists', itemId: existingItem.itemId },
        { status: 409 }
      );
    }

    // Generate item ID
    const itemId = crypto.randomUUID();

    // Create item document
    const itemDoc = {
      itemId,
      itemName,
      itemNameHindi: itemNameHindi || '',
      itemNameMarathi: itemNameMarathi || '',
      defaultQuantity: defaultQuantity || {
        value: 1,
        unit: 'items',
      },
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Insert item
    await itemsCollection.insertOne(itemDoc);

    return NextResponse.json({
      success: true,
      itemId,
      item: {
        itemId,
        itemName,
        itemNameHindi: itemNameHindi || '',
        itemNameMarathi: itemNameMarathi || '',
        defaultQuantity: itemDoc.defaultQuantity,
      },
      message: 'Item created successfully',
    });
  } catch (error) {
    console.error('Error creating item:', error);
    return NextResponse.json(
      { error: 'Failed to create item' },
      { status: 500 }
    );
  }
}
