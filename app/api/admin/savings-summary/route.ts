import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { goldAssets, users } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { eq, sql, and, ne } from 'drizzle-orm';

const ADMIN_EMAIL = 'adminfortest@gmail.com';

export async function GET() {
  try {
    const user = await getUser();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get admin's stock for each gold type
    const adminStocks = await db
      .select({
        goldType: goldAssets.goldType,
        totalAmount: sql<string>`COALESCE(sum(${goldAssets.amount}), '0')`
      })
      .from(goldAssets)
      .leftJoin(users, eq(goldAssets.userId, users.id))
      .where(
        and(
          eq(users.email, ADMIN_EMAIL)
        )
      )
      .groupBy(goldAssets.goldType);

    // Get user holdings for each gold type (excluding admin)
    const userSummaries = await db
      .select({
        userId: users.id,
        userName: users.name,
        userEmail: users.email,
        userRole: users.role,
        goldType: goldAssets.goldType,
        totalAmount: sql<string>`COALESCE(sum(${goldAssets.amount}), '0')`,
        totalValue: sql<string>`COALESCE(sum(${goldAssets.amount} * ${goldAssets.purchasePrice}), '0')`
      })
      .from(goldAssets)
      .leftJoin(users, eq(goldAssets.userId, users.id))
      .where(
        and(
          sql`${goldAssets.amount} > 0`,
          ne(users.role, 'admin')
        )
      )
      .groupBy(users.id, users.name, users.email, users.role, goldAssets.goldType);

    // Get total holdings by type (excluding admin)
    const goldHoldings = await db
      .select({
        goldType: goldAssets.goldType,
        totalAmount: sql<string>`COALESCE(sum(${goldAssets.amount}), '0')`,
        totalValue: sql<string>`COALESCE(sum(${goldAssets.amount} * ${goldAssets.purchasePrice}), '0')`,
        averagePrice: sql<string>`CASE 
          WHEN sum(${goldAssets.amount}) > 0 
          THEN sum(${goldAssets.amount} * ${goldAssets.purchasePrice}) / sum(${goldAssets.amount})
          ELSE '0'
        END`
      })
      .from(goldAssets)
      .leftJoin(users, eq(goldAssets.userId, users.id))
      .where(
        and(
          sql`${goldAssets.amount} > 0`,
          ne(users.role, 'admin')
        )
      )
      .groupBy(goldAssets.goldType);

    return NextResponse.json({
      goldHoldings,
      userSummaries,
      adminStocks
    });
  } catch (error) {
    console.error('Error fetching savings summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch savings summary' },
      { status: 500 }
    );
  }
}