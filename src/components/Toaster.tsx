import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, XCircle, X } from 'lucide-react';
import { useToastStore } from '@/lib/toast';

const iconMap = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const toneMap = {
  success: 'border-amber-500/40 bg-amber-500/10 text-emerald-700 dark:bg-amber-500/15 dark:text-amber-300',
  error: 'border-rose-500/40 bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
  info: 'border-sky-500/40 bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = iconMap[t.type];
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              className={`pointer-events-auto flex items-center gap-2.5 rounded-lg border px-4 py-2.5 text-sm shadow-lg ${toneMap[t.type]}`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{t.message}</span>
              <button onClick={() => dismiss(t.id)} className="ml-2 opacity-60 hover:opacity-100">
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
