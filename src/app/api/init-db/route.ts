// src/app/api/init-db/route.ts
import { NextResponse } from 'next/server';
import { initDb } from '@/lib/db';

export async function GET() {
  try {
    await initDb();
    return NextResponse.json({ message: 'Database initialized successfully' });
  } catch (error: any) {
    console.error('Failed to initialize database:', error);
    return NextResponse.json({ message: 'Failed to initialize database', error: error.message }, { status: 500 });
  }
}
