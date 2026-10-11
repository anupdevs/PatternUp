import { SignIn } from '@clerk/nextjs';

export const metadata = {
  title: 'Sign In | DSA Sheet Platform',
  description: 'Sign in to access your personalized DSA preparation dashboard, notes, and revision queue.'
};

export default function SignInPage() {
  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center py-10 px-4">
      <div className="w-full max-w-md flex flex-col items-center">
        <SignIn
          appearance={{
            elements: {
              rootBox: 'mx-auto w-full shadow-lg rounded-2xl',
              card: 'bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm rounded-2xl',
              headerTitle: 'text-zinc-900 dark:text-zinc-100 font-bold',
              headerSubtitle: 'text-zinc-500 dark:text-zinc-400 text-xs',
              socialButtonsBlockButton: 'border-zinc-200 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-200',
              formButtonPrimary: 'bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs',
              footerActionLink: 'text-indigo-600 dark:text-indigo-400 font-semibold'
            }
          }}
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
        />
      </div>
    </div>
  );
}
