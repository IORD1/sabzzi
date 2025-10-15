import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { storeChallenge, rpID } from '@/lib/webauthn-config';

export async function POST(request: NextRequest) {
  try {
    // Generate a temporary ID for challenge storage
    const tempUserId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Generate authentication options
    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: 'required',
    });

    // Store the challenge
    await storeChallenge(tempUserId, options.challenge);

    return NextResponse.json({
      success: true,
      options,
      tempUserId,
    });
  } catch (error) {
    console.error('Error generating authentication options:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate authentication options' },
      { status: 500 }
    );
  }
}
