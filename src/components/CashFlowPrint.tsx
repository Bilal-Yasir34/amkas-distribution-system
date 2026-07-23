import { useDataStore } from '@/lib/dataStore';
import { PrintDocument } from './PrintDocument';
import { formatCurrency } from '@/lib/utils';

export function CashFlowPrint({ onClose }: { onClose: () => void }) {
  const { bankAccounts } = useDataStore();

  const totalLiquidity = bankAccounts.reduce((acc, b) => acc + (b.current_balance || 0), 0);

  return (
    <PrintDocument
      isOpen
      onClose={onClose}
      title="STATEMENT OF CASH FLOWS"
      subtitle="For the Financial Period Ended 2026"
    >
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex justify-between border-b-2 border-slate-900 pb-1.5 font-extrabold text-slate-900 text-xs uppercase tracking-wider">
            <span>1. CASH FLOW FROM OPERATING ACTIVITIES</span>
            <span>AMOUNT (PKR)</span>
          </div>
          <div className="flex justify-between pl-4 text-xs">
            <span>Net Inflows from Customer Receipts</span>
            <span className="font-mono font-bold">Rs. 0.00</span>
          </div>
          <div className="flex justify-between pl-4 text-xs">
            <span>Less: Cash Paid to Suppliers & Vendors</span>
            <span className="font-mono font-bold">Rs. 0.00</span>
          </div>
          <div className="flex justify-between font-extrabold border-t border-slate-300 pt-2 text-xs text-slate-900">
            <span>Net Cash Provided by Operating Activities</span>
            <span className="font-mono">Rs. 0.00</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between border-b-2 border-slate-900 pb-1.5 font-extrabold text-slate-900 text-xs uppercase tracking-wider">
            <span>2. SUMMARY OF LIQUIDITY & BANK ACCOUNTS</span>
            <span>BALANCE (PKR)</span>
          </div>
          {bankAccounts.length > 0 ? (
            bankAccounts.map((account) => (
              <div key={account.id} className="flex justify-between pl-4 text-xs">
                <span>{account.bank_name} — {account.account_name} ({account.account_number})</span>
                <span className="font-mono font-bold">{formatCurrency(account.current_balance || 0)}</span>
              </div>
            ))
          ) : (
            <div className="pl-4 text-xs text-slate-500 italic">No registered bank accounts</div>
          )}
          <div className="flex justify-between font-extrabold border-t-2 border-slate-900 pt-2.5 text-sm text-slate-900">
            <span>TOTAL CLOSING LIQUIDITY POSITION</span>
            <span className="font-mono">{formatCurrency(totalLiquidity)}</span>
          </div>
        </div>
      </div>
    </PrintDocument>
  );
}
