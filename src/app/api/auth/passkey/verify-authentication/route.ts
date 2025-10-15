import { NextRequest, NextResponse } from 'next/server';
import {
  verifyAuthenticationResponse,
  type VerifyAuthenticationResponseOpts,
} from '@simplewebauthn/server';
import { getSabzziDatabase } from '@/lib/mongodb';
import { getChallenge, deleteChallenge, rpID, expectedOrigin } from '@/lib/webauthn-config';
import { setSessionCookie } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tempUserId, credential } = body;

    // Get stored challenge
    const expectedChallenge = getChallenge(tempUserId);
    if (!expectedChallenge) {
      return NextResponse.json(
        { success: false, error: 'Challenge expired or not found' },
        { status: 400 }
      );
    }

    const db = await getSabzziDatabase();
    const authCollection = db.collection('auth');

    // Find the user by credential ID
    const credentialIdString = credential.id; // Already base64 encoded
    const user = await authCollection.findOne({
      credentialIdString,
    });

    if (!user) {
      deleteChallenge(tempUserId);
      return NextResponse.json(
        { success: false, error: 'User not found with this passkey' },
        { status: 404 }
      );
    }

    // Verify the authentication response
    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin,
      expectedRPID: rpID,
      credential: {
        id: user.credentialId,
        publicKey: user.credentialPublicKey,
        counter: user.counter || 0,
        transports: user.transports || [],
      },
      requireUserVerification: true,
    });

    if (!verification.verified) {
      deleteChallenge(tempUserId);
      return NextResponse.json(
        { success: false, error: 'Authentication verification failed' },
        { status: 400 }
      );
    }

    // Delete the challenge
    deleteChallenge(tempUserId);

    // Update counter and last login
    await authCollection.updateOne(
      { userId: user.userId },
      {
        $set: {
          counter: verification.authenticationInfo.newCounter,
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    console.log('✅ Login verified for userId:', user.userId);

    // Create session
    const response = NextResponse.json({
      success: true,
      userId: user.userId,
      name: user.name,
    });

    return setSessionCookie(response, user.userId, user.name);
  } catch (error) {
    console.error('Error verifying authentication:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify authentication' },
      { status: 500 }
    );
  }
}
