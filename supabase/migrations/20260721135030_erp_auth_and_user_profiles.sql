/*
# AMKAS ERP — Authentication & User Profiles

Adds a user_profiles table linking auth.users to ERP roles, and converts
all existing RLS policies from anon+authenticated (single-tenant) to
authenticated-only (multi-user with sign-in).

1. New Tables
- user_profiles: links auth.users(id) to ERP role + display name
  - id (uuid, PK, FK → auth.users.id ON DELETE CASCADE)
  - email (text, unique) — mirrors auth.users.email for easy listing
  - full_name (text) — display name shown in UI
  - role (text) — one of: super_admin, accountant, sales_manager,
    purchase_clerk, salesman, store_keeper, viewer
  - is_active (boolean, default true) — admin can deactivate users
  - created_at (timestamptz)

2. Security Changes
- RLS enabled on user_profiles.
- All authenticated users can SELECT user_profiles (needed to list users
  in admin panel and to read own role).
- Only super_admin can INSERT/UPDATE/DELETE user_profiles (enforced via
  a helper function checking the caller's role).
- All existing table policies converted from "TO anon, authenticated" to
  "TO authenticated" — the app now requires sign-in.

3. Helper Function
- get_current_role() → text: returns the role of the currently authenticated
  user from user_profiles, or NULL if not found.

4. Important Notes
- The admin user (admin@amkas.pk) is created via the user-management edge
  function using the Supabase Auth Admin API, then linked here.
- Email confirmation stays OFF (Supabase default for this project).
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text DEFAULT '',
  role text NOT NULL DEFAULT 'viewer',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION get_current_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid();
$$;

-- Policies for user_profiles
DROP POLICY IF EXISTS "select_user_profiles" ON user_profiles;
CREATE POLICY "select_user_profiles"
ON user_profiles FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "insert_user_profiles" ON user_profiles;
CREATE POLICY "insert_user_profiles"
ON user_profiles FOR INSERT
TO authenticated
WITH CHECK (get_current_role() = 'super_admin');

DROP POLICY IF EXISTS "update_user_profiles" ON user_profiles;
CREATE POLICY "update_user_profiles"
ON user_profiles FOR UPDATE
TO authenticated
USING (get_current_role() = 'super_admin')
WITH CHECK (get_current_role() = 'super_admin');

DROP POLICY IF EXISTS "delete_user_profiles" ON user_profiles;
CREATE POLICY "delete_user_profiles"
ON user_profiles FOR DELETE
TO authenticated
USING (get_current_role() = 'super_admin');

-- Convert all existing table policies from anon+authenticated to authenticated-only
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'organizations','branches','chart_of_accounts','control_account_mappings',
    'account_ledger','products','warehouses','stock_ledger','customers','vendors',
    'sales_invoices','sales_invoice_items','approval_queue'
  ] LOOP
    -- Drop old anon policies
    EXECUTE format('DROP POLICY IF EXISTS "anon_select_%s" ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "anon_insert_%s" ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "anon_update_%s" ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "anon_delete_%s" ON %I', t, t);

    -- Create authenticated-only policies (shared ERP data, all authenticated users)
    EXECUTE format('CREATE POLICY "auth_select_%s" ON %I FOR SELECT TO authenticated USING (true)', t, t);
    EXECUTE format('CREATE POLICY "auth_insert_%s" ON %I FOR INSERT TO authenticated WITH CHECK (true)', t, t);
    EXECUTE format('CREATE POLICY "auth_update_%s" ON %I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)', t, t);
    EXECUTE format('CREATE POLICY "auth_delete_%s" ON %I FOR DELETE TO authenticated USING (true)', t, t);
  END LOOP;
END $$;
