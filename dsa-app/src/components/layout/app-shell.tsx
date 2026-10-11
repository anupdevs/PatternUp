'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  TableProperties,
  Network,
  Bookmark,
  Repeat,
  History,
  BarChart3,
  Settings,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Code2,
  Sparkles,
  FolderKanban
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Breadcrumbs } from './breadcrumbs';
import { UserProfileMenu } from './user-profile-menu';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'DSA Sheet', href: '/sheet', icon: TableProperties },
  { name: 'Patterns', href: '/patterns', icon: Network },
  { name: 'Practice Modes', href: '/practice', icon: Sparkles },
  { name: 'Collections', href: '/collections', icon: FolderKanban },
  { name: 'My Bookmarks', href: '/bookmarks', icon: Bookmark },
  { name: 'Revision Queue', href: '/revisions', icon: Repeat },
  { name: 'Practice History', href: '/history', icon: History },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // Close mobile drawer upon route change
  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Support Escape key to close mobile drawer
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    if (mobileMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/' || pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-zinc-200/80 bg-white/80 px-3 sm:px-4 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-900/80 transition-colors">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 md:hidden"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Desktop sidebar toggle button */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>

          {/* Logo brand */}
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
              <Code2 className="h-4 w-4" />
            </div>
            <span className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100 hidden sm:inline-block">
              DSA Platform
            </span>
          </Link>

          <div className="hidden lg:block ml-4 border-l border-zinc-200 dark:border-zinc-800 pl-4">
            <Breadcrumbs />
          </div>
        </div>

        {/* Right header controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <UserProfileMenu />
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop Collapsible Sidebar */}
        <aside
          className={cn(
            'hidden md:flex flex-col border-r border-zinc-200/80 bg-white dark:border-zinc-800/80 dark:bg-zinc-900/40 transition-all duration-200 shrink-0 sticky top-14 h-[calc(100vh-3.5rem)]',
            collapsed ? 'w-16' : 'w-60'
          )}
        >
          {/* Main Navigation List */}
          <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  title={collapsed ? item.name : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors select-none',
                    active
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 font-semibold shadow-xs'
                      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100',
                    collapsed && 'justify-center px-0'
                  )}
                >
                  <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-500')} />
                  {!collapsed && <span className="truncate">{item.name}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Sidebar Footer info */}
          {!collapsed && (
            <div className="p-3 border-t border-zinc-200/80 dark:border-zinc-800/80 text-[11px] text-zinc-500 dark:text-zinc-500">
              <div className="flex items-center gap-1.5 font-medium text-zinc-700 dark:text-zinc-300">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>Bosscoder 211 Sheet</span>
              </div>
              <p className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-500">
                15 Topics • 37 Patterns
              </p>
            </div>
          )}
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true" aria-label="Mobile Navigation">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileMenuOpen(false)}
            />

            <div className="relative flex w-4/5 max-w-xs h-full max-h-screen flex-1 flex-col bg-white p-4 shadow-xl dark:bg-zinc-900 z-50 overflow-hidden">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
                    <Code2 className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">DSA Platform</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  aria-label="Close navigation menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="mt-4 flex-1 space-y-1 overflow-y-auto">
                {NAV_ITEMS.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        active
                          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 font-semibold'
                          : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 w-full min-w-0 max-w-7xl mx-auto p-3 sm:p-6 lg:p-8">
          <div className="lg:hidden mb-4">
            <Breadcrumbs />
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
