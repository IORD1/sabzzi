// WebAuthn configuration
export const rpName = 'Sabzzi - Grocery Tracker';
export const rpID = process.env.NEXT_PUBLIC_RP_ID || 'localhost';
export const expectedOrigin = process.env.NEXT_PUBLIC_ORIGIN || 'http://localhost:3000';

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
