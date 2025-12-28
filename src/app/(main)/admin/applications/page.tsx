'use client';

import { useState, useEffect, useCallback } from 'react';
import { collectionGroup, query, onSnapshot, doc, getDoc, Timestamp } from 'firebase/firestore'; // Changed
import { getFunctions, httpsCallable, FunctionsError } from 'firebase/functions';
import { db } from '@/lib/firebase/config';
import { AdvisorApplication } from '@/types/advisor';
import { UserProfile } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from 'lucide-react';

interface FullApplicationInfo {
    application: AdvisorApplication;
    user: UserProfile;
    userId: string;
}

const FullApplicantCard = ({ info, onStatusUpdate }: { info: FullApplicationInfo; onStatusUpdate?: (status: 'verified' | 'rejected') => Promise<void>; }) => {
    const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'verifying' | 'rejecting'>('idle');

    const handleUpdate = async (status: 'verified' | 'rejected') => {
        if (!onStatusUpdate) return;
        setSubmissionStatus(status === 'verified' ? 'verifying' : 'rejecting');
        try {
            await onStatusUpdate(status);
        } finally {
            // FIX: Ensure loading state is always reset
            setSubmissionStatus('idle'); 
        }
    };
    
    return (
        <Card key={info.application.id}>
            <CardHeader>
                <CardTitle><Link href={`/developers/${info.userId}`} passHref><span className="hover:underline">{info.user.name || 'Unknown User'}</span></Link></CardTitle>
                <CardDescription>{info.user.email}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div><h4 className="font-semibold text-sm">Headline</h4><p className="text-muted-foreground text-sm">{info.application.headline}</p></div>
                 <div><h4 className="font-semibold text-sm">Bio</h4><p className="text-muted-foreground text-sm line-clamp-3">{info.application.bio}</p></div>
                 <div><h4 className="font-semibold text-sm mb-2">Credentials</h4><div className="flex flex-wrap gap-2">{info.application.credentials?.map(c => <Badge key={c} variant="secondary">{c}</Badge>)}</div></div>
                 <div><h4 className="font-semibold text-sm mb-2">Specialties</h4><div className="flex flex-wrap gap-2">{info.application.specialties?.map(s => <Badge key={s}>{s}</Badge>)}</div></div>
            </CardContent>
            {info.application.verificationStatus === 'pending' && onStatusUpdate && (
                 <CardFooter className="flex justify-end gap-2">
                    <Button variant="destructive" size="sm" onClick={() => handleUpdate('rejected')} disabled={submissionStatus !== 'idle'}>
                        {submissionStatus === 'rejecting' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Reject'}
                    </Button>
                    <Button size="sm" onClick={() => handleUpdate('verified')} disabled={submissionStatus !== 'idle'}>
                        {submissionStatus === 'verifying' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Verify'}
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
};

const ApplicationsListPage = () => {
    const [applications, setApplications] = useState<FullApplicationInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    // UPDATED to use a real-time listener
    useEffect(() => {
        setLoading(true);
        const q = query(collectionGroup(db, 'advisorApplications'));

        const unsubscribe = onSnapshot(q, async (querySnapshot) => {
            const appInfosPromises = querySnapshot.docs.map(async (appDoc) => {
                const application = { ...appDoc.data(), id: appDoc.id } as AdvisorApplication;
                const userId = appDoc.ref.parent.parent?.id;
                if (userId) {
                    const userDoc = await getDoc(doc(db, 'users', userId));
                    if (userDoc.exists()) {
                        const user = { uid: userDoc.id, ...userDoc.data() } as UserProfile;
                        return { application, user, userId };
                    }
                }
                return null;
            });

            const appInfosResults = await Promise.all(appInfosPromises);
            const appInfos = appInfosResults.filter((info): info is FullApplicationInfo => info !== null);

            appInfos.sort((a, b) => {
                const timeA = a.application.createdAt;
                const timeB = b.application.createdAt;
                const secondsA = (timeA instanceof Timestamp) ? timeA.seconds : 0;
                const secondsB = (timeB instanceof Timestamp) ? timeB.seconds : 0;
                return secondsB - secondsA;
            });

            setApplications(appInfos);
            setLoading(false);
        }, (error) => {
            console.error("Error listening for applications:", error);
            toast({ variant: 'destructive', title: 'Listen Error', description: 'Could not fetch applications in real-time.' });
            setLoading(false);
        });

        return () => unsubscribe(); // Cleanup listener on unmount
    }, [toast]);

    const handleStatusUpdate = async (info: FullApplicationInfo, newStatus: 'verified' | 'rejected') => {
        const functions = getFunctions();
        const setAdvisorVerificationStatus = httpsCallable(functions, 'setAdvisorVerificationStatus');
        
        try {
            await setAdvisorVerificationStatus({ 
                applicantId: info.userId, 
                applicationId: info.application.id,
                status: newStatus 
            });
            
            toast({ title: 'Success', description: `Application status updated to ${newStatus}.` });

            // No longer need to manually refetch; the listener will handle it.

        } catch (error: any) {
            console.error(`FATAL: Could not update status for application ${info.application.id}:`, error);
            const functionsError = error as FunctionsError;
            const code = functionsError.code || 'unknown';
            const message = functionsError.message || 'An unknown error occurred.';

            toast({ 
                variant: 'destructive', 
                title: `Update Failed (Code: ${code})`,
                description: `Message: ${message}`,
            });

            // Re-throw the error so the calling component can handle its loading state
            throw error;
        }
    };

    if (loading) {
        return <div className="container mx-auto p-4 flex justify-center"><Loader2 className="h-12 w-12 animate-spin"/></div>;
    }

    const pendingApps = applications.filter(a => a.application.verificationStatus === 'pending');
    const verifiedApps = applications.filter(a => a.application.verificationStatus === 'verified');
    const rejectedApps = applications.filter(a => a.application.verificationStatus === 'rejected');

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-3xl font-bold mb-6">All Advisor Applications</h1>
            <Tabs defaultValue="pending" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="pending">Pending ({pendingApps.length})</TabsTrigger>
                    <TabsTrigger value="verified">Verified ({verifiedApps.length})</TabsTrigger>
                    <TabsTrigger value="rejected">Rejected ({rejectedApps.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="pending">
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
                        {pendingApps.length > 0 ? pendingApps.map((info) => (
                            <FullApplicantCard 
                                key={info.application.id} 
                                info={info} 
                                onStatusUpdate={(status) => handleStatusUpdate(info, status)}
                            />
                        )) : <p className="col-span-full mt-4 text-center">No pending applications.</p>}
                    </div>
                </TabsContent>
                <TabsContent value="verified">
                     <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
                        {verifiedApps.map(info => <FullApplicantCard key={info.application.id} info={info} />)}
                    </div>
                </TabsContent>
                <TabsContent value="rejected">
                     <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
                        {rejectedApps.map(info => <FullApplicantCard key={info.application.id} info={info} />)}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default ApplicationsListPage;