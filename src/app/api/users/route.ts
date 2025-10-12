import { NextRequest, NextResponse } from 'next/server';
import { getSabzziDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const db = await getSabzziDatabase();
    const usersCollection = db.collection('users');

    // Get all users
    const users = await usersCollection
      .find({})
      .project({ userId: 1, name: 1 })
      .toArray();

    return NextResponse.json({
      success: true,
      users: users.map((user) => ({
        userId: user.userId,
        name: user.name,
      })),
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
