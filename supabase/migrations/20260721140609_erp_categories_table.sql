/*
# AMKAS ERP — Categories Table

Adds a product categories table for organizing the product catalog.

1. New Tables
- categories: product category directory
  - id (uuid, PK)
  - name (text, unique, not null)
  - description (text)
  - is_active (boolean, default true)
  - created_at (timestamptz)

2. Security
- RLS enabled on categories.
- All authenticated users can CRUD (shared ERP data).
*/

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_categories" ON categories;
CREATE POLICY "auth_select_categories" ON categories FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_categories" ON categories;
CREATE POLICY "auth_insert_categories" ON categories FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_categories" ON categories;
CREATE POLICY "auth_update_categories" ON categories FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_categories" ON categories;
CREATE POLICY "auth_delete_categories" ON categories FOR DELETE
TO authenticated USING (true);
