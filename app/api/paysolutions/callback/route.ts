import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { userBalances, verifiedSlips } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { sendDepositNotification } from '@/lib/telegram/bot';

export async function POST(request: Request) {
  try {
    const data = await request.json();

    // Verify the payment status
    if (data.status !== 'success') {
      return NextResponse.json(
        { error: 'Payment failed', details: data.message },
        { status: 400 }
      );
    }

    const userId = Number(data.merchantDefined1);
    const amount = Number(data.amount);
    const transRef = data.referenceNo;

    // Start a transaction
    await db.transaction(async (tx) => {
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
        userName: data.customerName || data.customerEmail,
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