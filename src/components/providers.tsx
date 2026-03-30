'use client';

import { ThemeProvider } from 'next-themes';
import { Toaster as SonnerToaster } from 'sonner';
import type { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
      <SonnerToaster
        position="top-center"
        richColors
        closeButton
        toastOptions={{
          classNames: {
            toast: 'rounded-xl shadow-lg',
            title: 'text-sm font-semibold',
            description: 'text-sm',
          },
        }}
      />
    </ThemeProvider>
  );
}
