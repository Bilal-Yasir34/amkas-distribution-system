import { useState } from 'react';
import { Plus, Calendar, CheckCircle, Lock, X } from 'lucide-react';
import { useDataStore } from '@/lib/dataStore';
import { useToast } from '@/lib/toast';

export function FinancialYears() {
  const toast = useToast();
  const { financialYears, addFinancialYear, updateFinancialYear } = useDataStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('2026-07-01');
  const [endDate, setEndDate] = useState('2027-06-30');

  const handleSave = () => {
    if (!name.trim()) return toast.error('Financial year title required');

    addFinancialYear({
      name,
      start_date: startDate,
      end_date: endDate,
      is_current: false,
      status: 'Open',
    });

    toast.success(`Financial Year ${name} created`);
    setModalOpen(false);
  };

  const handleSetCurrent = (id: string, fyName: string) => {
    financialYears.forEach((fy) => {
      updateFinancialYear(fy.id, { is_current: fy.id === id, status: fy.id === id ? 'Current' : 'Open' });
    });
    toast.success(`${fyName} set as active financial year`);
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-500">NICE ENTERPRISES</p>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Financial Years</h1>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PERIOD GOVERNANCE</p>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Financial calendar</h2>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 btn-primary"
          >
            <Plus className="h-4 w-4" /> Create financial year
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {financialYears.map((fy) => (
            <div
              key={fy.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 space-y-3"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                      fy.is_current ? 'bg-amber-500/15 text-amber-500' : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {fy.status}
                  </span>
                  <h3 className="mt-1 font-bold text-slate-800 dark:text-slate-100">{fy.name}</h3>
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

              <div className="text-xs text-slate-400">
                <span>{fy.start_date}</span> — <span>{fy.end_date}</span>
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
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Start date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="input text-xs mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">End date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="input text-xs mt-1"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button onClick={handleSave} className="btn-primary text-xs px-5">
                Save Financial Year
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
