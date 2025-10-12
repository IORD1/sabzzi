import { MongoClient, Db } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your MongoDB URI to .env file');
}

const uri = process.env.MONGODB_URI;
const options = {
  maxPoolSize: 10,
  minPoolSize: 5,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

// In development mode, use a global variable to preserve the connection
// across hot reloads in Next.js
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === 'development') {
  // In development, use a global variable to preserve the value across module reloads
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production, create a new client for each request
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// Helper function to get database by name
export async function getDatabase(dbName: string): Promise<Db> {
  const client = await clientPromise;
  return client.db(dbName);
}

// Get specific databases for our app
export async function getAuthDatabase(): Promise<Db> {
  return getDatabase('auth');
}

export async function getSabzziDatabase(): Promise<Db> {
  return getDatabase('sabzzi');
}

// Test connection function
export async function testConnection(): Promise<{
  success: boolean;
  message: string;
  databases?: string[];
}> {
  try {
    const client = await clientPromise;

    // Ping the database to check connection
    await client.db('admin').command({ ping: 1 });

    // List all databases
    const databasesList = await client.db().admin().listDatabases();
    const databases = databasesList.databases.map((db) => db.name);

    return {
      success: true,
      message: 'MongoDB connection successful!',
      databases,
    };
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// Close connection (useful for cleanup)
export async function closeConnection(): Promise<void> {
  try {
    const client = await clientPromise;
    await client.close();
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
  }
}

export default clientPromise;
