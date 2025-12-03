'use client';

import { ReactNode, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function AuthLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/developers');
    }
  }, [user, loading, router]);

  if (loading || user) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full">
      <div className="hidden lg:flex flex-col items-center justify-center w-1/2 bg-muted/40 border-r p-8 text-center">
        <div className="max-w-md">
           <Link href="/" className="mr-4 md:mr-6 flex items-center space-x-2 justify-center mb-6">
              <Image src="/images/devcollab-logo.png" alt="DevCollab Hub Logo" width={64} height={64} className="h-16 w-16" />
              <span className="font-bold text-[#c5a35a] text-4xl">DevCollab Hub</span>
            </Link>
          <p className="text-xl text-foreground/80">
            Find Your Crew, Build Your Vision
          </p>
        </div>
      </div>
      <main className="flex flex-1 items-center justify-center p-4">
        {children}
      </main>
    </div>
  );
}
