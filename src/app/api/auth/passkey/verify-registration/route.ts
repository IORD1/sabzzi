import { NextRequest, NextResponse } from 'next/server';
import {
  verifyRegistrationResponse,
  type VerifiedRegistrationResponse,
} from '@simplewebauthn/server';
import { getSabzziDatabase } from '@/lib/mongodb';
import { getChallenge, deleteChallenge, rpID, expectedOrigin } from '@/lib/webauthn-config';
import { setSessionCookie } from '@/lib/session';

function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tempUserId, name, credential } = body;

    // Get stored challenge
    const expectedChallenge = getChallenge(tempUserId);
    if (!expectedChallenge) {
      return NextResponse.json(
        { success: false, error: 'Challenge expired or not found' },
        { status: 400 }
      );
    }

    // Verify the registration response
    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      deleteChallenge(tempUserId);
      return NextResponse.json(
        { success: false, error: 'Registration verification failed' },
        { status: 400 }
      );
    }

    // Delete the challenge
    deleteChallenge(tempUserId);

    const { credential: credentialData } = verification.registrationInfo;

    const db = await getSabzziDatabase();
    const authCollection = db.collection('auth');
    const usersCollection = db.collection('users');

    // Check if credential already exists
    const credentialIdString = Buffer.from(credentialData.id).toString('base64');
    const existingUser = await authCollection.findOne({
      credentialIdString,
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
      credentialId: Buffer.from(credentialData.id).toString('base64'),
      credentialIdString,
      credentialPublicKey: Buffer.from(credentialData.publicKey).toString('base64'),
      counter: credentialData.counter,
      credentialDeviceType: 'public-key',
      credentialBackedUp: false,
      transports: credentialData.transports || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date(),
    };

    await authCollection.insertOne(authRecord);

    // Create user record
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

    console.log('✅ Registration verified and user created:', userId);

    // Create session
    const response = NextResponse.json({
      success: true,
      userId,
      name: name.trim(),
      message: 'Registration successful',
    });

    return setSessionCookie(response, userId, name.trim());
  } catch (error) {
    console.error('Error verifying registration:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify registration' },
      { status: 500 }
    );
  }
}
