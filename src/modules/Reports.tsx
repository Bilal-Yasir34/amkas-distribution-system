import { useMemo, useState } from 'react';
import { Download, Printer, BarChart3, TrendingUp, Scale } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { useAccountLedger, useChartOfAccounts } from '@/lib/queries';
import { downloadCSV, formatCurrency } from '@/lib/utils';
import type { AccountType } from '@/lib/types';

type ReportTab = 'trial_balance' | 'pnl' | 'balance_sheet';

const TABS: { key: ReportTab; label: string; icon: typeof Scale }[] = [
  { key: 'trial_balance', label: 'Trial Balance', icon: Scale },
  { key: 'pnl', label: 'Profit & Loss', icon: TrendingUp },
  { key: 'balance_sheet', label: 'Balance Sheet', icon: BarChart3 },
];

export function Reports() {
  const { data: coa = [] } = useChartOfAccounts();
  const { data: ledger = [] } = useAccountLedger();
  const [tab, setTab] = useState<ReportTab>('trial_balance');

  const balances = useMemo(() => {
    const map: Record<string, { debit: number; credit: number }> = {};
    coa.forEach((a) => (map[a.id] = { debit: 0, credit: 0 }));
    ledger.forEach((l) => {
      if (!map[l.account_id]) map[l.account_id] = { debit: 0, credit: 0 };
      map[l.account_id].debit += Number(l.debit || 0);
      map[l.account_id].credit += Number(l.credit || 0);
    });
    return map;
  }, [coa, ledger]);

  const trialRows = coa.map((a) => {
    const b = balances[a.id] ?? { debit: 0, credit: 0 };
    const net = b.debit - b.credit;
    return { ...a, debit: net > 0 ? net : 0, credit: net < 0 ? -net : 0 };
  }).filter((r) => r.debit !== 0 || r.credit !== 0);

  const totalDebit = trialRows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = trialRows.reduce((s, r) => s + r.credit, 0);

  const pnlRows = trialRows.filter((r) => r.account_type === 'Income' || r.account_type === 'Expense');
  const income = pnlRows.filter((r) => r.account_type === 'Income').reduce((s, r) => s + r.credit, 0);
  const expense = pnlRows.filter((r) => r.account_type === 'Expense').reduce((s, r) => s + r.debit, 0);

  const bsRows = trialRows.filter((r) => r.account_type === 'Asset' || r.account_type === 'Liability' || r.account_type === 'Equity');
  const assets = bsRows.filter((r) => r.account_type === 'Asset').reduce((s, r) => s + r.debit, 0);
  const liabilities = bsRows.filter((r) => r.account_type === 'Liability').reduce((s, r) => s + r.credit, 0);
  const equity = bsRows.filter((r) => r.account_type === 'Equity').reduce((s, r) => s + r.credit, 0);

  function exportCSV() {
    if (tab === 'trial_balance') downloadCSV('trial_balance.csv', trialRows.map((r) => ({ Code: r.code, Name: r.name, Type: r.account_type, Debit: r.debit, Credit: r.credit })));
    else if (tab === 'pnl') downloadCSV('profit_loss.csv', pnlRows.map((r) => ({ Code: r.code, Name: r.name, Type: r.account_type, Amount: r.debit - r.credit })));
    else downloadCSV('balance_sheet.csv', bsRows.map((r) => ({ Code: r.code, Name: r.name, Type: r.account_type, Debit: r.debit, Credit: r.credit })));
  }

  return (
    <div>
      <PageHeader title="Reports & Analytics" subtitle="Financial statements and operational reports"
        actions={<><button onClick={exportCSV} className="btn-outline"><Download className="h-4 w-4" /> Export</button><button onClick={() => window.print()} className="btn-primary"><Printer className="h-4 w-4" /> Print</button></>} />

      <div className="mb-4 flex gap-1 rounded-lg border border-slate-200 p-1 dark:border-slate-700">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition ${tab === t.key ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      <div className="print-area card p-6">
        <div className="mb-4 text-center">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">AMKAS International</h2>
          <p className="text-sm text-slate-500">{TABS.find((t) => t.key === tab)?.label} as of {new Date().toLocaleDateString('en-GB')}</p>
        </div>

        {tab === 'trial_balance' && (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-200 dark:border-slate-700"><th className="px-3 py-2 text-left">Code</th><th className="px-3 py-2 text-left">Account</th><th className="px-3 py-2 text-left">Type</th><th className="px-3 py-2 text-right">Debit</th><th className="px-3 py-2 text-right">Credit</th></tr></thead>
            <tbody>
              {trialRows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 dark:border-slate-700/60">
                  <td className="px-3 py-2 font-mono text-xs">{r.code}</td><td className="px-3 py-2">{r.name}</td><td className="px-3 py-2 text-slate-500">{r.account_type}</td>
                  <td className="px-3 py-2 text-right">{r.debit ? formatCurrency(r.debit) : '—'}</td><td className="px-3 py-2 text-right">{r.credit ? formatCurrency(r.credit) : '—'}</td>
                </tr>
              ))}
              {trialRows.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-400">No data — post invoices to populate the ledger.</td></tr>}
            </tbody>
            {trialRows.length > 0 && (
              <tfoot className="border-t-2 border-slate-300 font-semibold dark:border-slate-600">
                <tr><td className="px-3 py-2" colSpan={3}>Totals</td><td className="px-3 py-2 text-right">{formatCurrency(totalDebit)}</td><td className="px-3 py-2 text-right">{formatCurrency(totalCredit)}</td></tr>
              </tfoot>
            )}
          </table>
        )}

        {tab === 'pnl' && (
          <div className="space-y-4">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Income</h3>
              {pnlRows.filter((r) => r.account_type === 'Income').map((r) => (
                <div key={r.id} className="flex justify-between border-b border-slate-100 py-1.5 text-sm dark:border-slate-700/60"><span>{r.code} — {r.name}</span><span>{formatCurrency(r.credit)}</span></div>
              ))}
              <div className="mt-2 flex justify-between font-semibold"><span>Total Income</span><span>{formatCurrency(income)}</span></div>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Expenses</h3>
              {pnlRows.filter((r) => r.account_type === 'Expense').map((r) => (
                <div key={r.id} className="flex justify-between border-b border-slate-100 py-1.5 text-sm dark:border-slate-700/60"><span>{r.code} — {r.name}</span><span>{formatCurrency(r.debit)}</span></div>
              ))}
              <div className="mt-2 flex justify-between font-semibold"><span>Total Expenses</span><span>{formatCurrency(expense)}</span></div>
            </div>
            <div className="flex justify-between border-t-2 border-slate-300 pt-2 text-base font-bold dark:border-slate-600">
              <span>Net {income - expense >= 0 ? 'Profit' : 'Loss'}</span><span>{formatCurrency(income - expense)}</span>
            </div>
          </div>
        )}

        {tab === 'balance_sheet' && (
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Assets</h3>
              {bsRows.filter((r) => r.account_type === 'Asset').map((r) => (
                <div key={r.id} className="flex justify-between border-b border-slate-100 py-1.5 text-sm dark:border-slate-700/60"><span>{r.code} — {r.name}</span><span>{formatCurrency(r.debit)}</span></div>
              ))}
              <div className="mt-2 flex justify-between font-semibold"><span>Total Assets</span><span>{formatCurrency(assets)}</span></div>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Liabilities & Equity</h3>
              {bsRows.filter((r) => r.account_type === 'Liability' || r.account_type === 'Equity').map((r) => (
                <div key={r.id} className="flex justify-between border-b border-slate-100 py-1.5 text-sm dark:border-slate-700/60"><span>{r.code} — {r.name}</span><span>{formatCurrency(r.credit)}</span></div>
              ))}
              <div className="mt-2 flex justify-between font-semibold"><span>Total Liabilities + Equity</span><span>{formatCurrency(liabilities + equity)}</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
