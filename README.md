# NICE Enterprises ERP (`amkas-distribution`)

[![Open in Bolt](https://bolt.new/static/open-in-bolt.svg)](https://bolt.new/~/sb1-x1wpmmbv)

Enterprise Distribution & Accounting ERP built with Vite, React 18, TypeScript, TanStack Query v5, Zustand v5 (UI state only), and Supabase Postgres + Realtime.

## Required Environment Variables & Deployment

Copy `.env.example` to `.env` for local development (never commit `.env`):

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_BUILD_ID=
```

### Production Hosting Requirements

1. **Set Environment Variables in Hosting Provider**: Both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` **must** be configured in your hosting provider's environment settings (e.g., Vercel, Netlify, Cloudflare Pages).
2. **Rebuild After Changing Environment Variables**: Vite statically inlines `VITE_*` variables at build time (`vite build`). Any change to `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, or `VITE_BUILD_ID` in the hosting dashboard requires triggering a **fresh build and redeploy** for the new values to take effect.
3. **Missing Configuration Protection**: If either `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is missing at build time, the application renders a full-screen **"Configuration missing"** diagnostic screen and refuses to run against local/fallback state.
4. **Single Production Supabase Project**: Always point all environments that share data to the same Supabase project. Compare the **Build** and **Host** diagnostic line in the `AppShell` footer (and browser console startup log `[NICE-ERP] Build: ... | Supabase Host: ...`) across PCs to verify they are connected to the same project and build.

## Database Migrations & Realtime Setup

Run `supabase/migrations/20261116190000_realtime_and_sync_foundation.sql` in the Supabase SQL Editor to:
- Ensure all normalized ERP tables have `UUID` primary keys (`DEFAULT gen_random_uuid()`), `created_at`, and server-side `updated_at` triggers (`set_updated_at()`).
- Enable `REPLICA IDENTITY FULL` and register all ERP tables in the `supabase_realtime` publication.
- Keep Row Level Security (RLS) enabled with explicit policies.
- Install atomic `SECURITY DEFINER` RPC functions (`post_sales_invoice`, `post_purchase_invoice`, `post_customer_receipt`, `post_vendor_payment`, `post_sales_return`, `post_purchase_return`, `post_stock_transfer`, `post_stock_adjustment`, `review_approval_queue_item`).
- Backup `cloud_sync_state` into `cloud_sync_state_backup` and migrate any legacy snapshot rows into the normalized tables.
