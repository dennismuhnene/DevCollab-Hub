'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth } from '@/lib/firebase/config';
import { logAnalyticsEvent } from '@/firebase/analytics';
import { Trash2, Loader2 } from 'lucide-react';

const DeleteAccount = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDeleteAccount = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const functions = getFunctions(auth.app);
      const deleteUserCallable = httpsCallable(functions, 'deleteUserAccount');
      
      logAnalyticsEvent('delete_account', {});
      await deleteUserCallable();
      
      toast({ title: 'Account deleted successfully' });
      
      await auth.signOut();
      router.push('/');

    } catch (error: any) {
      console.error("Account deletion error:", error);
      toast({
        variant: 'destructive',
        title: 'Error deleting account',
        description: error.message || 'An unknown error occurred.',
      });
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="mt-12 border-t border-destructive/20 pt-6">
        <h3 className="text-lg font-semibold text-destructive">Danger Zone</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Once you delete your account, there is no going back. Please be certain.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={loading}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete My Account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your account and remove your data from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={loading}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
  );
};

export default DeleteAccount;
