import { useState } from 'react';
import { Wrench, Download, Trash2, ShieldCheck, Database, HardDrive, AlertTriangle, RefreshCw } from 'lucide-react';
import { useToast } from '@/lib/toast';
import { useDataStore } from '@/lib/dataStore';

export function Maintenance() {
  const toast = useToast();
  const { resetBusinessData } = useDataStore();
  const [resetInput, setResetInput] = useState('');
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const handleDownloadBackup = () => {
    const backupSQL = `-- AMKAS International ERP Full SQL Backup Dump
-- Generated at: ${new Date().toISOString()}
-- Database Version: v1.1

CREATE TABLE organizations (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT, legal_name TEXT, currency TEXT DEFAULT 'PKR');
CREATE TABLE branches (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), org_id UUID REFERENCES organizations(id), name TEXT, code TEXT);
CREATE TABLE chart_of_accounts (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), code TEXT UNIQUE, name TEXT, account_type TEXT, is_control_account BOOLEAN DEFAULT false);
CREATE TABLE account_ledger (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), account_id UUID REFERENCES chart_of_accounts(id), voucher_no TEXT, voucher_type TEXT, transaction_date DATE, description TEXT, debit NUMERIC DEFAULT 0, credit NUMERIC DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE products (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), code TEXT UNIQUE, name TEXT, unit TEXT, length NUMERIC DEFAULT 0, width NUMERIC DEFAULT 0, purchase_price NUMERIC, sale_price NUMERIC, reorder_level NUMERIC DEFAULT 0, track_batches BOOLEAN DEFAULT false, track_serials BOOLEAN DEFAULT false);
CREATE TABLE stock_ledger (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), product_id UUID REFERENCES products(id), warehouse_id UUID, voucher_no TEXT, voucher_type TEXT, qty_in NUMERIC DEFAULT 0, qty_out NUMERIC DEFAULT 0, unit_cost NUMERIC, created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE sales_invoices (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), invoice_no TEXT UNIQUE, customer_id UUID, warehouse_id UUID, invoice_date DATE, status TEXT DEFAULT 'UNPOSTED', total_amount NUMERIC, gate_pass_no TEXT);
`;
    const blob = new Blob([backupSQL], { type: 'application/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `amkas_erp_backup_${new Date().toISOString().slice(0, 10)}.sql`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('SQL Backup downloaded successfully');
  };

  const handleClearBusinessData = () => {
    if (resetInput !== 'RESET AMKAS') {
      return toast.error('Type RESET AMKAS to confirm');
    }
    resetBusinessData();
    toast.success('Business records cleared. Organization setup preserved.');
    setResetConfirmOpen(false);
    setResetInput('');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-amber-500/20">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-amber-500">SYSTEM GOVERNANCE & UTILITIES</p>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-heading flex items-center gap-2.5 mt-0.5">
            <Wrench className="h-6 w-6 text-amber-500" />
            System Maintenance
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge badge-approved flex items-center gap-1.5 px-3.5 py-1.5 text-xs">
            <ShieldCheck className="h-4 w-4 text-amber-400" /> System Healthy & Secure
          </span>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">DEPLOYMENT VERSION</p>
            <div className="rounded-xl bg-amber-500/15 p-2 text-amber-500">
              <HardDrive className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-heading">v1.1</p>
          <p className="mt-1 text-xs font-semibold text-amber-500 dark:text-amber-400">Production Candidate Build</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">DATABASE ENGINE</p>
            <div className="rounded-xl bg-amber-500/15 p-2 text-amber-500">
              <Database className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-heading">PostgreSQL</p>
          <p className="mt-1 text-xs font-semibold text-amber-500 dark:text-amber-400">Supabase Transactional Storage</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">BACKUP SCOPE</p>
            <div className="rounded-xl bg-amber-500/15 p-2 text-amber-500">
              <Download className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-amber-500 dark:text-amber-400 font-heading">FULL SQL</p>
          <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">Schema & All Organizations</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">RESET SCOPE</p>
            <div className="rounded-xl bg-rose-500/15 p-2 text-rose-500">
              <RefreshCw className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-amber-500 dark:text-amber-400 font-heading">ORGANIZATION</p>
          <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">Preserves Users & Setup</p>
        </div>
      </div>

      {/* Main Operations Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Disaster Recovery SQL Backup */}
        <div className="card p-6 space-y-5">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-500">DISASTER RECOVERY</p>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 font-heading mt-0.5">
              Download Database Backup
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
              Generate an instant, unencrypted SQL snapshot of all database structures and transactional tables.
            </p>
          </div>

          <div className="flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-amber-500/40 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 backdrop-blur-md">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/30 mb-4">
              <Download className="h-8 w-8" />
            </div>
            <h4 className="text-base font-extrabold text-slate-900 dark:text-slate-100 font-heading">One-Click SQL Dump</h4>
            <p className="mt-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 max-w-sm leading-relaxed">
              Safely export table schemas, ledgers, products, invoices, and vouchers before major updates or migrations.
            </p>
            <button
              onClick={handleDownloadBackup}
              className="mt-6 btn-primary px-6 py-3 text-xs"
            >
              <Download className="h-4 w-4" /> Download Full SQL Backup
            </button>
          </div>
        </div>

        {/* Fresh Client Handover Reset */}
        <div className="card p-6 space-y-5">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-rose-500">FRESH CLIENT HANDOVER</p>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 font-heading mt-0.5">
              Reset Business Records
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
              Purge dummy testing transactions while retaining organization settings, master accounts, and employee setup.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-100 dark:bg-slate-800/80 p-5 border border-slate-200 dark:border-amber-500/20 text-xs space-y-3.5 backdrop-blur-md">
            <div className="flex items-start gap-2.5 text-slate-800 dark:text-slate-200 leading-relaxed font-semibold">
              <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
              <p>
                Clears all sales, purchases, receipts, payments, journals, bank imports, stock movements, customers, vendors, and product catalogs for the active organization.
              </p>
            </div>
            <div className="rounded-xl bg-amber-500/15 p-3 text-xs text-amber-700 dark:text-amber-300 border border-amber-500/30">
              <strong className="font-extrabold text-amber-800 dark:text-amber-200">Preserved Configuration:</strong> Organization profile, branches, departments, employee credentials, role permissions, financial years, chart of accounts, bank accounts, warehouses, and company logo.
            </div>
          </div>

          {!resetConfirmOpen ? (
            <button
              onClick={() => setResetConfirmOpen(true)}
              className="btn btn-danger w-full justify-center py-3 text-xs"
            >
              <Trash2 className="h-4 w-4" /> Clear Business Data
            </button>
          ) : (
            <div className="space-y-4 border-t border-slate-200 dark:border-amber-500/20 pt-4">
              <div className="rounded-xl bg-rose-500/10 p-3 border border-rose-500/30">
                <p className="text-xs font-bold text-rose-600 dark:text-rose-400">
                  Type <span className="font-mono font-extrabold underline">RESET AMKAS</span> below to confirm data wipe:
                </p>
              </div>
              <input
                type="text"
                value={resetInput}
                onChange={(e) => setResetInput(e.target.value)}
                placeholder="RESET AMKAS"
                className="input font-mono font-bold text-sm tracking-wider uppercase"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setResetConfirmOpen(false)}
                  className="btn btn-secondary flex-1 py-2.5 text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearBusinessData}
                  className="btn btn-danger flex-1 py-2.5 text-xs"
                >
                  Confirm Data Wipe
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

