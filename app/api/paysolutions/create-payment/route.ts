import { NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import crypto from 'crypto';

const API_KEY = 'y4JW3HUK';
const SECRET_KEY = 'scHey5ehpSVpTr0w';
const MERCHANT_ID = '87147068';
const API_URL = 'https://apis.paysolutions.asia/order/orderdetailpost';

interface PaymentRequest {
  merchantId: string;
  amount: string;
  referenceNo: string;
  backendReturnUrl: string;
  frontendReturnUrl: string;
  notificationUrl: string;
  customerEmail: string;
  customerName: string;
  customerAddress: string;
  customerTelephone: string;
  merchantDefined1: string;
  merchantDefined2: string;
  merchantDefined3: string;
  merchantDefined4: string;
  merchantDefined5: string;
  paymentDescription: string;
  currencyCode: string;
  nonceStr: string;
  timestamp: string;
}

function generateSignature(data: PaymentRequest): string {
  const signString = `${data.merchantId}|${data.amount}|${data.referenceNo}|${data.nonceStr}|${data.timestamp}`;
  return crypto.createHmac('sha256', SECRET_KEY)
    .update(signString)
    .digest('hex');
}

function generateNonceStr(length: number = 32): string {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
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

    // Generate unique reference number
    const referenceNo = `REF${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const nonceStr = generateNonceStr();
    const timestamp = Math.floor(Date.now() / 1000).toString();

    const paymentRequest: PaymentRequest = {
      merchantId: MERCHANT_ID,
      amount: amount.toFixed(2),
      referenceNo,
      backendReturnUrl: `${process.env.BASE_URL}/api/paysolutions/callback`,
      frontendReturnUrl: `${process.env.BASE_URL}/dashboard/deposit`,
      notificationUrl: `${process.env.BASE_URL}/api/paysolutions/notification`,
      customerEmail: user.email,
      customerName: user.name || user.email,
      customerAddress: '',
      customerTelephone: user.phone || '',
      merchantDefined1: user.id.toString(), // Store user ID for reference
      merchantDefined2: '',
      merchantDefined3: '',
      merchantDefined4: '',
      merchantDefined5: '',
      paymentDescription: 'Deposit to Gold Trading System',
      currencyCode: 'THB',
      nonceStr,
      timestamp,
    };

    // Generate signature
    const signature = generateSignature(paymentRequest);

    // Create final request payload
    const payload = {
      ...paymentRequest,
      signature
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

    if (!response.ok) {
      const errorData = await response.json();
      console.error('PaySolutions API error:', errorData);
      throw new Error(errorData.message || 'Failed to create payment');
    }

    const data = await response.json();

    if (data.status !== 'success') {
      throw new Error(data.message || 'Failed to create payment');
    }

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