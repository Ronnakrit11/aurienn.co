import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import crypto from 'crypto';
import { db } from '@/lib/db/drizzle';
import { paymentTransactions, userBalances } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

const QR_CALLBACK_SECRET = process.env.QR_CALLBACK_SECRET || '';

interface CallbackData {
  paymentId: number;
  amount: string;
  status: 'SUCCESS' | 'FAILED';
  paymentDate: string;
  timestamp: string;
}

// Verify signature from callback
function verifySignature(data: CallbackData, signature: string): boolean {
  const calculatedSignature = crypto
    .createHmac('sha256', QR_CALLBACK_SECRET)
    .update(JSON.stringify(data))
    .digest('hex');
  
  return calculatedSignature === signature;
}

export async function POST(request: Request) {
  try {
    const headersList = headers();
    const signature = (await headersList).get('X-Signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const data: CallbackData = await request.json();

    // Verify signature
    if (!verifySignature(data, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Update payment status and add balance in transaction
    await db.transaction(async (tx) => {
      // Get payment transaction
      const [payment] = await tx
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.id, data.paymentId))
        .limit(1);

      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status === 'CP') {
        // Payment already processed
        return NextResponse.json({ message: 'Payment already processed' });
      }

      // Update payment status
      await tx
        .update(paymentTransactions)
        .set({
          status: data.status === 'SUCCESS' ? 'CP' : 'FAIL',
          statusName: data.status === 'SUCCESS' ? 'ชำระเงินสำเร็จ' : 'ชำระเงินไม่สำเร็จ',
          paymentDate: new Date(data.paymentDate),
          updatedAt: new Date(),
        })
        .where(eq(paymentTransactions.id, data.paymentId));

      // If payment successful, update user balance
      if (data.status === 'SUCCESS') {
        await tx
          .update(userBalances)
          .set({
            balance: sql`${userBalances.balance} + ${data.amount}`,
            updatedAt: new Date(),
          })
          .where(eq(userBalances.userId, payment.userId));
      }
    });

    return NextResponse.json({ message: 'Success' });
  } catch (error) {
    console.error('Error processing callback:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
