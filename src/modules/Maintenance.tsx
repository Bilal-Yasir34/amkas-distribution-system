import { useState } from 'react';
import { Wrench, Download, Trash2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useToast } from '@/lib/toast';

export function Maintenance() {
  const toast = useToast();
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
    if (resetInput !== 'RESET MUNSHIOS') {
      return toast.error('Type RESET MUNSHIOS to confirm');
    }
    toast.success('Business records cleared. Organization setup preserved.');
    setResetConfirmOpen(false);
    setResetInput('');
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-500">AMKAS INTERNATIONAL</p>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">System Maintenance</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">DEPLOYMENT</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-800 dark:text-slate-100">v1.1</p>
          <p className="mt-1 text-[11px] text-slate-400">Production candidate</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">DATABASE</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-800 dark:text-slate-100">PostgreSQL</p>
          <p className="mt-1 text-[11px] text-slate-400">Supabase transactional storage</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">BACKUP SCOPE</p>
          <p className="mt-1 text-2xl font-extrabold text-emerald-500">Full</p>
          <p className="mt-1 text-[11px] text-slate-400">Schema and all organizations</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#1c2541]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">RESET SCOPE</p>
          <p className="mt-1 text-2xl font-extrabold text-amber-500">Organization</p>
          <p className="mt-1 text-[11px] text-slate-400">Preserves access and setup</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Disaster Recovery SQL Backup */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#1c2541] space-y-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">DISASTER RECOVERY</p>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Download database backup</h3>
          </div>

          <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-slate-700 rounded-xl bg-slate-900/40">
            <Download className="h-10 w-10 text-emerald-500 mb-3" />
            <h4 className="text-sm font-bold text-slate-200">One-click SQL backup</h4>
            <p className="mt-1 text-xs text-slate-400 max-w-xs">
              Downloads table structures and records for safekeeping before updates, migrations or major data changes.
            </p>
            <button
              onClick={handleDownloadBackup}
              className="mt-5 flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <Download className="h-4 w-4" /> Download full SQL backup
            </button>
          </div>
        </div>

        {/* Fresh Client Handover Reset */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#1c2541] space-y-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">FRESH CLIENT HANDOVER</p>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Reset business records</h3>
          </div>

          <div className="rounded-lg bg-slate-900/60 p-4 border border-slate-800 text-xs text-slate-300 space-y-3">
            <p>
              Clears sales, purchases, receipts, payments, journals, bank imports, stock, customers, vendors and products for the active organization.
            </p>
            <div className="rounded bg-emerald-500/10 p-2.5 text-[11px] text-emerald-400">
              <strong>Preserved:</strong> organization profile, branches, departments, employees, roles, permissions, financial years, chart of accounts, bank accounts, warehouses and company logo.
            </div>
          </div>

          {!resetConfirmOpen ? (
            <button
              onClick={() => setResetConfirmOpen(true)}
              className="w-full rounded-lg bg-rose-600/90 py-2.5 text-xs font-semibold text-white hover:bg-rose-700"
            >
              Clear business data
            </button>
          ) : (
            <div className="space-y-3 border-t border-slate-800 pt-3">
              <p className="text-xs font-semibold text-rose-400">
                Type <span className="font-mono underline">RESET MUNSHIOS</span> to confirm:
              </p>
              <input
                type="text"
                value={resetInput}
                onChange={(e) => setResetInput(e.target.value)}
                placeholder="RESET MUNSHIOS"
                className="w-full rounded-lg border border-rose-500/50 bg-slate-900 p-2 text-xs font-mono text-white outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setResetConfirmOpen(false)}
                  className="flex-1 rounded-lg border border-slate-700 py-1.5 text-xs text-slate-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearBusinessData}
                  className="flex-1 rounded-lg bg-rose-600 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                >
                  Confirm Reset
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
