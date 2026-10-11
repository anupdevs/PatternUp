import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning' | 'info';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900',
    secondary: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200',
    outline: 'border border-zinc-200 text-zinc-800 dark:border-zinc-800 dark:text-zinc-200',
    destructive: 'bg-rose-500/10 text-rose-700 border border-rose-500/20 dark:text-rose-400 dark:bg-rose-500/15',
    success: 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 dark:text-emerald-400 dark:bg-emerald-500/15',
    warning: 'bg-amber-500/10 text-amber-700 border border-amber-500/20 dark:text-amber-400 dark:bg-amber-500/15',
    info: 'bg-blue-500/10 text-blue-700 border border-blue-500/20 dark:text-blue-400 dark:bg-blue-500/15'
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none select-none',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
