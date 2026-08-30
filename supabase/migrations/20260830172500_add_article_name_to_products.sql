-- Add article_name to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS article_name text;
