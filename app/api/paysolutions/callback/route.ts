import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { userBalances, paymentTransactions } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { createHmac } from 'node:crypto';
import { sendDepositNotification } from '@/lib/telegram/bot';

const MERCHANT_ID = process.env.NEXT_PUBLIC_PAYSOLUTIONS_MERCHANT_ID;
const MERCHANT_SECRET_KEY = process.env.PAYSOLUTIONS_SECRET_KEY;
const API_KEY = process.env.PAYSOLUTIONS_API_KEY;

async function verifyPaymentWithPaysolutions(orderNo: string) {
  try {
    console.log('Merchant ID:', MERCHANT_ID);
    console.log('Merchant Secret Key:', MERCHANT_SECRET_KEY);
    console.log('API Key:', API_KEY);
    
    const response = await fetch('https://apis.paysolutions.asia/order/orderdetailpost', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'merchantId': MERCHANT_ID || '',
        'merchantSecretKey': MERCHANT_SECRET_KEY || '',
        'apikey': API_KEY || '',
      },
      body: JSON.stringify({
        merchantId: MERCHANT_ID,
        orderNo,
        refno: orderNo,
        productDetail: 'Payment Verification'
      })
    });

    if (!response.ok) {
      throw new Error(`PaySolutions API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error verifying payment with PaySolutions:', error);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    console.log('PaySolutions callback received:', Object.fromEntries(formData.entries()));

    // Extract data from form data
    const cardType = formData.get('cardtype') as string;
    const customerEmail = formData.get('customeremail') as string;
    const merchantId = formData.get('merchantid') as string;
    const orderNo = formData.get('orderno') as string;
    const productDetail = formData.get('productdetail') as string;
    const refNo = formData.get('refno') as string;
    const status = formData.get('status') as string;
    const statusName = formData.get('statusname') as string;
    const total = parseFloat(formData.get('total') as string);

    // Validate required fields
    if (!orderNo || !status || !total || !merchantId) {
      console.error('Missing required fields in callback');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify payment with PaySolutions API
    const verificationResult = await verifyPaymentWithPaysolutions(orderNo);
    if (!verificationResult || verificationResult.Status !== 'CP') {
      console.error('Payment verification failed:', verificationResult);
      return NextResponse.json(
        { error: 'Payment verification failed' },
        { status: 400 }
      );
    }

    // Extract user ID from order number (assuming it's stored in the order number)
    const userId = parseInt(orderNo.split('-')[0]);
    if (!userId) {
      console.error('Invalid user ID in order number');
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    // Start transaction
    await db.transaction(async (tx) => {
      // Create payment transaction record
      const [payment] = await tx.insert(paymentTransactions).values({
        status,
        statusName,
        total: total.toString(),
        txnId: '-',
        method: cardType ? 'CREDIT_CARD' : 'QR_DECIMAL',
        merchantId,
        orderNo,
        refNo,
        productDetail,
        cardType,
        customerEmail,
        currencyCode: verificationResult.CurrencyCode,
        installment: verificationResult.installment,
        postBackUrl: verificationResult.PostBackUrl,
        postBackParameters: verificationResult.PostBackParameters,
        postBackMethod: verificationResult.PostBackMethod,
        postBackCompleted: verificationResult.PostBackCompleted === 'true',
        orderDateTime: verificationResult.OrderDateTime,
        userId,
        paymentDate: new Date(),
      }).returning();

      // Update user balance
      await tx
        .update(userBalances)
        .set({
          balance: sql`(${userBalances.balance} + ${sql`${total}`})`,
          updatedAt: new Date(),
        })
        .where(eq(userBalances.userId, userId));
    });

    // Send notification
    await sendDepositNotification({
      userName: customerEmail || `User ${userId}`,
      amount: total,
      transRef: refNo
    });

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Error processing payment callback:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}