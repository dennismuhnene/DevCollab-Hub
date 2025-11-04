import type { ReactNode } from 'react';
import Header from '@/components/header';
import Footer from '@/components/footer';

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
