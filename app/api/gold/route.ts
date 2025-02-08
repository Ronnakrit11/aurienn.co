import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { markupSettings } from '@/lib/db/schema';
import { pusherServer } from '@/lib/pusher';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

async function fetchGoldPrices() {
  const response = await fetch('http://www.thaigold.info/RealTimeDataV2/gtdata_.txt', {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch gold prices');
  }

  const text = await response.text();
  const jsonStr = `[${text.split('[')[1].split(']')[0]}]`;
  return JSON.parse(jsonStr);
}

async function processGoldPrices(data: any[], settings: any) {
  // Get product settings from localStorage on client side
  const filteredData = data.filter((item: any) => {
    const wantedTypes = ['สมาคมฯ', '99.99%'];
    return wantedTypes.includes(item.name);
  });

  return filteredData.map((item: any) => {
    if (settings) {
      switch (item.name) {
        case '99.99%':
          return {
            ...item,
            bid: Number(item.bid) * (1 + Number(settings.gold9999Bid) / 100),
            ask: Number(item.ask) * (1 + Number(settings.gold9999Ask) / 100)
          };
        case 'สมาคมฯ':
          return {
            ...item,
            bid: Number(item.bid) * (1 + Number(settings.goldAssociationBid) / 100),
            ask: Number(item.ask) * (1 + Number(settings.goldAssociationAsk) / 100)
          };
        default:
          return item;
      }
    }
    return item;
  });
}

export async function GET() {
  try {
    const [settings] = await db
      .select()
      .from(markupSettings)
      .orderBy(markupSettings.id)
      .limit(1);

    const data = await fetchGoldPrices();
    const processedData = await processGoldPrices(data, settings);

    // Broadcast the updated prices via Pusher
    await pusherServer.trigger('gold-prices', 'price-update', {
      prices: processedData
    });

    return new NextResponse(JSON.stringify(processedData), {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error fetching gold prices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch gold prices' },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      }
    );
  }
}
