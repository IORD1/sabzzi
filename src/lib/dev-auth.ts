import { getSabzziDatabase } from './mongodb';

const DEV_USER = {
  userId: 'localhost-dev-user',
  name: 'Localhost Dev',
  email: 'dev@localhost',
};

/**
 * Check if we're in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ENV === 'DEV';
}

/**
 * Create or get the localhost development user
 */
export async function ensureDevUser() {
  if (!isDevelopment()) {
    throw new Error('Dev user can only be created in development mode');
  }

  try {
    const db = await getSabzziDatabase();

    // Check if dev user exists in auth collection
    const authCollection = db.collection('auth');
    let authUser = await authCollection.findOne({ userId: DEV_USER.userId });

    if (!authUser) {
      // Create dev user in auth collection
      const authUserDoc = {
        userId: DEV_USER.userId,
        name: DEV_USER.name,
        passkey: {
          credentialId: 'dev-credential',
          publicKey: 'dev-public-key',
          counter: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await authCollection.insertOne(authUserDoc);
      console.log('✅ Created dev user in auth collection');
    }

    // Check if dev user exists in users collection
    const usersCollection = db.collection('users');
    let sabzziUser = await usersCollection.findOne({ userId: DEV_USER.userId });

    if (!sabzziUser) {
      // Create dev user in sabzzi database
      const sabzziUserDoc = {
        userId: DEV_USER.userId,
        name: DEV_USER.name,
        myLists: [],
        sharedLists: [],
        preferences: {
          hapticsEnabled: true,
        },
        activityLog: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await usersCollection.insertOne(sabzziUserDoc);
      console.log('✅ Created dev user in users collection');
    }

    return {
      userId: DEV_USER.userId,
      name: DEV_USER.name,
    };
  } catch (error) {
    console.error('Error ensuring dev user:', error);
    throw error;
  }
}

/**
 * Get dev user session data
 */
export function getDevUserSession() {
  if (!isDevelopment()) {
    return null;
  }

  return {
    userId: DEV_USER.userId,
    name: DEV_USER.name,
    isDevUser: true,
  };
}
