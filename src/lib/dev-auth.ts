import { getAuthDatabase, getSabzziDatabase } from './mongodb';

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
    const authDb = await getAuthDatabase();
    const sabzziDb = await getSabzziDatabase();

    // Check if dev user exists in auth database
    const authCollection = authDb.collection('auth');
    let authUser = await authCollection.findOne({ userId: DEV_USER.userId });

    if (!authUser) {
      // Create dev user in auth database
      authUser = {
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

      await authCollection.insertOne(authUser);
      console.log('✅ Created dev user in auth database');
    }

    // Check if dev user exists in sabzzi database
    const usersCollection = sabzziDb.collection('users');
    let sabzziUser = await usersCollection.findOne({ userId: DEV_USER.userId });

    if (!sabzziUser) {
      // Create dev user in sabzzi database
      sabzziUser = {
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

      await usersCollection.insertOne(sabzziUser);
      console.log('✅ Created dev user in sabzzi database');
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
