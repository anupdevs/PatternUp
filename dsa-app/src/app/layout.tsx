import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { ThemeProvider } from '@/components/theme-provider';
import { ToastProvider } from '@/components/ui/toast';
import { AppShell } from '@/components/layout/app-shell';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin']
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin']
});

export const metadata: Metadata = {
  title: 'DSA Sheet Platform - Master 211 Problems & Patterns',
  description:
    'A developer-focused DSA preparation platform featuring pattern exploration, SM-2 spaced repetition review, progressive hints, and comprehensive progress analytics.',
  keywords: ['DSA', 'Data Structures', 'Algorithms', 'LeetCode', 'GeeksforGeeks', 'Spaced Repetition', 'Bosscoder']
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        suppressHydrationWarning
        className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
        style={{ colorScheme: 'dark' }}
      >
        <head>
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(){try{localStorage.setItem('dsa_theme','dark');document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}catch(e){}})();`
            }}
          />
        </head>
        <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/20 selection:text-indigo-300 dark">
          <ThemeProvider defaultTheme="dark">
            <ToastProvider>
              <AppShell>{children}</AppShell>
            </ToastProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
