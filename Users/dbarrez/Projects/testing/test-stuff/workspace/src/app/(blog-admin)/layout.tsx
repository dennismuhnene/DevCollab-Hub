'use client';

import { useAuth } from '@/lib/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import Header from '@/components/header';
import Footer from '@/components/footer';

export default function BlogAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Not logged in, redirect to main login page
        router.push('/login');
      } else if (user.email !== 'dennis.cmunene@gmail.com') {
        // Logged in, but not the correct user, redirect to main dashboard
        router.push('/dashboard');
      }
    }
  }, [user, loading, router]);

  if (loading || !user || user.email !== 'dennis.cmunene@gmail.com') {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Verifying access...</p>
      </div>
    );
  }

  // User is authenticated and authorized
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 bg-muted/20">{children}</main>
      <Footer />
    </div>
  );
}
