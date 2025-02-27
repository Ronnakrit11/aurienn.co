ALTER TABLE "payment_transactions" ALTER COLUMN "payment_id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "payment_transactions" ALTER COLUMN "payment_id" SET NOT NULL;