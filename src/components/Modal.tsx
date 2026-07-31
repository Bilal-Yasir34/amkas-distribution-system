import { type ReactNode } from 'react';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeMap = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

export function Modal({ open, onClose, title, subtitle, children, footer, size = 'lg' }: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', duration: 0.25, bounce: 0.1 }}
            className={`relative z-10 flex max-h-[92vh] sm:max-h-[90vh] w-full ${sizeMap[size]} flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900/90 backdrop-blur-2xl`}
          >
            {(title || subtitle) ? (
              <div className="flex items-start justify-between border-b border-slate-200 px-4 sm:px-5 py-3.5 sm:py-4 dark:border-slate-700">
                <div>
                  {title && <h2 className="text-base font-semibold text-slate-800 dark:text-white">{title}</h2>}
                  {subtitle && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
                </div>
                <button onClick={onClose} className="btn-ghost !p-1.5">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button onClick={onClose} className="absolute right-3 top-3 z-20 btn-ghost !p-1.5">
                <X className="h-4 w-4 text-slate-400 hover:text-slate-200" />
              </button>
            )}
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-3.5 sm:py-4">{children}</div>
            {footer && (
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 border-t border-slate-200 px-4 sm:px-5 py-3 dark:border-slate-700">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
