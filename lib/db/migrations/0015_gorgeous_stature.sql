CREATE TABLE IF NOT EXISTS "payment_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"ibId " text DEFAULT '' NOT NULL,
	"cookie" text DEFAULT '' NOT NULL,
	"token" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
