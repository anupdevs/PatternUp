'use client';

import * as React from 'react';
import { FileEdit, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface PersonalNotesProps {
  problemId: string;
  initialContent?: string | null;
}

export function PersonalNotes({ problemId, initialContent = '' }: PersonalNotesProps) {
  const [content, setContent] = React.useState(initialContent || '');
  const [saveStatus, setSaveStatus] = React.useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = React.useState<Date | null>(null);
  const [isDirty, setIsDirty] = React.useState(false);

  React.useEffect(() => {
    if (!isDirty && initialContent !== undefined && initialContent !== null) {
      setContent(initialContent);
    }
  }, [initialContent, isDirty]);

  // Debounced auto-save
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const saveNote = React.useCallback(
    async (noteText: string) => {
      if (!noteText.trim()) return;
      setSaveStatus('saving');

      try {
        const res = await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            problemId,
            content: noteText
          })
        });

        if (!res.ok) {
          throw new Error('Save request failed');
        }

        const json = await res.json();
        if (json.success) {
          setSaveStatus('saved');
          setLastSavedAt(new Date());
          setIsDirty(false);
        } else {
          setSaveStatus('error');
        }
      } catch {
        setSaveStatus('error');
      }
    },
    [problemId]
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    setIsDirty(true);
    setSaveStatus('idle');

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      saveNote(val);
    }, 1500); // 1.5 second debounce
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            <FileEdit className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold">Personal Notes</CardTitle>
            <p className="text-[11px] text-zinc-500">Persisted across devices and sessions</p>
          </div>
        </div>

        {/* Save Status Indicator */}
        <div className="flex items-center gap-1.5 text-xs">
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <Check className="h-3 w-3" />
              Saved {lastSavedAt ? `at ${lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
              <AlertCircle className="h-3 w-3" />
              Failed to save
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-2 pt-0">
        <textarea
          value={content}
          onChange={handleChange}
          rows={6}
          placeholder="Jot down time/space complexity notes, tricky edge cases (e.g. empty array, duplicate keys), or pattern insights..."
          className="w-full rounded-lg border border-zinc-200 bg-white p-3 text-xs font-mono leading-relaxed placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-200 dark:placeholder:text-zinc-500 resize-y"
        />

        <div className="flex items-center justify-between text-[11px] text-zinc-400">
          <span>Markdown formatting supported</span>
          {isDirty && saveStatus === 'idle' && (
            <span className="italic">Unsaved edits...</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
