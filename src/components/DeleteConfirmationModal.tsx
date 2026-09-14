import React from 'react';
import { AlertTriangle, Trash2, X, ShieldAlert } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  recordType?: string; // e.g. "Sales Invoice" or "Purchase Invoice"
  recordNo?: string | null;
  partyName?: string | null;
  amount?: number | null;
  date?: string | null;
  isDeleting?: boolean;
}

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  recordType = 'Record',
  recordNo,
  partyName,
  amount,
  date,
  isDeleting = false,
}: DeleteConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-rose-500/30 bg-white shadow-2xl dark:border-rose-500/30 dark:bg-slate-900 animate-in zoom-in-95 duration-200"
      >
        {/* Top Header Banner */}
        <div className="relative border-b border-rose-100 bg-rose-50/70 px-6 py-4 dark:border-rose-950/40 dark:bg-rose-950/20">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-500/20 shadow-sm">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 font-mono">
                  DANGER: IRREVERSIBLE ACTION
                </span>
              </div>
              <h3
                id="delete-dialog-title"
                className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5"
              >
                {title || `Delete ${recordType}?`}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {/* Target Record Details Card */}
          {(recordNo || partyName) && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-800/60">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {recordType}
                  </span>
                  <p className="font-mono text-sm font-bold text-slate-800 dark:text-slate-100">
                    {recordNo || '—'}
                  </p>
                </div>
                {amount !== undefined && amount !== null && (
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Amount
                    </span>
                    <p className="font-mono text-sm font-bold text-amber-500">
                      {formatCurrency(Number(amount))}
                    </p>
                  </div>
                )}
              </div>

              {(partyName || date) && (
                <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                  <span className="truncate max-w-[220px]" title={partyName || ''}>
                    {partyName || '—'}
                  </span>
                  {date && (
                    <span className="text-slate-400 font-mono text-[11px]">
                      {formatDate(date)}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* System-Wide Warning Box */}
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs text-rose-700 dark:text-rose-300 space-y-2">
            <p className="font-bold flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              This record will be permanently deleted system-wide:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-rose-700/90 dark:text-rose-300/90">
              <li>
                Removed from <span className="font-semibold">{recordType} Register</span>
              </li>
              <li>
                Removed from the <span className="font-semibold">Approval Center</span> queue
              </li>
              <li>
                Removed from <span className="font-semibold">General Ledger & Accounting</span>
              </li>
            </ul>
            <p className="font-bold text-[11px] text-rose-800 dark:text-rose-200 pt-1 border-t border-rose-500/20">
              ⚠️ This action is unrecoverable and cannot be undone.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-rose-600/25 hover:bg-rose-700 active:scale-95 transition disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{isDeleting ? 'Deleting...' : 'Delete System-Wide'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
