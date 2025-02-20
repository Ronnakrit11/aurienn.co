import { NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import crypto from 'crypto';

const API_KEY = process.env.PAYSOLUTIONS_API_KEY || 'y4JW3HUK';
const SECRET_KEY = process.env.PAYSOLUTIONS_SECRET_KEY || 'scHey5ehpSVpTr0w';
const MERCHANT_ID = process.env.PAYSOLUTIONS_MERCHANT_ID || '87147068';
const API_URL = 'https://sandbox-pgw.2c2p.com/payment/4.1/PaymentToken';

interface PaymentRequest {
  merchantID: string;
  invoiceNo: string;
  description: string;
  amount: string;
  currencyCode: string;
  frontendReturnUrl: string;
  backendReturnUrl: string;
}

function generateSignature(data: PaymentRequest): string {
  const signString = `${data.merchantID}${data.invoiceNo}${data.description}${data.amount}${data.currencyCode}`;
  return crypto.createHmac('sha256', SECRET_KEY)
    .update(signString)
    .digest('hex');
}

export async function POST(request: Request) {
  try {
    const user = await getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { amount } = await request.json();

    // Generate unique invoice number
    const invoiceNo = `INV${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const paymentRequest: PaymentRequest = {
      merchantID: MERCHANT_ID,
      invoiceNo,
      description: 'Deposit to Gold Trading System',
      amount: amount.toFixed(2),
      currencyCode: 'THB',
      frontendReturnUrl: `${process.env.BASE_URL}/dashboard/deposit`,
      backendReturnUrl: `${process.env.BASE_URL}/api/paysolutions/callback`,
    };

    // Generate signature
    const signature = generateSignature(paymentRequest);

    // Create final request payload
    const payload = {
      ...paymentRequest,
      signature,
      version: '2.1',
      locale: 'th',
      paymentChannel: ['CC', 'QRCODE'],
      merchantDefined1: user.id.toString(), // Store user ID for callback
    };

    // Make request to PaySolutions API
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    // Log the response for debugging
    console.log('PaySolutions API Response:', data);

    if (!response.ok) {
      return NextResponse.json(
        { error: data.respDesc || 'Failed to create payment' },
        { status: response.status }
      );
    }

    // Check for specific PaySolutions response codes
    if (data.respCode !== '0000') {
      return NextResponse.json(
        { error: data.respDesc || 'Payment creation failed' },
        { status: 400 }
      );
    }

    // Return the payment URL
    return NextResponse.json({
      success: true,
      webPaymentUrl: data.webPaymentUrl
    });

  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}