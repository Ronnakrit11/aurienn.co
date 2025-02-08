import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { goldAssets } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const user = await getUser();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { id, cutAmount } = body;

    if (!id || !cutAmount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get the existing asset
    const [asset] = await db
      .select()
      .from(goldAssets)
      .where(eq(goldAssets.id, id))
      .limit(1);

    if (!asset) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      );
    }

    // Calculate new amount
    const currentAmount = Number(asset.amount);
    const amountToCut = Number(cutAmount);
    
    if (isNaN(currentAmount) || isNaN(amountToCut)) {
      return NextResponse.json(
        { error: 'Invalid amount values' },
        { status: 400 }
      );
    }
    
    if (amountToCut > currentAmount) {
      return NextResponse.json(
        { error: 'Cut amount exceeds available stock' },
        { status: 400 }
      );
    }

    if (amountToCut <= 0) {
      return NextResponse.json(
        { error: 'Cut amount must be greater than 0' },
        { status: 400 }
      );
    }

    const newAmount = currentAmount - amountToCut;

    // Update the asset amount
    const [updatedAsset] = await db
      .update(goldAssets)
      .set({
        amount: newAmount.toString(),
        updatedAt: new Date(),
      })
      .where(eq(goldAssets.id, id))
      .returning();

    if (!updatedAsset) {
      return NextResponse.json(
        { error: 'Failed to update asset' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updatedAsset.id,
        amount: updatedAsset.amount,
        newAmount: newAmount.toString()
      }
    });

  } catch (error) {
    console.error('Error cutting gold stock:', error);
    return NextResponse.json(
      { error: 'Failed to cut gold stock' },
      { status: 500 }
    );
  }
}