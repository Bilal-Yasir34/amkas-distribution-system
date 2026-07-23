import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { Modal } from './Modal';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  itemName?: string;
  itemType?: string;
  description?: string;
  confirmText?: string;
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Deletion',
  itemName,
  itemType = 'record',
  description = 'This action cannot be undone. All associated ledger entries and history for this item will be affected.',
  confirmText = 'Permanently Delete',
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="sm"
    >
      <div className="text-center space-y-5 p-2">
        {/* Animated Glowing Danger Icon Badge */}
        <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 rounded-3xl bg-rose-500/20 dark:bg-rose-500/30 blur-xl animate-pulse" />
          <div className="relative grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-xl shadow-rose-500/30 ring-2 ring-rose-400/30">
            <Trash2 className="h-8 w-8 animate-bounce" />
          </div>
        </div>

        {/* Modal Text Header */}
        <div className="space-y-1.5">
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 font-heading">
            {title}
          </h3>
          {itemName ? (
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Are you sure you want to delete <span className="font-extrabold text-rose-600 dark:text-rose-400 font-mono">"{itemName}"</span>?
            </p>
          ) : (
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Are you sure you want to delete this {itemType}?
            </p>
          )}
        </div>

        {/* Warning Alert Container */}
        <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-3.5 text-left text-xs text-rose-700 dark:text-rose-300 space-y-1 backdrop-blur-md">
          <div className="flex items-center gap-1.5 font-bold text-rose-800 dark:text-rose-200">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Warning</span>
          </div>
          <p className="text-[11px] leading-relaxed text-rose-600/90 dark:text-rose-300/90">
            {description}
          </p>
        </div>

        {/* Modal Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary flex-1 py-2.5 text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="btn btn-danger flex-1 py-2.5 text-xs font-bold justify-center"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
