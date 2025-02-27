ALTER TABLE "payment_transactions" ADD COLUMN "amount" numeric DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD COLUMN "trans_ref" text DEFAULT '-';