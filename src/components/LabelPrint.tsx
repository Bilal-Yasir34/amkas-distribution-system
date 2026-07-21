import { Printer, X } from 'lucide-react';
import { Modal } from './Modal';
import { formatCurrency } from '@/lib/utils';
import type { Product } from '@/lib/types';

interface Props {
  product: Product;
  onClose: () => void;
}

// Simple deterministic barcode visual (interleaved bars) — purely cosmetic for print.
function BarcodeBars({ value }: { value: string }) {
  const bars = [];
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    for (let b = 0; b < 4; b++) {
      const on = (code >> b) & 1;
      bars.push(<div key={`${i}-${b}`} style={{ width: on ? 3 : 2, background: on ? '#000' : 'transparent', height: 38 }} />);
    }
  }
  return <div className="flex items-end gap-px">{bars}</div>;
}

export function LabelPrint({ product, onClose }: Props) {
  function doPrint() { window.print(); }
  const labelCode = `AMK${product.code.replace(/\D/g, '').padStart(8, '0')}`;

  return (
    <Modal
      open
      onClose={onClose}
      title="Product Label & Barcode"
      subtitle={`${product.code} — ${product.name}`}
      size="md"
      footer={<><button onClick={onClose} className="btn-secondary"><X className="h-4 w-4" /> Close</button><button onClick={doPrint} className="btn-primary"><Printer className="h-4 w-4" /> Print Labels</button></>}
    >
      <div className="print-area grid grid-cols-2 gap-3 bg-white p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded border border-slate-300 p-2 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">AMKAS International</p>
            <p className="mt-0.5 text-xs font-bold text-slate-900">{product.name}</p>
            <div className="my-1 flex justify-center"><BarcodeBars value={labelCode} /></div>
            <p className="text-[10px] font-mono tracking-widest">{labelCode}</p>
            <p className="mt-0.5 text-xs font-semibold text-slate-900">{formatCurrency(product.sale_price)}</p>
          </div>
        ))}
      </div>
    </Modal>
  );
}
