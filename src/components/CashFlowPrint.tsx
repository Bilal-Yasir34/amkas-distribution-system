import { Printer, X } from 'lucide-react';
import { useDataStore } from '@/lib/dataStore';

export function CashFlowPrint({ onClose }: { onClose: () => void }) {
  const { orgSettings, bankAccounts } = useDataStore();

  const handlePrint = () => {
    window.print();
  };

  const totalLiquidity = bankAccounts.reduce((acc, b) => acc + (b.current_balance || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="my-8 w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#1e293b] space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-700 no-print">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Statement of Cash Flows</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <Printer className="h-4 w-4" /> Print / Save PDF
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="printable-content space-y-4 text-xs text-slate-800 dark:text-slate-200">
          <div className="text-center border-b pb-4 dark:border-slate-700">
            <h2 className="text-lg font-bold uppercase tracking-wider">{orgSettings.name || 'AMKAS INTERNATIONAL'}</h2>
            <p className="text-sm font-semibold">CASH FLOW STATEMENT</p>
            <p className="text-slate-400 text-[11px]">For the Period Ended July 21, 2026</p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between border-b pb-1 font-bold text-slate-400 text-[10px] uppercase">
              <span>CASH FLOW FROM OPERATING ACTIVITIES</span>
              <span>AMOUNT (PKR)</span>
            </div>
            <div className="flex justify-between pl-4">
              <span>Net Inflows from Customer Receipts</span>
              <span className="font-mono">Rs. 0.00</span>
            </div>
            <div className="flex justify-between pl-4">
              <span>Less: Cash Paid to Suppliers & Vendors</span>
              <span className="font-mono">Rs. 0.00</span>
            </div>
            <div className="flex justify-between font-semibold border-t pt-1">
              <span>Net Cash Provided by Operating Activities</span>
              <span className="font-mono text-emerald-500">Rs. 0.00</span>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex justify-between border-b pb-1 font-bold text-slate-400 text-[10px] uppercase">
              <span>SUMMARY OF LIQUIDITY ACCOUNTS</span>
              <span>BALANCE (PKR)</span>
            </div>
            {bankAccounts.map((ba) => (
              <div key={ba.id} className="flex justify-between pl-4">
                <span>{ba.account_name} ({ba.bank_name})</span>
                <span className="font-mono">Rs. {(ba.current_balance || 0).toLocaleString()}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold border-t pt-2 text-sm text-emerald-500">
              <span>TOTAL CLOSING CASH & EQUIVALENTS</span>
              <span className="font-mono">Rs. {totalLiquidity.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
