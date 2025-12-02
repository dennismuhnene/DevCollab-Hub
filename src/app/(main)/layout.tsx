import type { ReactNode } from 'react';
import Header from '@/components/header';
import Footer from '@/components/footer';

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
        {/* This layout is now a sibling to other layouts,
            so Header and Footer are managed by the RootLayout
            or a higher-level layout if needed.
            If pages in (main) need a specific header/footer,
            you can add them here. Otherwise, they are handled globally.
        */}
        <main className="flex-1">{children}</main>
    </div>
  );
}
