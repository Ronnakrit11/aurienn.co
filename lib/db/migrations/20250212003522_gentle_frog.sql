/*
  # Add quantity field to gold_products table

  1. Changes
    - Add quantity column to gold_products table
    - Set default value to 0
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gold_products' AND column_name = 'quantity'
  ) THEN
    ALTER TABLE gold_products ADD COLUMN quantity integer NOT NULL DEFAULT 0;
  END IF;
END $$;