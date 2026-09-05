import { useState } from 'react';
import { Calendar, Plus, CheckCircle, Clock, X, Trash2 } from 'lucide-react';
import { useDataStore } from '@/lib/dataStore';
import { useToast } from '@/lib/toast';
import { formatDate } from '@/lib/utils';
import { DateInput } from '@/components/DateInput';
import type { FinancialYear } from '@/lib/types';

export function FinancialYears() {
  const toast = useToast();
  const { financialYears, addFinancialYear, updateFinancialYear, deleteFinancialYear } = useDataStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('2026-07-01');
  const [endDate, setEndDate] = useState('2027-06-30');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Financial Year name is required');

    addFinancialYear({
      name,
      start_date: startDate,
      end_date: endDate,
      status: 'Open',
      is_current: financialYears.length === 0,
    });

    toast.success('Financial year created');
    setModalOpen(false);
    setName('');
  };

  const handleSetCurrent = (id: string, yrName: string) => {
    financialYears.forEach((fy) => {
      updateFinancialYear(fy.id, { is_current: fy.id === id });
    });
    toast.success(`${yrName} set as Current Financial Year`);
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-500">NICE ENTERPRISES</p>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Financial Years & Periods</h1>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 space-y-6">
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">FISCAL GOVERNANCE</p>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Company accounting periods</h2>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 btn-primary shadow-sm"
          >
            <Plus className="h-4 w-4" /> New Financial Year
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {financialYears.map((fy) => (
            <div
              key={fy.id}
              className={`relative rounded-xl border p-5 transition ${
                fy.is_current
                  ? 'border-amber-500 bg-amber-500/5 dark:bg-amber-500/10'
                  : 'border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/40'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      fy.is_current
                        ? 'bg-amber-500 text-slate-950 font-extrabold'
                        : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {fy.is_current ? 'ACTIVE CURRENT' : fy.status}
                  </span>
                  <h3 className="mt-1.5 font-bold text-slate-800 dark:text-slate-100">{fy.name}</h3>
                </div>
                {!fy.is_current && (
                  <button
                    onClick={() => handleSetCurrent(fy.id, fy.name)}
                    className="text-xs font-semibold text-amber-500 hover:underline"
                  >
                    Set Active
                  </button>
                )}
              </div>

              <div className="text-xs text-slate-400 mt-2 font-mono">
                <span>{formatDate(fy.start_date)}</span> — <span>{formatDate(fy.end_date)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FORM MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">FISCAL PERIODS</p>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Create Financial Year</h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Title</label>
                <input
                  type="text"
                  placeholder="e.g. 2027-28"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input text-xs mt-1"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <DateInput
                  label="Start date"
                  value={startDate}
                  onChange={(val) => setStartDate(val)}
                />
                <DateInput
                  label="End date"
                  value={endDate}
                  onChange={(val) => setEndDate(val)}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button onClick={handleCreate} className="btn-primary text-xs px-5">
                Save Financial Year
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
