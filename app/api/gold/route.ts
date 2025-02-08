import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { markupSettings, productSettings } from '@/lib/db/schema';
import { pusherServer } from '@/lib/pusher';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<Response> {
  try {
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response;
  } catch (error) {
    if (retries > 0) {
      await delay(RETRY_DELAY);
      return fetchWithRetry(url, retries - 1);
    }
    throw error;
  }
}

async function fetchGoldPrices() {
  try {
    const response = await fetchWithRetry('http://www.thaigold.info/RealTimeDataV2/gtdata_.txt');
    const text = await response.text();
    
    // Validate response format
    if (!text.includes('[') || !text.includes(']')) {
      throw new Error('Invalid response format from gold price API');
    }
    
    const jsonStr = `[${text.split('[')[1].split(']')[0]}]`;
    
    try {
      return JSON.parse(jsonStr);
    } catch (parseError) {
      throw new Error('Failed to parse gold price data');
    }
  } catch (error) {
    console.error('Error fetching gold prices:', error);
    // Return fallback data if API fails
    return [
      { name: 'สมาคมฯ', bid: '0', ask: '0', diff: '0' },
      { name: '99.99%', bid: '0', ask: '0', diff: '0' }
    ];
  }
}

async function processGoldPrices(data: any[], settings: any) {
  try {
    // Get active products from database
    const activeProducts = await db
      .select()
      .from(productSettings)
      .where(eq(productSettings.isActive, true));

    // Create a mapping for gold types
    const goldTypeMap: { [key: string]: string } = {
      'สมาคมฯ': 'ทองสมาคม 96.5%',
      '99.99%': 'ทอง 99.99%'
    };

    // Filter data based on active products
    const filteredData = data.filter((item: any) => {
      const goldType = goldTypeMap[item.name];
      return goldType && activeProducts.some(p => p.name === goldType);
    });

    if (filteredData.length === 0) {
      console.warn('No active gold products found');
    }

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
  } catch (error) {
    console.error('Error processing gold prices:', error);
    return [];
  }
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

    // Only trigger Pusher if we have valid data
    if (processedData.length > 0) {
      await pusherServer.trigger('gold-prices', 'price-update', {
        prices: processedData
      });
    }

    return new NextResponse(JSON.stringify(processedData), {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error in gold price API:', error);
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