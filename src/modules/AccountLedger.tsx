import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { useAccountLedger, useChartOfAccounts } from '@/lib/queries';
import { downloadCSV, formatCurrency, formatDate } from '@/lib/utils';

export function AccountLedger() {
  const { data: coa = [] } = useChartOfAccounts();
  const [accountId, setAccountId] = useState('');
  const [search, setSearch] = useState('');
  const { data: ledger = [] } = useAccountLedger(accountId || undefined);

  const accountName = (id: string | null) => coa.find((a) => a.id === id)?.name ?? '—';
  const accountCode = (id: string | null) => coa.find((a) => a.id === id)?.code ?? '';

  const rows = useMemo(() => {
    return ledger.filter((l) => {
      if (search) {
        const q = search.toLowerCase();
        return (l.voucher_no ?? '').toLowerCase().includes(q) || (l.description ?? '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [ledger, search]);

  let running = 0;
  const withBalance = rows.map((l) => {
    running += Number(l.debit || 0) - Number(l.credit || 0);
    return { ...l, balance: running };
  });

  const totalDebit = rows.reduce((s, l) => s + Number(l.debit || 0), 0);
  const totalCredit = rows.reduce((s, l) => s + Number(l.credit || 0), 0);

  function exportCSV() {
    downloadCSV('account_ledger.csv', withBalance.map((l) => ({
      Date: formatDate(l.transaction_date), Voucher: l.voucher_no ?? '', Type: l.voucher_type ?? '',
      Account: accountCode(l.account_id), Description: l.description ?? '',
      Debit: l.debit, Credit: l.credit, Balance: l.balance,
    })));
  }

  return (
    <div>
      <PageHeader title="Account Ledger" subtitle="Unified double-entry ledger with running balances"
        searchValue={search} onSearch={setSearch}
        actions={<><select className="input !w-auto" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          <option value="">All Accounts</option>
          {coa.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
        </select><button onClick={exportCSV} className="btn-outline"><Download className="h-4 w-4" /> Export</button></>} />

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-700/40 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th><th className="px-4 py-3 font-medium">Voucher</th>
                <th className="px-4 py-3 font-medium">Type</th><th className="px-4 py-3 font-medium">Account</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 text-right font-medium">Debit</th><th className="px-4 py-3 text-right font-medium">Credit</th>
                <th className="px-4 py-3 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {withBalance.map((l) => (
                <tr key={l.id} className="table-row">
                  <td className="px-4 py-2.5 text-slate-500">{formatDate(l.transaction_date)}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-200">{l.voucher_no ?? '—'}</td>
                  <td className="px-4 py-2.5"><span className="badge bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">{l.voucher_type ?? '—'}</span></td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{accountCode(l.account_id)} — {accountName(l.account_id)}</td>
                  <td className="px-4 py-2.5 text-slate-500">{l.description ?? '—'}</td>
                  <td className="px-4 py-2.5 text-right text-amber-500 dark:text-amber-400">{l.debit ? formatCurrency(l.debit) : '—'}</td>
                  <td className="px-4 py-2.5 text-right text-rose-600 dark:text-rose-400">{l.credit ? formatCurrency(l.credit) : '—'}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-slate-700 dark:text-slate-200">{formatCurrency(l.balance)}</td>
                </tr>
              ))}
              {withBalance.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">No ledger entries.</td></tr>}
            </tbody>
            {withBalance.length > 0 && (
              <tfoot className="bg-slate-50 font-semibold dark:bg-slate-700/40">
                <tr>
                  <td className="px-4 py-2.5" colSpan={5}>Totals</td>
                  <td className="px-4 py-2.5 text-right text-emerald-700 dark:text-amber-400">{formatCurrency(totalDebit)}</td>
                  <td className="px-4 py-2.5 text-right text-rose-700 dark:text-rose-400">{formatCurrency(totalCredit)}</td>
                  <td className="px-4 py-2.5 text-right text-slate-700 dark:text-slate-200">{formatCurrency(totalDebit - totalCredit)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
