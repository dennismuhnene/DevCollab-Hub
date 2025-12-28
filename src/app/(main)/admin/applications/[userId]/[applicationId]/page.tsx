'use client';

import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase/config';
import { AdvisorApplication } from '@/types/advisor';
import { UserProfile } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';

const ApplicationDetailPage = () => {
    const params = useParams<{ userId: string; applicationId: string }>();
    const [application, setApplication] = useState<AdvisorApplication | null>(null);
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    const fetchApplicationDetails = useCallback(async () => {
        if (!params) return;
        setLoading(true);
        try {
            // Fetch the specific application document
            const appDocRef = doc(db, 'users', params.userId, 'advisorApplications', params.applicationId);
            const appDoc = await getDoc(appDocRef);

            if (appDoc.exists()) {
                setApplication({ id: appDoc.id, ...appDoc.data() } as AdvisorApplication);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: 'Application not found.' });
            }

            // Fetch the user's profile
            const userDocRef = doc(db, 'users', params.userId);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                setUser({ uid: userDoc.id, ...userDoc.data() } as UserProfile);
            }

        } catch (error) {
            console.error("Error fetching application details: ", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch application details.' });
        }
        setLoading(false);
    }, [params, toast]);

    useEffect(() => {
        fetchApplicationDetails();
    }, [fetchApplicationDetails]);

    const handleStatusUpdate = async (newStatus: 'verified' | 'rejected') => {
        if (!params) return;
        setIsSubmitting(true);
        try {
            const functions = getFunctions();
            const setAdvisorVerificationStatus = httpsCallable(functions, 'setAdvisorVerificationStatus');
            
            await setAdvisorVerificationStatus({ 
                applicantId: params.userId, 
                applicationId: params.applicationId,
                status: newStatus 
            });
            
            toast({ title: 'Success', description: `Application has been ${newStatus}.` });
            router.push('/admin/applications'); // Redirect back to the list after action

        } catch (error) {
            console.error(`Error updating application status: `, error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not update application status.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return <div className="container mx-auto p-4"><p>Loading application details...</p></div>;
    }

    if (!application || !user) {
        return <div className="container mx-auto p-4"><p>Application or user not found.</p></div>;
    }

    return (
        <div className="container mx-auto p-4">
             <Button variant="outline" size="sm" onClick={() => router.push('/admin/applications')} className="mb-4">Back to List</Button>
            <Card>
                <CardHeader>
                    <CardTitle className="flex justify-between items-start">
                        <span>Application from {user.name}</span>
                         <Badge variant={application.verificationStatus === 'pending' ? 'default' : 'secondary'}>{application.verificationStatus}</Badge>
                    </CardTitle>
                    <CardDescription>
                        <Link href={`/developers/${user.uid}`} className="hover:underline">View User Profile</Link>
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <h3 className="font-semibold text-lg mb-2">Headline</h3>
                        <p className="text-muted-foreground">{application.headline}</p>
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg mb-2">Full Bio</h3>
                        <p className="text-muted-foreground whitespace-pre-wrap">{application.bio}</p>
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg mb-2">Credentials</h3>
                        <div className="flex flex-wrap gap-2">
                            {application.credentials?.map(c => <Badge key={c} variant="outline">{c}</Badge>)}
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg mb-2">Specialties</h3>
                         <div className="flex flex-wrap gap-2">
                            {application.specialties?.map(s => <Badge key={s} variant="default">{s}</Badge>)}
                        </div>
                    </div>
                     <div>
                        <h3 className="font-semibold text-lg mb-2">Submission History</h3>
                        <p className="text-muted-foreground">Submissions: {application.submissionCount}, Edits: {application.editCount}</p>
                    </div>
                </CardContent>
                {application.verificationStatus === 'pending' && (
                    <CardFooter className="flex justify-end gap-2">
                        <Button variant="destructive" size="lg" onClick={() => handleStatusUpdate('rejected')} disabled={isSubmitting}>
                             {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Reject'}
                        </Button>
                        <Button size="lg" onClick={() => handleStatusUpdate('verified')} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Approve'}
                        </Button>
                    </CardFooter>
                )}
            </Card>
        </div>
    );
};

export default ApplicationDetailPage;
