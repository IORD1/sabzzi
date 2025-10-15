// MongoDB-based challenge storage import
import { getSabzziDatabase } from './mongodb';

// WebAuthn configuration
export const rpName = 'Sabzzi - Grocery Tracker';

// Auto-detect RP ID and origin based on environment
function getRpConfig() {
  // If explicitly set in environment, use those
  if (process.env.NEXT_PUBLIC_RP_ID && process.env.NEXT_PUBLIC_ORIGIN) {
    return {
      rpID: process.env.NEXT_PUBLIC_RP_ID,
      expectedOrigin: process.env.NEXT_PUBLIC_ORIGIN,
    };
  }

  // Otherwise, auto-detect based on deployment
  const isProduction = process.env.NODE_ENV === 'production';
  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL;

  if (isProduction && vercelUrl) {
    // Running on Vercel in production
    return {
      rpID: vercelUrl,
      expectedOrigin: `https://${vercelUrl}`,
    };
  }

  // Development fallback
  return {
    rpID: 'localhost',
    expectedOrigin: 'http://localhost:3000',
  };
}

const config = getRpConfig();
export const rpID = config.rpID;
export const expectedOrigin = config.expectedOrigin;

// Log configuration on server startup
if (typeof window === 'undefined') {
  console.log('🔐 WebAuthn Configuration:', {
    rpID,
    expectedOrigin,
    env: process.env.NODE_ENV,
    vercelUrl: process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL || 'not set',
  });
}

// MongoDB-based challenge storage (for serverless environments like Vercel)
// Clean up old challenges (older than 5 minutes)
const CHALLENGE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export async function storeChallenge(userId: string, challenge: string) {
  try {
    const db = await getSabzziDatabase();
    const challengesCollection = db.collection('passkey_challenges');

    // Store the challenge with timestamp
    await challengesCollection.updateOne(
      { userId },
      {
        $set: {
          challenge,
          timestamp: new Date(),
          expiresAt: new Date(Date.now() + CHALLENGE_TIMEOUT),
        },
      },
      { upsert: true }
    );

    // Clean up old challenges (optional, can also use MongoDB TTL index)
    await challengesCollection.deleteMany({
      expiresAt: { $lt: new Date() },
    });
  } catch (error) {
    console.error('Error storing challenge:', error);
    throw error;
  }
}

export async function getChallenge(userId: string): Promise<string | null> {
  try {
    const db = await getSabzziDatabase();
    const challengesCollection = db.collection('passkey_challenges');

    const data = await challengesCollection.findOne({ userId });
    if (!data) return null;

    // Check if challenge is expired
    if (data.expiresAt < new Date()) {
      await challengesCollection.deleteOne({ userId });
      return null;
    }

    return data.challenge;
  } catch (error) {
    console.error('Error getting challenge:', error);
    return null;
  }
}

export async function deleteChallenge(userId: string) {
  try {
    const db = await getSabzziDatabase();
    const challengesCollection = db.collection('passkey_challenges');
    await challengesCollection.deleteOne({ userId });
  } catch (error) {
    console.error('Error deleting challenge:', error);
  }
}
