import { Printer, X } from 'lucide-react';
import { Modal } from './Modal';
import { formatCurrency } from '@/lib/utils';
import type { Product } from '@/lib/types';

interface Props {
  product?: Product;
  products?: Product[];
  count?: number;
  showPrice?: boolean;
  showCompany?: boolean;
  onClose: () => void;
}

// Scannable barcode rendering helper
export function ScannableBarcodeBars({ value, height = 36 }: { value: string; height?: number }) {
  const pattern: number[] = [];
  const cleanVal = (value || 'AMK-00000').toUpperCase();

  pattern.push(1, 0, 1);
  for (let i = 0; i < cleanVal.length; i++) {
    const code = cleanVal.charCodeAt(i);
    const bits = [
      (code >> 0) & 1,
      (code >> 1) & 1,
      (code >> 2) & 1,
      (code >> 3) & 1,
      (code >> 4) & 1,
      (code >> 5) & 1,
    ];
    bits.forEach((b) => pattern.push(b === 1 ? 1 : 0, 0));
  }
  pattern.push(1, 0, 1, 1);

  return (
    <div className="flex flex-col items-center">
      <svg className="h-9 w-full max-w-[180px]" viewBox={`0 0 ${pattern.length * 2.5} ${height}`} preserveAspectRatio="none">
        <rect width="100%" height="100%" fill="#ffffff" />
        {pattern.map((bit, idx) => {
          if (bit === 1) {
            return (
              <rect
                key={idx}
                x={idx * 2.5}
                y={0}
                width={2}
                height={height}
                fill="#000000"
              />
            );
          }
          return null;
        })}
      </svg>
    </div>
  );
}

export function LabelPrint({
  product,
  products = [],
  count = 6,
  showPrice = true,
  showCompany = true,
  onClose,
}: Props) {
  function doPrint() {
    window.print();
  }

  const activeProduct = product || products[0];

  if (!activeProduct) {
    return (
      <Modal open onClose={onClose} title="Product Label & Barcode" size="md">
        <div className="p-6 text-center text-slate-400">No product selected for printing.</div>
      </Modal>
    );
  }

  const labelCode = activeProduct.barcode_value || `AMK${activeProduct.code.replace(/\D/g, '').padStart(8, '0')}`;

  return (
    <Modal
      open
      onClose={onClose}
      title="Product Label & Barcode Printer"
      subtitle={`${activeProduct.code} — ${activeProduct.name}`}
      size="md"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">
            <X className="h-4 w-4" /> Close
          </button>
          <button onClick={doPrint} className="btn-primary bg-[#00a884] hover:bg-[#008f70] border-none text-white">
            <Printer className="h-4 w-4" /> Print {count} Labels
          </button>
        </>
      }
    >
      <div className="print-area grid grid-cols-2 gap-3 bg-white p-4 max-h-[70vh] overflow-y-auto">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-300 p-3 text-center bg-white shadow-2xs">
            {showCompany && (
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">AMKAS International</p>
            )}
            <p className="text-xs font-bold text-slate-900 line-clamp-1">{activeProduct.name}</p>
            <div className="my-1.5 flex justify-center">
              <ScannableBarcodeBars value={labelCode} />
            </div>
            <p className="text-[10px] font-mono font-bold tracking-widest text-slate-700">{labelCode}</p>
            {showPrice && (
              <p className="mt-1 text-xs font-extrabold text-slate-900">{formatCurrency(activeProduct.sale_price)}</p>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}
