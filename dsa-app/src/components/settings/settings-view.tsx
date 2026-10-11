'use client';

import * as React from 'react';
import { Save, Globe, Target, Code2, User, Download, FileSpreadsheet, FileJson } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { UserProfile, SignInButton, useUser } from '@clerk/nextjs';

export function SettingsView() {
  const { toast, success, error: toastError } = useToast();
  const { user, isLoaded: userLoaded } = useUser();

  const [dailyGoal, setDailyGoal] = React.useState<number>(3);
  const [preferredLang, setPreferredLang] = React.useState<string>('python');
  const [timezone, setTimezone] = React.useState<string>('UTC');
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    fetch('/api/preferences')
      .then((res) => {
        if (res.status === 401) return null;
        return res.json();
      })
      .then((json) => {
        if (json?.success && json.data) {
          setDailyGoal(json.data.dailyProblemGoal || 3);
          setPreferredLang(json.data.preferredCodingLanguage || 'python');
          setTimezone(json.data.timezone || 'UTC');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch('/api/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dailyProblemGoal: Number(dailyGoal),
          preferredCodingLanguage: preferredLang,
          timezone
        })
      });

      if (!res.ok) {
        const errorJson = await res.json();
        throw new Error(errorJson.error || 'Failed to update preferences');
      }

      success('Preferences Saved', 'Your study goals and application settings have been updated.');
    } catch (err: any) {
      toastError('Save Error', err?.message || 'Could not update preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
          Settings & Preferences
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Customize your study cadence, code language default, and timezone.
        </p>
      </div>

      <form onSubmit={handleSavePreferences} className="space-y-6">
        {/* Study Goals & Preferences */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <CardTitle className="text-base font-semibold">Study Goals</CardTitle>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-0">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Daily Problem Goal (1 - 10)
                </label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={dailyGoal}
                  onChange={(e) => setDailyGoal(Math.max(1, Math.min(10, Number(e.target.value))))}
                  className="w-full text-xs"
                />
                <p className="text-[11px] text-zinc-400">
                  Target number of problems you plan to solve daily.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Preferred Programming Language
                </label>
                <select
                  value={preferredLang}
                  onChange={(e) => setPreferredLang(e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-800 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                >
                  <option value="python">Python 3</option>
                  <option value="cpp">C++ (STL)</option>
                  <option value="java">Java 21</option>
                  <option value="typescript">TypeScript</option>
                  <option value="javascript">JavaScript</option>
                  <option value="go">Go</option>
                  <option value="rust">Rust</option>
                </select>
                <p className="text-[11px] text-zinc-400">
                  Default language for problem solutions and syntax examples.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-800 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
              >
                <option value="UTC">UTC (Universal Coordinated Time)</option>
                <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                <option value="America/New_York">America/New_York (EST / EDT)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PST / PDT)</option>
                <option value="Europe/London">Europe/London (GMT / BST)</option>
                <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
              </select>
              <p className="text-[11px] text-zinc-400">
                Used to determine daily study streak cutoffs and heatmap dates.
              </p>
            </div>
          </CardContent>
        </Card>


        {/* Save Button */}
        <div className="flex justify-end">
          <Button type="submit" isLoading={saving} className="text-xs gap-1.5 px-6">
            <Save className="h-4 w-4" />
            Save Preferences
          </Button>
        </div>
      </form>

      {/* Account & Profile Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <CardTitle className="text-base font-semibold">Account Profile</CardTitle>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {!userLoaded ? (
            <div className="h-32 rounded-xl bg-zinc-100 animate-pulse dark:bg-zinc-850" />
          ) : user ? (
            <div className="rounded-xl border border-zinc-200/80 p-4 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
              <UserProfile routing="hash" />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-200 p-6 text-center dark:border-zinc-800">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                You are currently browsing as a guest
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Sign in to sync your solved questions, notes, and revision queue across all devices.
              </p>
              <div className="mt-4">
                <SignInButton mode="modal">
                  <Button size="sm">Sign In to Your Account</Button>
                </SignInButton>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Export & Backup */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <CardTitle className="text-base font-semibold">Data Export & Backup</CardTitle>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Export a full copy of your solved problems, attempt logs, personal notes, bookmarks, collections, and revision schedules.
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap items-center gap-3">
            <a href="/api/export?format=json" download>
              <Button size="sm" variant="outline" className="text-xs gap-1.5">
                <FileJson className="h-4 w-4 text-amber-600" />
                Export as JSON
              </Button>
            </a>
            <a href="/api/export?format=csv" download>
              <Button size="sm" variant="outline" className="text-xs gap-1.5">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                Export as CSV
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
