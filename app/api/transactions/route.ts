import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { userBalances, goldAssets, transactions, users } from '@/lib/db/schema';
import { eq, and, sql, ne } from 'drizzle-orm';
import { getUser } from '@/lib/db/queries';
import { sendGoldPurchaseNotification, sendGoldSaleNotification } from '@/lib/telegram/bot';
import { pusherServer } from '@/lib/pusher';

// In app/api/transactions/route.ts

const ADMIN_EMAIL = 'adminfortest@gmail.com';

// Remove the hardcoded GOLD_TYPE constant and handle all gold types
export async function POST(request: Request) {
  try {
    const user = await getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data = await request.json();
    const { goldType, amount, pricePerUnit, totalPrice, type } = data;

    // Start a transaction
    const result = await db.transaction(async (tx) => {
      if (type === 'buy') {
        // Update user balance for buy
        await tx
          .update(userBalances)
          .set({
            balance: sql`${userBalances.balance} - ${totalPrice}`,
            updatedAt: new Date(),
          })
          .where(eq(userBalances.userId, user.id));

        // Create new gold asset record
        await tx.insert(goldAssets).values({
          userId: user.id,
          goldType,
          amount,
          purchasePrice: pricePerUnit,
        });

        // Record buy transaction
        await tx.insert(transactions).values({
          userId: user.id,
          goldType,
          amount,
          pricePerUnit,
          totalPrice,
          type: 'buy',
        });

        // Get updated balance
        const [newBalance] = await tx
          .select()
          .from(userBalances)
          .where(eq(userBalances.userId, user.id))
          .limit(1);

        // Calculate admin's remaining stock for this specific gold type
        const [adminStock] = await tx
          .select({
            total: sql<string>`COALESCE(sum(${goldAssets.amount}), '0')`
          })
          .from(goldAssets)
          .leftJoin(users, eq(goldAssets.userId, users.id))
          .where(
            and(
              eq(users.email, ADMIN_EMAIL),
              eq(goldAssets.goldType, goldType)
            )
          );

        // Calculate total user holdings for this specific gold type (excluding admin)
        const [userHoldings] = await tx
          .select({
            total: sql<string>`COALESCE(sum(${goldAssets.amount}), '0')`
          })
          .from(goldAssets)
          .leftJoin(users, eq(goldAssets.userId, users.id))
          .where(
            and(
              ne(users.email, ADMIN_EMAIL),
              eq(goldAssets.goldType, goldType)
            )
          );

        // Get total balance across all users AFTER the transaction
        const [totalUserBalance] = await tx
          .select({
            total: sql<string>`COALESCE(sum(${userBalances.balance}), '0')`
          })
          .from(userBalances)
          .where(ne(users.role, 'admin'))
          .leftJoin(users, eq(userBalances.userId, users.id));

        const adminStockAmount = Number(adminStock?.total || 0);
        const userHoldingsAmount = Number(userHoldings?.total || 0);
        const availableStock = adminStockAmount - userHoldingsAmount;

        // Send Telegram notification with correct remaining amount and total balance
        await Promise.allSettled([
          sendGoldPurchaseNotification({
            userName: user.name || user.email,
            goldType,
            amount: Number(amount),
            totalPrice: Number(totalPrice),
            pricePerUnit: Number(pricePerUnit),
            remainingAmount: availableStock,
            totalUserBalance: Number(totalUserBalance.total)
          })
        ]);

        return {
          balance: newBalance.balance,
          goldAmount: availableStock.toString()
        };
      }
      // ... rest of the code for sell transactions remains the same
    });

    // After successful transaction, trigger Pusher event
    await pusherServer.trigger('gold-transactions', 'transaction', {
      type,
      amount,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error processing transaction:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process transaction' },
      { status: 500 }
    );
  }
}
