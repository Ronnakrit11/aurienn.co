/*
  # Add product settings table

  1. New Tables
    - `product_settings`
      - `id` (serial, primary key)
      - `name` (varchar) - Product name
      - `is_active` (boolean) - Whether product is active
      - `updated_at` (timestamp)
      - `updated_by` (integer, foreign key)
*/

CREATE TABLE IF NOT EXISTS product_settings (
  id serial PRIMARY KEY,
  name varchar(100) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by integer REFERENCES users(id)
);

-- Insert default settings
INSERT INTO product_settings (name, is_active)
VALUES 
  ('ทองสมาคม 96.5%', true),
  ('ทอง 99.99%', true)
ON CONFLICT DO NOTHING;