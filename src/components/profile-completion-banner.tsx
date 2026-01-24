'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { X, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const TOTAL_MANDATORY_FIELDS = 8;

export default function ProfileCompletionBanner() {
  const { user, userProfile } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [canDismiss, setCanDismiss] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('profileBannerDismissed') === 'true') {
      return;
    }

    if (user && userProfile) {
      const fields: string[] = [];
      
      if (!userProfile.photoURL) fields.push('Profile Picture');
      if (!userProfile.bio) fields.push('Bio');
      if (!userProfile.skills || userProfile.skills.length === 0) fields.push('Skills');
      if (!userProfile.location) fields.push('Location');
      if (userProfile.yearsOfExperience === undefined || userProfile.yearsOfExperience === null) fields.push('Years of Experience');
      if (!userProfile.commitmentLevel) fields.push('Commitment Level');
      if (!userProfile.collaborationGoals || userProfile.collaborationGoals.length === 0) fields.push('Collaboration Goals');

      // Check version control URL only for non-advisors (Developers)
      if (!userProfile.roles?.advisor) {
        if (!(userProfile.versionControl as any)?.url) {
          fields.push('Version Control URL');
        }
      }

      if (fields.length > 0) {
        setMissingFields(fields);
        setIsVisible(true);
        
        const filledFields = TOTAL_MANDATORY_FIELDS - fields.length;
        setCanDismiss(filledFields >= 6);
      }
    }
  }, [user, userProfile]);

  const handleDismiss = () => {
    if (canDismiss) {
      setIsVisible(false);
      sessionStorage.setItem('profileBannerDismissed', 'true');
    }
  };

  if (!isVisible || !user) {
    return null;
  }

  const DismissButton = (
    <Button variant="ghost" size="icon" onClick={handleDismiss} disabled={!canDismiss}>
      <X className="h-4 w-4" />
    </Button>
  );

  return (
    <div className="container mx-auto px-4 py-4 sm:px-6 lg:px-8">
      <Card className="border-yellow-500 bg-yellow-50/50 dark:bg-yellow-900/10">
        <CardHeader className="flex flex-row items-start justify-between">
          <div className="flex items-center gap-3">
             <AlertCircle className="h-6 w-6 text-yellow-600" />
             <div>
                <CardTitle>Complete Your Profile</CardTitle>
                <CardDescription>An enriched profile attracts more collaborators.</CardDescription>
            </div>
          </div>
          {!canDismiss ? (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span>{DismissButton}</span>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Complete at least 6 fields to dismiss this banner.</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
          ) : (
            DismissButton
          )}
        </CardHeader>
        <CardContent>
            <p className="text-sm font-medium mb-2">You have {missingFields.length} missing fields:</p>
            <ul className="grid grid-cols-2 md:grid-cols-3 list-disc list-inside text-sm text-muted-foreground space-y-1 mb-4">
                {missingFields.map(field => <li key={field}>{field}</li>)}
            </ul>
          <Button asChild>
            <Link href="/profile">Go to Profile</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
