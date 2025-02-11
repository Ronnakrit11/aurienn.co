import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { productCategories } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const categories = await db
      .select({
        id: productCategories.id,
        name: productCategories.name,
        description: productCategories.description,
      })
      .from(productCategories)
      .orderBy(desc(productCategories.createdAt));

    return new NextResponse(JSON.stringify(categories), {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}