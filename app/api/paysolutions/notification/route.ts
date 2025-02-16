import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { userBalances, verifiedSlips, users } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { sendDepositNotification } from '@/lib/telegram/bot';
import crypto from 'crypto';

const SECRET_KEY = 'scHey5ehpSVpTr0w';

function verifySignature(data: any, signature: string): boolean {
  const signString = `${data.merchantId}|${data.amount}|${data.referenceNo}|${data.nonceStr}|${data.timestamp}`;
  const calculatedSignature = crypto.createHmac('sha256', SECRET_KEY)
    .update(signString)
    .digest('hex');
  return calculatedSignature === signature;
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    // Verify signature
    if (!verifySignature(data, data.signature)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Check payment status
    if (data.status !== 'success') {
      return NextResponse.json(
        { error: 'Payment failed', details: data.message },
        { status: 400 }
      );
    }

    const userId = Number(data.merchantDefined1);
    const amount = Number(data.amount);

    // Start a transaction
    await db.transaction(async (tx) => {
      // Get user details for notification
      const [user] = await tx
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        throw new Error('User not found');
      }

      // Record the verified payment
      await tx.insert(verifiedSlips).values({
        transRef: data.referenceNo,
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
        userName: user.name || user.email,
        amount,
        transRef: data.referenceNo
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing payment notification:', error);
    return NextResponse.json(
      { error: 'Failed to process payment notification' },
      { status: 500 }
    );
  }
}