import { NextRequest, NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { storeChallenge, rpName, rpID } from '@/lib/webauthn-config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pin, name } = body;

    console.log('🔐 Generate Registration Options - Configuration:', {
      rpID,
      rpName,
      env: process.env.NODE_ENV,
      NEXT_PUBLIC_RP_ID: process.env.NEXT_PUBLIC_RP_ID,
      VERCEL_URL: process.env.VERCEL_URL,
      NEXT_PUBLIC_VERCEL_URL: process.env.NEXT_PUBLIC_VERCEL_URL,
    });

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

    // Generate a temporary user ID for challenge storage
    const tempUserId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Generate registration options
    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: name.trim(),
      userDisplayName: name.trim(),
      // Require user verification (biometrics/PIN)
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'required',
      },
    });

    console.log('✅ Generated registration options:', {
      rpID: options.rp.id,
      rpName: options.rp.name,
      userName: options.user.name,
      tempUserId,
    });

    // Store the challenge
    await storeChallenge(tempUserId, options.challenge);

    return NextResponse.json({
      success: true,
      options,
      tempUserId,
    });
  } catch (error) {
    console.error('Error generating registration options:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate registration options' },
      { status: 500 }
    );
  }
}
