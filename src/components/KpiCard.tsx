import { type ReactNode } from 'react';

interface KpiCardProps {
  label: string;
  value: string;
  delta?: string;
  icon: ReactNode;
  tone?: 'emerald' | 'cyan' | 'amber' | 'rose' | 'slate';
}

const toneMap: Record<NonNullable<KpiCardProps['tone']>, string> = {
  emerald: 'text-amber-500 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/15',
  cyan: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/10',
  amber: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10',
  rose: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10',
  slate: 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/40',
};

export function KpiCard({ label, value, delta, icon, tone = 'emerald' }: KpiCardProps) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-1.5 text-xl font-semibold text-slate-800 dark:text-white">{value}</p>
          {delta && <p className="mt-1 text-xs text-slate-400">{delta}</p>}
        </div>
        <div className={`grid h-10 w-10 place-items-center rounded-lg ${toneMap[tone]}`}>{icon}</div>
      </div>
    </div>
  );
}
