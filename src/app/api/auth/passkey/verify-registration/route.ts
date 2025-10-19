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

    console.log('🔐 Verify Registration - Configuration:', {
      rpID,
      expectedOrigin,
      env: process.env.NODE_ENV,
      NEXT_PUBLIC_RP_ID: process.env.NEXT_PUBLIC_RP_ID,
      NEXT_PUBLIC_ORIGIN: process.env.NEXT_PUBLIC_ORIGIN,
      VERCEL_URL: process.env.VERCEL_URL,
      NEXT_PUBLIC_VERCEL_URL: process.env.NEXT_PUBLIC_VERCEL_URL,
    });

    // Get stored challenge
    const expectedChallenge = await getChallenge(tempUserId);
    if (!expectedChallenge) {
      return NextResponse.json(
        { success: false, error: 'Challenge expired or not found' },
        { status: 400 }
      );
    }

    console.log('🔐 Attempting to verify registration with:', {
      expectedRPID: rpID,
      expectedOrigin,
      hasCredential: !!credential,
    });

    // Verify the registration response
    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      await deleteChallenge(tempUserId);
      return NextResponse.json(
        { success: false, error: 'Registration verification failed' },
        { status: 400 }
      );
    }

    // Delete the challenge
    await deleteChallenge(tempUserId);

    const { credential: credentialData } = verification.registrationInfo;

    const db = await getSabzziDatabase();
    const authCollection = db.collection('auth');
    const usersCollection = db.collection('users');

    // Handle credential ID - it may be a string (base64url) or Uint8Array
    let credentialIdString: string;
    if (typeof credentialData.id === 'string') {
      // Already a base64url string, use as-is
      credentialIdString = credentialData.id;
    } else {
      // Uint8Array, convert to base64url
      credentialIdString = Buffer.from(credentialData.id).toString('base64url');
    }

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

    // Handle public key - may be string or Uint8Array
    let credentialPublicKey: string;
    if (typeof credentialData.publicKey === 'string') {
      credentialPublicKey = credentialData.publicKey;
    } else {
      credentialPublicKey = Buffer.from(credentialData.publicKey).toString('base64');
    }

    // Create auth record
    const authRecord = {
      userId,
      name: name.trim(),
      credentialId: credentialIdString, // Use the same format
      credentialIdString,
      credentialPublicKey,
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
    console.error('❌ Error verifying registration:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      rpID,
      expectedOrigin,
    });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to verify registration',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
