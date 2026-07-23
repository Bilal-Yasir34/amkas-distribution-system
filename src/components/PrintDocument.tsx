import React, { useEffect } from 'react';
import { Printer, X, FileText } from 'lucide-react';
import { useDataStore } from '@/lib/dataStore';
import { Modal } from './Modal';

interface PrintDocumentProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  documentNo?: string;
  date?: string;
  children: React.ReactNode;
}

export function PrintDocument({
  isOpen,
  onClose,
  title,
  subtitle,
  documentNo,
  date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
  children,
}: PrintDocumentProps) {
  const { orgSettings } = useDataStore();

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => document.body.classList.remove('overflow-hidden');
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Print Executive Document"
      subtitle={`${orgSettings.name || 'AMKAS INTERNATIONAL'} — ${title}`}
      size="xl"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">
            <X className="h-4 w-4" /> Close
          </button>
          <button onClick={handlePrint} className="btn-primary">
            <Printer className="h-4 w-4" /> Print / Save PDF
          </button>
        </>
      }
    >
      <div className="print-area print-document bg-white p-8 text-slate-900 font-sans">
        {/* Executive Letterhead */}
        <div className="flex items-start justify-between border-b-2 border-slate-900 pb-5">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 font-heading">
              {orgSettings.name || 'AMKAS INTERNATIONAL'}
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              {orgSettings.legal_name || 'Enterprise Distribution & Logistics Suite'}
            </p>
            <p className="text-xs text-slate-600">
              Plot 14, Industrial Estate, Karachi · NTN: NTN-4400000-1
            </p>
            <p className="text-xs text-slate-600">+92-21-111-222-333 · info@amkasintl.com</p>
          </div>

          <div className="text-right">
            <div className="inline-flex items-center gap-2 rounded-lg bg-amber-500/15 border border-amber-500/40 px-3.5 py-1.5 text-amber-700 font-extrabold text-xs uppercase tracking-wider mb-2">
              <FileText className="h-4 w-4" />
              <span>{title}</span>
            </div>
            {subtitle && <p className="text-xs font-semibold text-slate-600">{subtitle}</p>}
            {documentNo && (
              <p className="text-xs font-bold text-slate-900 mt-1">
                Ref No: <span className="font-mono">{documentNo}</span>
              </p>
            )}
            <p className="text-xs text-slate-600 mt-0.5">
              Date: <span className="font-semibold">{date}</span>
            </p>
          </div>
        </div>

        {/* Printable Document Content */}
        <div className="my-6 space-y-4 text-xs text-slate-900">
          {children}
        </div>

        {/* Executive Signature Lines */}
        <div className="mt-16 grid grid-cols-3 gap-8 text-center text-xs font-semibold text-slate-800">
          <div className="border-t border-slate-400 pt-1.5">Prepared By</div>
          <div className="border-t border-slate-400 pt-1.5">Verified By Auditor</div>
          <div className="border-t border-slate-400 pt-1.5">Authorized Signature</div>
        </div>

        {/* Document Footer */}
        <div className="mt-8 border-t border-slate-200 pt-3 text-center text-[10px] text-slate-500">
          Official Computer-Generated Document from AMKAS International ERP · Confidential & Sealed
        </div>
      </div>
    </Modal>
  );
}
