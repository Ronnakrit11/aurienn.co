import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import crypto from 'crypto';
import { db } from '@/lib/db/drizzle';
import { paymentTransactions, userBalances } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

const QR_CALLBACK_SECRET = process.env.QR_CALLBACK_SECRET || '';

interface CallbackData {
  paymentId: number;
  amount: string;
  status: 'SUCCESS' | 'FAILED';
  paymentDate: string;
  timestamp: string;
}

// Error type for better error handling
interface ErrorWithMessage {
  message: string;
}

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

function toErrorWithMessage(maybeError: unknown): ErrorWithMessage {
  if (isErrorWithMessage(maybeError)) return maybeError;

  try {
    return new Error(JSON.stringify(maybeError));
  } catch {
    // fallback in case there's an error stringifying the maybeError
    // like with circular references for example.
    return new Error(String(maybeError));
  }
}

function getErrorMessage(error: unknown) {
  return toErrorWithMessage(error).message;
}

// Verify signature from callback
function verifySignature(data: CallbackData, signature: string): boolean {
  const calculatedSignature = crypto
    .createHmac('sha256', QR_CALLBACK_SECRET)
    .update(JSON.stringify(data))
    .digest('hex');
  
  return calculatedSignature === signature;
}

export async function POST(request: Request) {
  console.log('Received callback request');
  return NextResponse.json(
    { error: 'Payment service configuration error' },
    { status: 500 }
  );
//   try {
//     const headersList = headers();
//     const signature = (await headersList).get('X-Signature');
//     console.log('Signature:', signature);

//     if (!signature) {
//       console.log('Missing signature');
//       return new NextResponse(
//         JSON.stringify({ status: false, message: 'Missing signature' }),
//         { status: 400, headers: { 'Content-Type': 'application/json' } }
//       );
//     }

//     const data: CallbackData = await request.json();
//     console.log('Callback data:', data);

//     // Verify signature
//     if (!verifySignature(data, signature)) {
//       console.log('Invalid signature');
//       return new NextResponse(
//         JSON.stringify({ status: false, message: 'Invalid signature' }),
//         { status: 401, headers: { 'Content-Type': 'application/json' } }
//       );
//     }

//     // Update payment status and add balance in transaction
//     try {
//       const [payment] = await db
//         .select()
//         .from(paymentTransactions)
//         .where(
//           and(
//             eq(paymentTransactions.txnId, data.paymentId.toString()),
//             eq(paymentTransactions.status, 'PE')
//           )
//         )
//         .limit(1);

//       console.log('Found payment:', payment);

//       if (!payment) {
//         console.log('Payment not found');
//         return new NextResponse(
//           JSON.stringify({ status: false, message: 'Payment not found' }),
//           { status: 404, headers: { 'Content-Type': 'application/json' } }
//         );
//       }

//       if (payment.status === 'CP') {
//         console.log('Payment already processed');
//         return new NextResponse(
//           JSON.stringify({ status: false, message: 'Payment already processed' }),
//           { status: 400, headers: { 'Content-Type': 'application/json' } }
//         );
//       }

//       // Update payment status
//       await db.transaction(async (tx) => {
//         await tx
//           .update(paymentTransactions)
//           .set({
//             status: data.status === 'SUCCESS' ? 'CP' : 'FAIL',
//             statusName: data.status === 'SUCCESS' ? 'ชำระเงินสำเร็จ' : 'ชำระเงินไม่สำเร็จ',
//             paymentDate: new Date(data.paymentDate),
//             updatedAt: new Date(),
//           })
//           .where(eq(paymentTransactions.id, payment.id));

//         // If payment successful, update user balance
//         if (data.status === 'SUCCESS') {
//           await tx
//             .update(userBalances)
//             .set({
//               balance: sql`${userBalances.balance} + ${data.amount}`,
//               updatedAt: new Date(),
//             })
//             .where(eq(userBalances.userId, payment.userId));
//         }
//       });

//       console.log('Payment processed successfully');
//       return new NextResponse(
//         JSON.stringify({
//           status: true,
//           message: data.status === 'SUCCESS' ? 'Payment successful' : 'Payment failed'
//         }),
//         { status: 200, headers: { 'Content-Type': 'application/json' } }
//       );

//     } catch (error: unknown) {
//       console.error('Database error:', error);
//       return new NextResponse(
//         JSON.stringify({ 
//           status: false, 
//           message: 'Database error', 
//           error: getErrorMessage(error)
//         }),
//         { status: 500, headers: { 'Content-Type': 'application/json' } }
//       );
//     }
//   } catch (error: unknown) {
//     console.error('Error processing callback:', error);
//     return new NextResponse(
//       JSON.stringify({ 
//         status: false, 
//         message: 'Internal server error', 
//         error: getErrorMessage(error)
//       }),
//       { status: 500, headers: { 'Content-Type': 'application/json' } }
//     );
//   }
}
