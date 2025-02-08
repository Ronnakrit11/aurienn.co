/*
  # Add product settings table

  1. New Tables
    - `product_settings`
      - `id` (serial, primary key)
      - `name` (varchar) - Product name
      - `is_active` (boolean) - Whether the product is active
      - `updated_at` (timestamp)
      - `updated_by` (integer, foreign key) - Admin who updated the setting

  2. Security
    - Enable RLS on `product_settings` table
    - Add policy for admin access
*/

CREATE TABLE IF NOT EXISTS product_settings (
  id serial PRIMARY KEY,
  name varchar(100) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by integer REFERENCES users(id)
);

ALTER TABLE product_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage product settings"
  ON product_settings
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Insert default products
INSERT INTO product_settings (name, is_active)
VALUES 
  ('ทองสมาคม 96.5%', true),
  ('ทอง 99.99%', true)
ON CONFLICT (name) DO NOTHING;