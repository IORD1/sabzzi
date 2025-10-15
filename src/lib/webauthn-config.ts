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

// In-memory challenge storage (in production, use Redis or similar)
const challenges = new Map<string, { challenge: string; timestamp: number }>();

// Clean up old challenges (older than 5 minutes)
const CHALLENGE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export function storeChallenge(userId: string, challenge: string) {
  challenges.set(userId, {
    challenge,
    timestamp: Date.now(),
  });

  // Clean up old challenges
  for (const [id, data] of challenges.entries()) {
    if (Date.now() - data.timestamp > CHALLENGE_TIMEOUT) {
      challenges.delete(id);
    }
  }
}

export function getChallenge(userId: string): string | null {
  const data = challenges.get(userId);
  if (!data) return null;

  // Check if challenge is expired
  if (Date.now() - data.timestamp > CHALLENGE_TIMEOUT) {
    challenges.delete(userId);
    return null;
  }

  return data.challenge;
}

export function deleteChallenge(userId: string) {
  challenges.delete(userId);
}
