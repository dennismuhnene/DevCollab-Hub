'use client';

import { ReactNode, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import Header from '@/components/header';
import Footer from '@/components/footer';

const ADMIN_EMAIL = 'dennis.cmuhenene@gmail.com';

export default function BlogAdminLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Not logged in, redirect to main login page
        router.push('/login');
      } else if (user.email !== ADMIN_EMAIL) {
        // Logged in, but not the admin
        router.push('/'); // Redirect to homepage or an unauthorized page
      }
    }
  }, [user, loading, router]);

  if (loading || !user || user.email !== ADMIN_EMAIL) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Verifying access...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
    </div>
  );
}
