import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { productSettings } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { eq } from 'drizzle-orm';

const DEFAULT_PRODUCTS = [
  { name: 'ทองสมาคม 96.5%', isActive: true },
  { name: 'ทอง 99.99%', isActive: true }
];

export async function GET() {
  try {
    // Get existing settings
    let settings = await db
      .select()
      .from(productSettings)
      .orderBy(productSettings.name);

    // If no settings exist, initialize with defaults
    if (settings.length === 0) {
      const insertPromises = DEFAULT_PRODUCTS.map(product => 
        db.insert(productSettings).values({
          name: product.name,
          isActive: product.isActive
        })
      );
      
      await Promise.all(insertPromises);

      // Fetch the newly created settings
      settings = await db
        .select()
        .from(productSettings)
        .orderBy(productSettings.name);
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching product settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUser();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { name, isActive } = await request.json();

    // Update existing setting or create new one
    const [setting] = await db
      .select()
      .from(productSettings)
      .where(eq(productSettings.name, name))
      .limit(1);

    if (setting) {
      await db
        .update(productSettings)
        .set({
          isActive,
          updatedAt: new Date(),
          updatedBy: user.id,
        })
        .where(eq(productSettings.id, setting.id));
    } else {
      await db.insert(productSettings).values({
        name,
        isActive,
        updatedBy: user.id,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating product settings:', error);
    return NextResponse.json(
      { error: 'Failed to update product settings' },
      { status: 500 }
    );
  }
}