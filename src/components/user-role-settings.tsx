'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Loader2 } from 'lucide-react';

export default function UserRoleSettings() {
  const { user, userProfile, reloadUserProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const isAdvisorOnly = userProfile?.isAdvisorOnly ?? false;
  const [optimisticIsAdvisorOnly, setOptimisticIsAdvisorOnly] = useState(isAdvisorOnly);

  useEffect(() => {
    setOptimisticIsAdvisorOnly(isAdvisorOnly);
  }, [isAdvisorOnly]);

  const handleToggle = async (checked: boolean) => {
    if (!user) return;

    setOptimisticIsAdvisorOnly(checked);
    setLoading(true);

    const userDocRef = doc(db, 'users', user.uid);
    try {
      await updateDocumentNonBlocking(userDocRef, { isAdvisorOnly: checked });
      toast({
        title: 'Settings updated',
        description: `You are now an ${checked ? 'Advisor Only' : 'Developer'} user.`,
      });
      await reloadUserProfile();
    } catch (error) {
      console.error('Failed to update user role:', error);
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: 'Could not update your role settings.',
      });
      setOptimisticIsAdvisorOnly(isAdvisorOnly);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle><h3 className="text-lg font-medium">User Role Settings</h3></CardTitle> 
        <CardDescription>Define your primary role on the platform.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-3 rounded-md border p-4">
          <Switch
            id="isAdvisorOnly"
            checked={optimisticIsAdvisorOnly}
            onCheckedChange={handleToggle}
            disabled={loading}
          />
          <div className="space-y-0.5">
            <Label htmlFor="isAdvisorOnly" className="text-base">
              Advisor Only Mode
            </Label>
            <p className="text-sm text-muted-foreground">
              {optimisticIsAdvisorOnly
                ? "Your profile will not be shown in the public developers listing."
                : "Your profile is visible to others in the developers listing."}
            </p>
          </div>
          {loading && <Loader2 className="h-5 w-5 animate-spin" />}
        </div>
      </CardContent>
    </Card>
  );
}
