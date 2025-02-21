import { NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { createHmac } from 'node:crypto';

// API Configuration
const API_KEY = process.env.PAYSOLUTIONS_API_KEY;
const SECRET_KEY = process.env.PAYSOLUTIONS_SECRET_KEY;
const MERCHANT_ID = process.env.PAYSOLUTIONS_MERCHANT_ID;
const API_URL = 'https://apis.paysolutions.asia/order/orderdetailpost';

interface PaymentRequest {
  merchantId: string;
  invoiceNo: string;
  description: string;
  amount: string;
  currency: string;
  frontendReturnUrl: string;
  backendReturnUrl: string;
}

function generateSignature(data: PaymentRequest): string {
  const signString = `${data.merchantId}${data.invoiceNo}${data.description}${data.amount}${data.currency}`;
  return createHmac('sha256', SECRET_KEY || '')
    .update(signString)
    .digest('hex');
}

export async function POST(request: Request) {
  try {
    // Validate API configuration
    if (!API_KEY || !SECRET_KEY || !MERCHANT_ID) {
      console.error('Missing PaySolutions configuration');
      return NextResponse.json(
        { error: 'Payment service configuration error' },
        { status: 500 }
      );
    }

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

    // Format amount to 2 decimal places
    const formattedAmount = amount.toFixed(2);

    // Create payment request according to API docs
    const paymentRequest: PaymentRequest = {
      merchantId: MERCHANT_ID,
      invoiceNo,
      description: 'Deposit to Gold Trading System',
      amount: formattedAmount,
      currency: 'THB',
      frontendReturnUrl: `${process.env.BASE_URL}/dashboard/deposit`,
      backendReturnUrl: `${process.env.BASE_URL}/api/paysolutions/callback`,
    };

    // Generate signature
    const signature = generateSignature(paymentRequest);

    // Create final request payload
    const payload = {
      ...paymentRequest,
      signature,
      locale: 'th',
      paymentChannel: ['CC', 'QRCODE'],
      merchantDefined1: user.id.toString(), // Store user ID for callback
      merchantDefined2: 'deposit', // Transaction type
      merchantDefined3: new Date().toISOString(), // Timestamp
    };

    console.log('Sending request to PaySolutions:', {
      url: API_URL,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
      },
      payload
    });

    // Make request to PaySolutions API
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      console.error('Non-JSON response:', text);
      return NextResponse.json(
        { error: 'Invalid response from payment service' },
        { status: 500 }
      );
    }

    console.log('PaySolutions API Response:', data);

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || 'Failed to create payment' },
        { status: response.status }
      );
    }

    // Check for required fields in response
    if (!data.paymentUrl) {
      console.error('Missing paymentUrl in response:', data);
      return NextResponse.json(
        { error: 'Invalid payment service response' },
        { status: 500 }
      );
    }

    // Return the payment URL
    return NextResponse.json({
      success: true,
      webPaymentUrl: data.paymentUrl,
      paymentToken: data.paymentToken
    });

  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
} 