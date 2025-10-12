import { NextRequest, NextResponse } from 'next/server';
import { getSabzziDatabase } from '@/lib/mongodb';
import { setSessionCookie } from '@/lib/session';

// Helper function to convert credential ID array to string for lookup
function credentialIdToString(credentialId: number[]): string {
  return credentialId.join(',');
}

// Helper function to generate unique user ID
function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// POST - Register new passkey
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { credentialId, publicKey, pin, name } = body;

    // Verify PIN
    if (pin !== '4452') {
      return NextResponse.json(
        { success: false, error: 'Invalid PIN' },
        { status: 403 }
      );
    }

    // Validate name
    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    const db = await getSabzziDatabase();

    const authCollection = db.collection('auth');
    const usersCollection = db.collection('users');

    const credentialIdString = credentialIdToString(credentialId);

    // Check if passkey already registered
    const existingUser = await authCollection.findOne({
      credentialIdString: credentialIdString
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'This passkey is already registered' },
        { status: 400 }
      );
    }

    // Generate unique user ID
    const userId = generateUserId();

    // Create auth record
    const authRecord = {
      userId,
      name: name.trim(),
      credentialId,
      credentialIdString,
      publicKey,
      counter: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date(),
    };

    await authCollection.insertOne(authRecord);

    // Create user record in sabzzi database
    const userRecord = {
      userId,
      name: name.trim(),
      myLists: [],
      sharedLists: [],
      preferences: {
        hapticsEnabled: true,
      },
      activityLog: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await usersCollection.insertOne(userRecord);

    // Create session
    const response = NextResponse.json({
      success: true,
      userId,
      name: name.trim(),
      message: 'Registration successful',
    });

    return setSessionCookie(response, userId, name.trim());
  } catch (error) {
    console.error('Failed to register passkey:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to register passkey' },
      { status: 500 }
    );
  }
}

// PUT - Authenticate with passkey
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { credentialId } = body;

    const db = await getSabzziDatabase();
    const authCollection = db.collection('auth');

    const credentialIdString = credentialIdToString(credentialId);

    // Find user by credentialId
    const user = await authCollection.findOne({
      credentialIdString: credentialIdString
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found with this passkey' },
        { status: 404 }
      );
    }

    // Update last login timestamp
    await authCollection.updateOne(
      { userId: user.userId },
      {
        $set: {
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        }
      }
    );

    // Create session
    const response = NextResponse.json({
      success: true,
      userId: user.userId,
      name: user.name,
    });

    return setSessionCookie(response, user.userId, user.name);
  } catch (error) {
    console.error('Failed to authenticate:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to authenticate' },
      { status: 500 }
    );
  }
}
