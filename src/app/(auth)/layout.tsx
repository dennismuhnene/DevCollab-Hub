'use client';

import { ReactNode, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import Header from '@/components/header';
import Footer from '@/components/footer';

export default function AuthLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If auth is loaded and the user is logged in and verified, they shouldn't be here.
    if (!loading && user && user.emailVerified) {
      router.push('/developers');
    }
  }, [user, loading, router]);

  // While checking auth or if we are about to redirect a logged-in user, show a loader.
  if (loading || (user && user.emailVerified)) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // If the user is not loading and is not logged in/verified, show the auth pages.
  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header />
      <main className="flex flex-1 items-center justify-center bg-muted/20 py-12">
        <div className="container grid max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div className="hidden flex-col items-center justify-center p-8 text-center lg:flex">
                <div className="max-w-md">
                <Link href="/" className="mr-4 md:mr-6 flex items-center space-x-2 justify-center mb-2">
                    <Image src="/images/devcollab-logo.png" alt="DevCollab Hub Logo" width={64} height={64} className="h-16 w-16" />
                    <span className="font-bold text-[#c5a35a] text-4xl">DevCollab Hub</span>
                </Link>
                <p className="text-xl text-foreground/80">
                    Find Your Crew, Build Your Vision
                </p>
                </div>
            </div>
            <div className="flex items-center justify-center">
                {children}
            </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
