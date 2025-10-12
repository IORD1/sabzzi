import { NextResponse } from 'next/server';
import { getSabzziDatabase } from '@/lib/mongodb';

export async function GET() {
  try {
    // TODO: Get userId from session/auth
    const userId = 'localhost-dev-user';

    // Generate date-based name
    const date = new Date();
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const baseName = `${day} ${month} LIST`;

    // Check if a list with this name already exists today
    const db = await getSabzziDatabase();
    const listsCollection = db.collection('lists');

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

    let name = baseName;
    if (existingLists.length > 0) {
      // Append #2, #3, etc.
      name = `${baseName}#${existingLists.length + 1}`;
    }

    return NextResponse.json({
      success: true,
      name,
    });
  } catch (error) {
    console.error('Error generating list name:', error);
    return NextResponse.json(
      { error: 'Failed to generate list name' },
      { status: 500 }
    );
  }
}
