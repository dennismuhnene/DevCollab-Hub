'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase/config';
import { AdvisorApplication } from '@/types/advisor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AdvisorApplicationForm } from './advisor-application-form';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const MAX_APPLICATIONS = 3;

export function AdvisorApplicationManager() {
  const { user, userProfile, reloadUserProfile } = useAuth();
  const { toast } = useToast();
  const [applications, setApplications] = useState<AdvisorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmittingId, setIsSubmittingId] = useState<string | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<AdvisorApplication | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  useEffect(() => {
    if (!user) {
        setLoading(false);
        return;
    };
    
    setLoading(true);
    const appsRef = collection(db, 'users', user.uid, 'advisorApplications');
    const q = query(appsRef);

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedApps: AdvisorApplication[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdvisorApplication));
      setApplications(fetchedApps);
      setLoading(false);
    }, (error) => {
      console.error("Error with realtime listener: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleStartNewApplication = (slot: number) => {
    setIsCreatingNew(true);
    setSelectedApplication({ slot } as AdvisorApplication); 
  };
  
  const handleSelectApplication = (app: AdvisorApplication) => {
      setSelectedApplication(app);
      setIsCreatingNew(false);
  }

  const handleBackToList = () => {
    setSelectedApplication(null);
    setIsCreatingNew(false);
    reloadUserProfile();
  }

  const handleToggleActiveProfile = async (applicationId: string) => {
      setIsSubmittingId(applicationId);
      try {
          const functions = getFunctions();
          const setActiveAdvisorProfile = httpsCallable(functions, 'setActiveAdvisorProfile');
          const result = await setActiveAdvisorProfile({ applicationId });
          toast({ title: "Success", description: (result.data as any).message });
          reloadUserProfile();
      } catch (error: any) {
          console.error("Error toggling active profile: ", error);
          toast({ variant: "destructive", title: "Error", description: error.message || "Could not update profile status." });
      } finally {
          setIsSubmittingId(null);
      }
  }

  if (loading) {
    return <Card><CardHeader><CardTitle>Advisor Applications</CardTitle></CardHeader><CardContent className="flex justify-center items-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></CardContent></Card>;
  }

  if (isCreatingNew || selectedApplication) {
    return (
        <div>
            <Button onClick={handleBackToList} variant="outline" className="mb-4">{'Back to Applications'}</Button>
            <AdvisorApplicationForm 
                userProfile={userProfile!} 
                application={selectedApplication} 
                isNewApplication={isCreatingNew}
                onFormSubmit={handleBackToList}
            />
        </div>
    );
  }

  return (
    <Card>
        <CardHeader>
            <CardTitle>Your Advisor Applications</CardTitle>
            <CardDescription>
                Apply for advisory roles if you are an expert or specialist in your field.
                Manage your applications below. Toggle the switch on a verified application to make it your public-facing advisor profile.
            </CardDescription>
        </CardHeader>
      <CardContent className="space-y-4">
        {[...Array(MAX_APPLICATIONS)].map((_, index) => {
          const slot = index + 1;
          const app = applications.find(a => a.slot === slot);
          const key = app ? app.id : `slot-${slot}`;
          const isActive = userProfile?.activeAdvisorApplicationId === app?.id;
          const isSubmitting = isSubmittingId === app?.id;

          return (
            <Card key={key} className="p-4 flex justify-between items-center">
              <div className="flex-grow">
                <p className="font-semibold">Application Slot #{slot}</p>
                <p className="text-sm text-muted-foreground">
                  Status: {app ? app.verificationStatus : 'Not Started'}
                </p>
              </div>
              <div className="flex items-center gap-4">
                 {app && app.verificationStatus === 'verified' && (
                    <div className="flex items-center space-x-2">
                        {isSubmitting ? (
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        ) : (
                            <Switch
                                id={`active-toggle-${app.id}`}
                                checked={isActive}
                                onCheckedChange={() => handleToggleActiveProfile(app.id)}
                                disabled={isSubmitting}
                            />
                        )}
                        <Label htmlFor={`active-toggle-${app.id}`} className="text-sm font-medium">
                           {isActive ? 'Active Profile' : 'Set as Active'}
                        </Label>
                    </div>
                )}
                <Button 
                    onClick={() => app ? handleSelectApplication(app) : handleStartNewApplication(slot)}
                    disabled={app?.verificationStatus === 'pending'}
                >
                    {app ? 'View/Edit' : 'Start Application'}
                </Button>
              </div>
            </Card>
          );
        })}
      </CardContent>
    </Card>
  );
}
