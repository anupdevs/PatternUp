'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { Button } from './button';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  confirmLabel?: string;
  confirmVariant?: 'default' | 'destructive';
  onConfirm?: () => void;
  isLoading?: boolean;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel = 'Confirm',
  confirmVariant = 'default',
  onConfirm,
  isLoading = false
}: DialogProps) {
  // Support Escape key to close dialog
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open && !isLoading) {
        onOpenChange(false);
      }
    };
    if (open) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, isLoading, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={() => !isLoading && onOpenChange(false)}
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="relative z-50 w-full max-w-lg max-h-[calc(100dvh-2rem)] flex flex-col rounded-xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 transition-all animate-in zoom-in-95"
      >
        <div className="flex items-start justify-between shrink-0">
          <div className="space-y-1 pr-4">
            <h2 id="dialog-title" className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
            {description && (
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
            )}
          </div>
          <button
            onClick={() => !isLoading && onOpenChange(false)}
            className="rounded-md p-1 text-zinc-400 hover:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {children && <div className="mt-4 flex-1 overflow-y-auto">{children}</div>}

        {onConfirm && (
          <div className="mt-5 sm:mt-6 flex justify-end gap-2.5 sm:gap-3 shrink-0 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <Button
              variant="outline"
              disabled={isLoading}
              onClick={() => onOpenChange(false)}
              className="text-xs sm:text-sm"
            >
              Cancel
            </Button>
            <Button
              variant={confirmVariant}
              isLoading={isLoading}
              onClick={onConfirm}
              className="text-xs sm:text-sm"
            >
              {confirmLabel}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
