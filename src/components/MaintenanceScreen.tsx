import { useState } from 'react';
import { Wrench, ShieldAlert, KeyRound, LogOut, Moon, Sun, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { useDataStore } from '@/lib/dataStore';
import { useTheme } from '@/lib/useTheme';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';

export function MaintenanceScreen() {
  const { theme, toggleTheme } = useTheme();
  const { companyLogo, orgSettings, disableMaintenanceMode } = useDataStore();
  const { profile, signOut } = useAuth();
  const toast = useToast();

  const [password, setPassword] = useState('');
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTurnOffMaintenance = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const res = disableMaintenanceMode(password);
    if (!res.success) {
      setError(res.error || 'Incorrect password');
      toast.error(res.error || 'Incorrect password');
      return;
    }

    toast.success('Maintenance mode disabled successfully!');
    setShowAdminModal(false);
    setPassword('');
  };

  const orgName = orgSettings.name || 'AMKAS INTERNATIONAL';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Background Decorative Glow Elements */}
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-40 h-96 w-96 rounded-full bg-amber-600/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 h-96 w-96 rounded-full bg-amber-400/5 blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          {companyLogo ? (
            <img src={companyLogo} alt={orgName} className="h-9 w-9 rounded-xl object-cover border border-amber-500/30" />
          ) : (
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-extrabold flex items-center justify-center text-lg shadow-md shadow-amber-500/20">
              A
            </div>
          )}
          <div>
            <h1 className="text-sm font-extrabold tracking-wide text-slate-100 font-heading">{orgName}</h1>
            <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-widest">ENTERPRISE PORTAL</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-slate-800 bg-slate-900/80 text-slate-400 hover:text-amber-400 hover:border-amber-500/30 transition-all"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-300" />}
          </button>
          {profile && (
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900/80 text-xs font-semibold text-slate-300 hover:text-rose-400 hover:border-rose-500/30 transition-all"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </button>
          )}
        </div>
      </header>

      {/* Main Content Body */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 text-center max-w-2xl mx-auto">
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-amber-500 to-amber-300 blur-xl opacity-30 animate-pulse" />
          <div className="relative h-24 w-24 rounded-3xl bg-slate-900 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-2xl shadow-amber-500/20">
            <Wrench className="h-12 w-12 animate-bounce" />
          </div>
          <span className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-slate-950 shadow-md">
            <ShieldAlert className="h-4 w-4" />
          </span>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-extrabold uppercase tracking-widest mb-4">
          <Sparkles className="h-3.5 w-3.5" /> Scheduled System Maintenance Active
        </div>

        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight font-heading leading-tight mb-3">
          We&apos;re Upgrading Your Experience
        </h2>

        <p className="text-sm text-slate-300 max-w-lg leading-relaxed mb-8">
          The <span className="font-semibold text-amber-400">{orgName}</span> ERP system is currently under routine maintenance and infrastructure optimization. System services will resume shortly.
        </p>

        {/* Informative Status Card */}
        <div className="w-full bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 mb-8 text-left space-y-3 backdrop-blur-sm shadow-xl">
          <div className="flex items-center justify-between text-xs font-bold border-b border-slate-800/80 pb-3">
            <span className="text-slate-400">STATUS CHECK</span>
            <span className="flex items-center gap-1.5 text-amber-400 font-mono">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" /> UNDER MAINTENANCE
            </span>
          </div>

          <div className="grid gap-2 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Database Integrity Check & Backup Complete</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Financial Ledger Reconciliation Running</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 animate-pulse" />
              <span>User Transactions Suspended Temporarily</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2"
          >
            Check Again / Refresh Page
          </button>

          <button
            onClick={() => setShowAdminModal(true)}
            className="w-full sm:w-auto px-6 py-3 rounded-xl border border-amber-500/30 bg-slate-900 text-amber-400 font-bold text-xs hover:bg-amber-500/10 hover:border-amber-500/50 transition-all flex items-center justify-center gap-2"
          >
            <KeyRound className="h-4 w-4" /> Turn Off Maintenance (Admin)
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-4 px-6 border-t border-slate-800/60 bg-slate-950/80 backdrop-blur-md text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} {orgName}. All rights reserved. AMKAS Distribution & Financial Portal.</p>
      </footer>

      {/* Admin Turn Off Password Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 text-left">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">ADMIN VERIFICATION</p>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 mt-0.5">
                  <KeyRound className="h-5 w-5 text-amber-400" /> Turn Off Maintenance
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowAdminModal(false);
                  setError(null);
                  setPassword('');
                }}
                className="text-slate-400 hover:text-slate-200 text-xl font-bold"
              >
                ×
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Enter the master deactivation password to restore normal system access for all users immediately.
            </p>

            <form onSubmit={handleTurnOffMaintenance} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Deactivation Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter AmkasMaintenanceOff!"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:border-amber-500 focus:outline-none font-mono"
                  autoFocus
                />
              </div>

              {error && (
                <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs font-semibold text-rose-400 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdminModal(false);
                    setError(null);
                    setPassword('');
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-extrabold hover:bg-amber-400 transition shadow-lg shadow-amber-500/20"
                >
                  Turn Off Maintenance Mode
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
