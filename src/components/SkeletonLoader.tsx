import React from 'react';
import { Building2, Sparkles } from 'lucide-react';

export function CardSkeleton() {
  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="skeleton h-3 w-24 rounded-lg" />
        <div className="skeleton h-8 w-8 rounded-xl" />
      </div>
      <div className="skeleton h-7 w-36 rounded-xl" />
      <div className="skeleton h-3 w-28 rounded-lg" />
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="card overflow-hidden">
      {/* Table Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
        <div className="skeleton h-4 w-40 rounded-lg" />
        <div className="flex items-center gap-2">
          <div className="skeleton h-8 w-24 rounded-xl" />
          <div className="skeleton h-8 w-32 rounded-xl" />
        </div>
      </div>
      {/* Table Rows */}
      <div className="p-4 space-y-3">
        {Array.from({ length: rows }).map((_, rIndex) => (
          <div key={rIndex} className="flex items-center justify-between gap-4 py-2 border-b border-slate-100/50 dark:border-slate-800/40">
            {Array.from({ length: columns }).map((_, cIndex) => (
              <div
                key={cIndex}
                className="skeleton h-4 rounded-lg"
                style={{ width: `${Math.floor(Math.random() * 40) + 50}%` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ModuleSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-4">
        <div className="space-y-2">
          <div className="skeleton h-3 w-32 rounded-lg" />
          <div className="skeleton h-7 w-56 rounded-xl" />
        </div>
        <div className="skeleton h-10 w-36 rounded-full" />
      </div>

      {/* Metric Cards Skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>

      {/* Main Table Skeleton */}
      <TableSkeleton rows={6} columns={6} />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-4">
        <div className="space-y-2">
          <div className="skeleton h-3 w-36 rounded-lg" />
          <div className="skeleton h-8 w-64 rounded-xl" />
        </div>
        <div className="skeleton h-10 w-44 rounded-full" />
      </div>

      {/* 4 KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>

      {/* Main Grid: Chart + Gauge */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 card p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="skeleton h-4 w-40 rounded-lg" />
            <div className="skeleton h-4 w-20 rounded-lg" />
          </div>
          <div className="skeleton h-48 w-full rounded-2xl" />
        </div>
        <div className="card p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="skeleton h-4 w-32 rounded-lg" />
            <div className="skeleton h-4 w-16 rounded-lg" />
          </div>
          <div className="flex justify-center items-center py-6">
            <div className="skeleton h-36 w-36 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function StylishLoadingScreen({ message = 'Loading Enterprise Portal...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-100/90 dark:bg-[#0f172a]/95 backdrop-blur-2xl transition-all duration-300">
      <div className="relative flex flex-col items-center space-y-6 text-center">
        {/* Animated Glowing Logo Badge */}
        <div className="relative">
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-amber-400 to-amber-600 opacity-40 blur-xl animate-pulse" />
          <div className="relative grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-950 shadow-2xl ring-2 ring-white/30">
            <Building2 className="h-10 w-10 animate-bounce" />
          </div>
        </div>

        {/* Text Title & Subtitle */}
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-amber-500 dark:text-amber-400 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" /> AMKAS ERP SUITE
          </span>
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 font-heading">
            AMKAS International
          </h3>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 max-w-xs">
            {message}
          </p>
        </div>

        {/* Glowing Progress Line */}
        <div className="w-56 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800 relative">
          <div className="h-full w-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 rounded-full animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.6)]" />
        </div>
      </div>
    </div>
  );
}
