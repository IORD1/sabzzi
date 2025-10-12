import { NextResponse } from 'next/server';
import { testConnection } from '@/lib/mongodb';

export async function GET() {
  try {
    const result = await testConnection();

    if (result.success) {
      return NextResponse.json(
        {
          status: 'success',
          message: result.message,
          databases: result.databases,
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        {
          status: 'error',
          message: result.message,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Test DB API error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
