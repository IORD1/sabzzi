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
    const expectedChallenge = await getChallenge(tempUserId);
    if (!expectedChallenge) {
      return NextResponse.json(
        { success: false, error: 'Challenge expired or not found' },
        { status: 400 }
      );
    }

    const db = await getSabzziDatabase();
    const authCollection = db.collection('auth');

    // Find the user by credential ID
    const credentialIdString = credential.id; // Base64url encoded from browser

    const user = await authCollection.findOne({
      credentialIdString,
    });

    if (!user) {
      await deleteChallenge(tempUserId);
      return NextResponse.json(
        {
          success: false,
          error: 'No passkey found on this device. Please register first or use a device where you previously registered a passkey.'
        },
        { status: 404 }
      );
    }

    // Verify the authentication response
    // Convert public key from base64 string to Uint8Array
    const publicKeyBuffer = Buffer.from(user.credentialPublicKey, 'base64');

    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin,
      expectedRPID: rpID,
      credential: {
        id: user.credentialId, // Keep as base64url string
        publicKey: new Uint8Array(publicKeyBuffer), // Convert to Uint8Array
        counter: user.counter || 0,
        transports: user.transports || [],
      },
      requireUserVerification: true,
    });

    if (!verification.verified) {
      await deleteChallenge(tempUserId);
      return NextResponse.json(
        { success: false, error: 'Authentication verification failed' },
        { status: 400 }
      );
    }

    // Delete the challenge
    await deleteChallenge(tempUserId);

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
