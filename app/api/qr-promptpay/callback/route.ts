import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { paymentTransactions } from '@/lib/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { getUser } from '@/lib/db/queries';

export async function POST(
  request: Request
) {
  try {
    const result = await request.json();
    console.log('Callback result:', result);
    
    return NextResponse.json({ status: true });
  } catch (error) {
    console.error('Error cancelling QR payment:', error);
    return NextResponse.json(
      { error: 'Failed to cancel QR payment' },
      { status: 500 }
    );
  }
}
