'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({ customItems }: { customItems?: BreadcrumbItem[] }) {
  const pathname = usePathname();

  const getBreadcrumbs = (): BreadcrumbItem[] => {
    if (customItems) return customItems;

    if (pathname === '/' || pathname === '/dashboard') {
      return [{ label: 'Dashboard' }];
    }

    const segments = pathname.split('/').filter(Boolean);
    const items: BreadcrumbItem[] = [{ label: 'Dashboard', href: '/' }];

    let accPath = '';
    segments.forEach((seg, index) => {
      accPath += `/${seg}`;
      const isLast = index === segments.length - 1;

      let label = seg.charAt(0).toUpperCase() + seg.slice(1);
      if (seg === 'sheet') label = 'DSA Sheet';
      else if (seg === 'revisions') label = 'Revision Queue';
      else if (seg === 'history') label = 'Practice History';
      else if (seg === 'bookmarks') label = 'My Bookmarks';
      else if (seg === 'patterns') label = 'Patterns';
      else if (seg === 'problems') label = 'Problems';
      else if (seg.length > 20) label = 'Problem Workspace';

      items.push({
        label,
        href: isLast ? undefined : accPath
      });
    });

    return items;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-xs text-zinc-500 dark:text-zinc-400">
      <ol className="flex items-center space-x-1.5 overflow-hidden text-ellipsis whitespace-nowrap">
        {breadcrumbs.map((item, idx) => {
          const isLast = idx === breadcrumbs.length - 1;
          return (
            <React.Fragment key={idx}>
              {idx > 0 && <ChevronRight className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-600 shrink-0" />}
              <li className="flex items-center">
                {idx === 0 && (
                  <Link
                    href="/"
                    className="mr-1 text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
                    title="Dashboard"
                  >
                    <Home className="h-3.5 w-3.5" />
                  </Link>
                )}
                {item.href ? (
                  <Link
                    href={item.href}
                    className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className={`font-medium ${isLast ? 'text-zinc-900 dark:text-zinc-100' : ''}`}>
                    {item.label}
                  </span>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
