ALTER TABLE "verified_slips" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "verified_slips" CASCADE;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD COLUMN "status_name" text;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD COLUMN "total" numeric NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD COLUMN "merchant_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD COLUMN "order_no" text NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD COLUMN "ref_no" text NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD COLUMN "product_detail" text;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD COLUMN "card_type" text;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD COLUMN "customer_email" text;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD COLUMN "currency_code" text;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD COLUMN "installment" integer;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD COLUMN "post_back_url" text;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD COLUMN "post_back_parameters" text;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD COLUMN "post_back_method" text;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD COLUMN "post_back_completed" boolean;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD COLUMN "order_date_time" timestamp;--> statement-breakpoint
ALTER TABLE "payment_transactions" DROP COLUMN IF EXISTS "payment_amount";--> statement-breakpoint
ALTER TABLE "payment_transactions" DROP COLUMN IF EXISTS "payment_id";--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_order_no_unique" UNIQUE("order_no");