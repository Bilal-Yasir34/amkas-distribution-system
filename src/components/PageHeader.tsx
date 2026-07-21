import { type ReactNode } from 'react';
import { Search } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  onSearch?: (q: string) => void;
  searchValue?: string;
  searchPlaceholder?: string;
}

export function PageHeader({ title, subtitle, actions, onSearch, searchValue, searchPlaceholder }: PageHeaderProps) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-lg font-semibold text-slate-800 dark:text-white">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {onSearch && (
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9 w-56"
              placeholder={searchPlaceholder ?? 'Search…'}
              value={searchValue ?? ''}
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>
        )}
        {actions}
      </div>
    </div>
  );
}
