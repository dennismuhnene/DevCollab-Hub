'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { sendEmailVerification } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase/config';
import { useState } from 'react';

export default function VerifyEmailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);

  const handleResendVerification = async () => {
    // Directly use auth.currentUser to ensure we have the most recent user object.
    const currentUser = auth.currentUser;
    if (currentUser && !isSending) {
      setIsSending(true);
      try {
        await sendEmailVerification(currentUser);
        toast({
          title: 'Verification email sent',
          description: 'Please check your inbox for a new verification link.',
        });
      } catch (error: any) {
        let description = 'Please try again later.';
        if (error.code === 'auth/too-many-requests') {
          description = 'You have requested this too many times. Please wait a few minutes before trying again.';
        }
        toast({
          variant: 'destructive',
          title: 'Error sending verification email',
          description: description,
        });
      } finally {
        setIsSending(false);
      }
    } else if (!currentUser) {
        toast({
            variant: 'destructive',
            title: 'Not Logged In',
            description: 'You need to be logged in to resend a verification email.',
        });
        router.push('/login');
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-center text-2xl font-bold">Verify Your Email</CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        <p className="mb-4">A verification email has been sent to your email address ({user?.email}). Please check your inbox and click the link to verify your account.</p>
        <p className="mb-4">If you haven't received the email, please check your spam folder.</p>
        <Button onClick={handleResendVerification} disabled={isSending}>
            {isSending ? 'Sending...' : 'Resend Verification Email'}
        </Button>
        <div className="mt-4">
            <Button variant='link' onClick={() => router.push('/login')}>Back to Login</Button>
        </div>
      </CardContent>
    </Card>
  );
}
