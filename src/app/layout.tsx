import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { GoogleAnalytics } from '@next/third-parties/google';

export const metadata: Metadata = {
  title: 'DevCollab Hub',
  description: 'Connect with developers and collaborate on exciting projects.',
  icons: {
    icon: [
      { url: '/images/devcollab-logo.png', sizes: 'any' },
      { url: '/images/devcollab-logo.png', type: 'image/png', sizes: '32x32' },
      { url: '/images/devcollab-logo.png', type: 'image/png', sizes: '16x16' },
    ],
    apple: '/images/devcollab-logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} dark`} suppressHydrationWarning>
      <body>
          <FirebaseClientProvider>
            {children}
            <Toaster />
          </FirebaseClientProvider>
      </body>
      <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID!} />
    </html>
  );
}
