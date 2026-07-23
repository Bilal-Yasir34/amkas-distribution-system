import { useState } from 'react';
import { Building2, Lock, Mail, Loader2, Eye, EyeOff, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: errMsg } = await signIn(email.trim(), password);
    setLoading(false);
    if (errMsg) setError(errMsg);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#0d0c11] px-4 font-sans overflow-hidden">
      {/* Dynamic Ambient Background Elements (Warm Gold & Amber Glow) */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-[30rem] w-[30rem] rounded-full bg-gradient-to-br from-amber-500/20 via-amber-600/10 to-transparent blur-[120px]" />
        <div className="absolute -bottom-32 -left-32 h-[30rem] w-[30rem] rounded-full bg-gradient-to-tr from-purple-600/15 via-rose-500/10 to-transparent blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[40rem] w-[40rem] rounded-full bg-amber-500/5 blur-[160px]" />
      </div>

      <div className="relative w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 shadow-xl shadow-amber-500/20 ring-1 ring-white/20">
            <Building2 className="h-8 w-8 text-slate-950" />
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
              <Sparkles className="h-3 w-3" /> Enterprise ERP Suite
            </span>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white font-heading">
              AMKAS International
            </h1>
            <p className="mt-1 text-xs font-semibold text-slate-400">Distribution & Financial Management</p>
          </div>
        </div>

        {/* Glassmorphic Login Card */}
        <div className="rounded-3xl border border-slate-800/80 bg-[#15131d]/80 p-8 shadow-2xl backdrop-blur-2xl ring-1 ring-white/5 space-y-6">
          <div className="border-b border-slate-800/60 pb-4">
            <h2 className="text-base font-bold text-white font-heading">System Portal Access</h2>
            <p className="mt-1 text-xs text-slate-400">Sign in with your admin or role-assigned credentials</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
                Email Address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@amkas.pk"
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-900/60 py-3 pl-10 pr-3 text-xs font-medium text-white placeholder-slate-500 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-900/60 py-3 pl-10 pr-10 text-xs font-medium text-white placeholder-slate-500 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-300"
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-medium text-rose-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 text-xs font-extrabold justify-center"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? 'Authenticating…' : 'Sign In to Dashboard'}
            </button>
          </form>
        </div>

        <div className="text-center text-[11px] text-slate-500">
          AMKAS International Distribution System • Secure SSL Encrypted
        </div>
      </div>
    </div>
  );
}
