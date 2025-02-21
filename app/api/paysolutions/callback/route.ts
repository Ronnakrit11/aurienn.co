import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { userBalances, verifiedSlips } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { createHmac } from 'node:crypto';
import { sendDepositNotification } from '@/lib/telegram/bot';

const SECRET_KEY = process.env.PAYSOLUTIONS_SECRET_KEY;

function verifySignature(payload: any, signature: string): boolean {
  const signString = `${payload.merchantId}${payload.invoiceNo}${payload.amount}${payload.currency}${payload.status}`;
  const calculatedSignature = createHmac('sha256', SECRET_KEY || '')
    .update(signString)
    .digest('hex');
  return calculatedSignature === signature;
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log('PaySolutions callback received:', data);

    // Verify signature
    if (!verifySignature(data, data.signature)) {
      console.error('Invalid signature in callback');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Check payment status
    if (data.status !== 'success') {
      console.error('Payment failed:', data.message);
      return NextResponse.json(
        { error: 'Payment failed', details: data.message },
        { status: 400 }
      );
    }

    const userId = Number(data.merchantDefined1);
    const amount = Number(data.amount);
    const transRef = data.invoiceNo;

    // Validate data
    if (!userId || isNaN(amount) || !transRef) {
      console.error('Invalid callback data:', { userId, amount, transRef });
      return NextResponse.json(
        { error: 'Invalid callback data' },
        { status: 400 }
      );
    }

    // Start a transaction
    await db.transaction(async (tx) => {
      // Check if transaction already processed
      const existingSlip = await tx
        .select()
        .from(verifiedSlips)
        .where(eq(verifiedSlips.transRef, transRef))
        .limit(1);

      if (existingSlip.length > 0) {
        console.log('Transaction already processed:', transRef);
        return;
      }

      // Record the verified payment
      await tx.insert(verifiedSlips).values({
        transRef,
        amount: amount.toString(),
        userId,
      });

      // Update user balance
      await tx
        .update(userBalances)
        .set({
          balance: sql`${userBalances.balance} + ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(userBalances.userId, userId));

      // Send Telegram notification
      await sendDepositNotification({
        userName: data.customerName || data.customerEmail || userId.toString(),
        amount,
        transRef
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing payment callback:', error);
    return NextResponse.json(
      { error: 'Failed to process payment callback' },
      { status: 500 }
    );
  }
}