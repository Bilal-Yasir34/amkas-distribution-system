import { useState, useRef } from 'react';
import {
  Wrench,
  Download,
  Upload,
  Trash2,
  ShieldCheck,
  Database,
  HardDrive,
  AlertTriangle,
  RefreshCw,
  KeyRound,
  ShieldAlert,
  Power,
  CheckCircle2,
  AlertCircle,
  Cloud,
  UploadCloud,
  DownloadCloud,
  ClipboardPaste,
  FileCode,
  Copy,
  Check,
  ExternalLink,
  X,
} from 'lucide-react';
import { useToast } from '@/lib/toast';
import { useDataStore } from '@/lib/dataStore';
import { pushStateToSupabase, pullStateFromSupabase, SUPABASE_FIX_SQL } from '@/lib/cloudSync';

export function Maintenance() {
  const toast = useToast();
  const { resetBusinessData, isMaintenanceMode, enableMaintenanceMode, disableMaintenanceMode } = useDataStore();
  const [resetInput, setResetInput] = useState('');
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // Cloud Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [isRlsBlocked, setIsRlsBlocked] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // File upload ref for JSON import
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Paste Data Modal state
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteInput, setPasteInput] = useState('');

  // Maintenance mode turn-off modal state
  const [showTurnOffModal, setShowTurnOffModal] = useState(false);
  const [turnOffPassword, setTurnOffPassword] = useState('');
  const [turnOffError, setTurnOffError] = useState<string | null>(null);

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_FIX_SQL);
    setCopiedSql(true);
    toast.success('Supabase SQL fix script copied to clipboard!');
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleEnableMode = () => {
    enableMaintenanceMode();
    toast.success('Maintenance mode ENABLED. Non-admin user access is now restricted.');
  };

  const handleDisableModeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTurnOffError(null);
    const res = disableMaintenanceMode(turnOffPassword);
    if (!res.success) {
      setTurnOffError(res.error || 'Incorrect password.');
      toast.error(res.error || 'Incorrect password.');
      return;
    }
    toast.success('Maintenance mode DISABLED successfully.');
    setShowTurnOffModal(false);
    setTurnOffPassword('');
  };

  const handlePushToCloud = async () => {
    setSyncing(true);
    setIsRlsBlocked(false);
    setSyncMessage('Pushing current store to Supabase Cloud Database...');
    const res = await pushStateToSupabase();
    setSyncing(false);
    if (res.success) {
      toast.success(res.message);
      setSyncMessage(res.message);
      setIsRlsBlocked(false);
    } else {
      toast.error(res.message);
      setSyncMessage(res.message);
      if (res.isRlsError) {
        setIsRlsBlocked(true);
        setShowSqlModal(true);
      }
    }
  };

  const handlePullFromCloud = async () => {
    setSyncing(true);
    setSyncMessage('Pulling latest data from Supabase Cloud...');
    const res = await pullStateFromSupabase();
    setSyncing(false);
    if (res.success) {
      toast.success(res.message);
      setSyncMessage(res.message);
    } else {
      toast.error(res.message);
      setSyncMessage(res.message);
    }
  };

  const handleExportJSON = () => {
    try {
      const state = useDataStore.getState();
      const exportData = {
        exportedAt: new Date().toISOString(),
        version: '1.1',
        data: state,
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `amkas_erp_data_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Full system JSON snapshot exported successfully!');
    } catch {
      toast.error('Failed to export JSON snapshot');
    }
  };

  const applyImportedData = (rawText: string) => {
    try {
      let parsed = JSON.parse(rawText.trim());
      // Handle wrapped format { state: { ... } } or { data: { ... } }
      if (parsed.state) parsed = parsed.state;
      if (parsed.data) parsed = parsed.data;

      // Validate presence of core arrays
      if (!parsed.organizations && !parsed.products && !parsed.users && !parsed.customers) {
        toast.error('Data does not appear to contain valid ERP records.');
        return false;
      }

      useDataStore.setState(parsed);
      toast.success('Data snapshot imported successfully! Local state updated.');
      return true;
    } catch {
      toast.error('Invalid JSON format. Please ensure you copied the complete text.');
      return false;
    }
  };

  const handleImportJSONFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      applyImportedData(content);
      // Reset input value so re-selecting same file triggers onChange
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleApplyPastedData = () => {
    if (!pasteInput.trim()) {
      toast.error('Please paste your JSON data into the text box');
      return;
    }
    const ok = applyImportedData(pasteInput);
    if (ok) {
      setShowPasteModal(false);
      setPasteInput('');
    }
  };

  const handleDownloadBackup = () => {
    const backupSQL = `-- NICE Enterprises ERP Full SQL Backup Dump
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

  const handleClearBusinessData = async () => {
    if (resetInput !== 'RESET NICE') {
      return toast.error('Type RESET NICE to confirm');
    }
    resetBusinessData();
    toast.success('System reset successfully! All products, contacts, transactions, and balances have been cleared.');
    setResetConfirmOpen(false);
    setResetInput('');
    // Synchronize cleared state to cloud
    try {
      await pushStateToSupabase();
    } catch {
      // cloud sync will retry in background
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden file input for JSON import - accepts any file extension */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportJSONFile}
        className="hidden"
      />

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-amber-500/20">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-amber-500">SYSTEM GOVERNANCE & UTILITIES</p>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-heading flex items-center gap-2.5 mt-0.5">
            <Wrench className="h-6 w-6 text-amber-500" />
            System Maintenance & Cloud Sync
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
          <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-heading">Supabase</p>
          <p className="mt-1 text-xs font-semibold text-emerald-500 dark:text-emerald-400">Cloud Connected</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">SYNC STATUS</p>
            <div className="rounded-xl bg-amber-500/15 p-2 text-amber-500">
              <Cloud className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-amber-500 dark:text-amber-400 font-heading">BIDIRECTIONAL</p>
          <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">Localhost & Production</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">RESET SCOPE</p>
            <div className="rounded-xl bg-rose-500/15 p-2 text-rose-500">
              <RefreshCw className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-rose-500 dark:text-rose-400 font-heading">FULL SYSTEM</p>
          <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">Complete Clean Slate</p>
        </div>
      </div>

      {/* CLOUD DATABASE SYNC SECTION */}
      <div className="card p-6 border-2 border-amber-500/30 bg-amber-50/20 dark:bg-amber-950/10 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20">
              <Cloud className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-500">CLOUD DATABASE SYNC</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                  Supabase Connected
                </span>
                {isRlsBlocked && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-500/20 text-rose-500 border border-rose-500/30 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Action Required (RLS)
                  </span>
                )}
              </div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 font-heading mt-1">
                Synchronize Localhost & Live Domain Data
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-xl leading-relaxed">
                Push your active store data to the centralized Supabase Cloud Database, or pull the latest cloud tables into your current environment.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setShowSqlModal(true)}
              className="btn border border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 px-3.5 py-2.5 text-xs font-bold flex items-center gap-1.5"
            >
              <FileCode className="h-4 w-4 text-amber-500" />
              Fix Cloud Permissions (SQL)
            </button>
            <button
              onClick={handlePushToCloud}
              disabled={syncing}
              className="btn-primary px-4 py-2.5 text-xs font-bold flex items-center gap-2 shadow-lg shadow-amber-500/20"
            >
              <UploadCloud className="h-4 w-4" />
              {syncing ? 'Pushing...' : 'Push to Cloud (Supabase)'}
            </button>
            <button
              onClick={handlePullFromCloud}
              disabled={syncing}
              className="btn border border-amber-500/40 bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 px-4 py-2.5 text-xs font-bold flex items-center gap-2"
            >
              <DownloadCloud className="h-4 w-4" />
              {syncing ? 'Pulling...' : 'Pull from Cloud'}
            </button>
          </div>
        </div>

        {syncMessage && (
          <div className={`rounded-xl border p-3.5 text-xs font-semibold flex items-center justify-between gap-3 ${
            isRlsBlocked
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200'
          }`}>
            <div className="flex items-center gap-2">
              {isRlsBlocked ? <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" /> : <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-500" />}
              <span>{syncMessage}</span>
            </div>
            {isRlsBlocked && (
              <button
                onClick={() => setShowSqlModal(true)}
                className="btn-primary px-3 py-1.5 text-[11px] shrink-0 font-bold"
              >
                Open SQL Fix
              </button>
            )}
          </div>
        )}
      </div>

      {/* SUPABASE SQL FIX MODAL */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl card p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-amber-500">SUPABASE PERMISSIONS CONFIGURATION</p>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 font-heading flex items-center gap-2 mt-0.5">
                  <FileCode className="h-5 w-5 text-amber-500" /> Enable Bidirectional Cloud Sync Permissions
                </h3>
              </div>
              <button
                onClick={() => setShowSqlModal(false)}
                className="text-slate-400 hover:text-slate-200 font-bold text-lg p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
              <p>
                Supabase Postgres tables enforce <strong>Row-Level Security (RLS)</strong> by default. To allow your Localhost and Live URL environments to push & pull records freely, run the SQL script below once in your Supabase project:
              </p>
              <div className="grid sm:grid-cols-3 gap-2 py-1">
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5 text-center">
                  <span className="text-[10px] font-extrabold text-amber-500 uppercase block">Step 1</span>
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">Copy SQL Script</span>
                </div>
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5 text-center">
                  <span className="text-[10px] font-extrabold text-amber-500 uppercase block">Step 2</span>
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">Paste in Supabase SQL Editor</span>
                </div>
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5 text-center">
                  <span className="text-[10px] font-extrabold text-amber-500 uppercase block">Step 3</span>
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">Click 'Run' & Return Here</span>
                </div>
              </div>
            </div>

            <div className="relative flex-1 min-h-[180px] overflow-hidden rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-900">
              <pre className="h-full max-h-[260px] overflow-y-auto p-4 text-[11px] font-mono text-emerald-400 leading-relaxed">
                {SUPABASE_FIX_SQL}
              </pre>
              <button
                onClick={handleCopySql}
                className="absolute top-3 right-3 btn-primary px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 shadow-lg"
              >
                {copiedSql ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedSql ? 'Copied to Clipboard!' : 'Copy SQL'}
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <a
                href="https://supabase.com/dashboard/project/ilvxznxmhqxjtbieezoa/sql"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Open Supabase SQL Editor
              </a>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSqlModal(false)}
                  className="btn-secondary py-2 px-4 text-xs"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setShowSqlModal(false);
                    await handlePushToCloud();
                  }}
                  className="btn-primary py-2 px-4 text-xs font-bold flex items-center gap-1.5"
                >
                  <UploadCloud className="h-3.5 w-3.5" /> Retry Push Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DIRECT PASTE DATA MODAL */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl card p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-amber-500">DIRECT DATA SYNC</p>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 font-heading flex items-center gap-2 mt-0.5">
                  <ClipboardPaste className="h-5 w-5 text-amber-500" /> Paste System Snapshot
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowPasteModal(false);
                  setPasteInput('');
                }}
                className="text-slate-400 hover:text-slate-200 font-bold text-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Paste the exported JSON data or your browser's <code className="font-mono text-amber-500">amkas-erp-data-store</code> text below to load it immediately into Localhost:
            </p>

            <textarea
              rows={8}
              value={pasteInput}
              onChange={(e) => setPasteInput(e.target.value)}
              placeholder="Paste JSON text here (e.g. { 'products': [...], 'users': [...] })"
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs font-mono text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 outline-none focus:border-amber-500"
            />

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowPasteModal(false);
                  setPasteInput('');
                }}
                className="btn-secondary py-2 px-4 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyPastedData}
                className="btn-primary py-2 px-5 text-xs"
              >
                Apply Snapshot Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Turn Off Password Modal */}
      {showTurnOffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md card p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-amber-500">ADMIN VERIFICATION</p>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 font-heading flex items-center gap-2 mt-0.5">
                  <KeyRound className="h-5 w-5 text-amber-500" /> Turn Off Maintenance Mode
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowTurnOffModal(false);
                  setTurnOffError(null);
                  setTurnOffPassword('');
                }}
                className="text-slate-400 hover:text-slate-200 font-bold text-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Enter the maintenance deactivation password to restore normal system access for all users.
            </p>

            <form onSubmit={handleDisableModeSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Deactivation Password
                </label>
                <input
                  type="password"
                  value={turnOffPassword}
                  onChange={(e) => setTurnOffPassword(e.target.value)}
                  placeholder="Enter password"
                  className="input font-mono text-xs"
                  autoFocus
                />
              </div>

              {turnOffError && (
                <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs font-semibold text-rose-500 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{turnOffError}</span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowTurnOffModal(false);
                    setTurnOffError(null);
                    setTurnOffPassword('');
                  }}
                  className="btn-secondary flex-1 py-2.5 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1 py-2.5 text-xs"
                >
                  Turn Off Mode
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Operations Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Instant JSON Snapshot Migration */}
        <div className="card p-6 space-y-5">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-500">DATA MIGRATION</p>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 font-heading mt-0.5">
              Snapshot Backup & Restore
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
              Export your live domain's exact dataset to a file or copy-paste text, and load it directly into Localhost.
            </p>
          </div>

          <div className="flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-amber-500/40 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 backdrop-blur-md space-y-3">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={handleExportJSON}
                className="btn-primary px-3.5 py-2 text-xs flex items-center gap-1.5"
              >
                <Download className="h-4 w-4" /> Export Backup
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn border border-amber-500/40 bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 px-3.5 py-2 text-xs font-bold flex items-center gap-1.5"
              >
                <Upload className="h-4 w-4" /> Import File
              </button>
              <button
                onClick={() => setShowPasteModal(true)}
                className="btn border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 px-3.5 py-2 text-xs font-bold flex items-center gap-1.5"
              >
                <ClipboardPaste className="h-4 w-4 text-amber-500" /> Paste Text
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              1-click snapshot import immediately synchronizes all users, invoices, articles, and settings.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Need raw SQL instead?</span>
            <button
              onClick={handleDownloadBackup}
              className="text-xs font-bold text-amber-600 hover:underline flex items-center gap-1"
            >
              <Download className="h-3.5 w-3.5" /> Download SQL Dump
            </button>
          </div>
        </div>

        {/* Full System Clean Slate Reset */}
        <div className="card p-6 space-y-5">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-rose-500">SYSTEM DATA RESET</p>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 font-heading mt-0.5">
              Full System Clean Slate Reset
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
              Clear all products, contacts, balances, numerical entries, and transactions for a pristine fresh system.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-100 dark:bg-slate-800/80 p-5 border border-slate-200 dark:border-amber-500/20 text-xs space-y-3.5 backdrop-blur-md">
            <div className="flex items-start gap-2.5 text-slate-800 dark:text-slate-200 leading-relaxed font-semibold">
              <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
              <p>
                Clears all products, categories, product articles, universal articles, customers, vendors, sales invoices, quotations, sales orders, credit notes, sales returns, customer receipts, commissions, purchase requests, purchase orders, purchase invoices, vendor bills, debit notes, purchase returns, vendor payments, approval queue items, bank statements, bank account balances, journal entries, chart of accounts balances, expense & income records, batches, serials, and stock adjustments.
              </p>
            </div>
            <div className="rounded-xl bg-amber-500/15 p-3 text-xs text-amber-700 dark:text-amber-300 border border-amber-500/30">
              <strong className="font-extrabold text-amber-800 dark:text-amber-200">Preserved Configuration:</strong> Super Admin access, core Account Types, baseline Warehouse & Chart of Accounts structure (with zeroed balances), and Organization settings.
            </div>
          </div>

          {!resetConfirmOpen ? (
            <button
              onClick={() => setResetConfirmOpen(true)}
              className="btn btn-danger w-full justify-center py-3 text-xs font-bold"
            >
              <Trash2 className="h-4 w-4" /> Reset All System Data & Balances
            </button>
          ) : (
            <div className="space-y-4 border-t border-slate-200 dark:border-amber-500/20 pt-4">
              <div className="rounded-xl bg-rose-500/10 p-3 border border-rose-500/30">
                <p className="text-xs font-bold text-rose-600 dark:text-rose-400">
                  Type <span className="font-mono font-extrabold underline">RESET NICE</span> below to confirm data wipe:
                </p>
              </div>
              <input
                type="text"
                value={resetInput}
                onChange={(e) => setResetInput(e.target.value)}
                placeholder="RESET NICE"
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
                  className="btn btn-danger flex-1 py-2.5 text-xs font-bold"
                >
                  Confirm Full Data Reset
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
