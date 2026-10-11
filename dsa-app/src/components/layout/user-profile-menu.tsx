'use client';

import * as React from 'react';
import { UserButton, SignInButton, useUser } from '@clerk/nextjs';
import { LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function UserProfileMenu() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="h-8 w-8 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="hidden text-right md:block">
            <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
              {user.fullName || user.username || user.primaryEmailAddress?.emailAddress?.split('@')[0] || 'Learner'}
            </p>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
              {user.primaryEmailAddress?.emailAddress || 'DSA Candidate'}
            </p>
          </div>
          <UserButton
            appearance={{
              elements: {
                avatarBox: 'h-8 w-8 ring-1 ring-zinc-200 dark:ring-zinc-800'
              }
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <SignInButton mode="modal">
        <Button size="sm" variant="outline" className="gap-1.5 text-xs">
          <LogIn className="h-3.5 w-3.5" />
          Sign in
        </Button>
      </SignInButton>
    </div>
  );
}
