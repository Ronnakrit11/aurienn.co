CREATE TABLE IF NOT EXISTS "payment_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"payment_amount" numeric(10, 2) NOT NULL,
	"method" text DEFAULT 'QR_DECIMAL' NOT NULL,
	"payment_date" timestamp,
	"payment_id" varchar(100),
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
