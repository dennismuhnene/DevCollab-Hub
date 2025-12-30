'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Engagement } from '@/types/advisor';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';

export default function Engagements() {
    const { user, userProfile } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    
    const [developerEngagements, setDeveloperEngagements] = useState<Engagement[]>([]);
    const [advisorRequests, setAdvisorRequests] = useState<Engagement[]>([]);
    const [advisorEngagements, setAdvisorEngagements] = useState<Engagement[]>([]);
    const [showMessageModal, setShowMessageModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [modalTitle, setModalTitle] = useState('');

    useEffect(() => {
        if (!user || !userProfile) return;

        // Engagements where the current user is the developer
        const devQuery = query(collection(db, 'engagements'), where('developerId', '==', user.uid));
        const unsubscribeDev = onSnapshot(devQuery, (snapshot) => {
            const engs: Engagement[] = [];
            snapshot.forEach(doc => engs.push({ id: doc.id, ...doc.data() } as Engagement));
            setDeveloperEngagements(engs);
        });

        let unsubscribeAdvisor: (() => void) | null = null;
        // Engagements where the current user is the advisor (if they have the role)
        if (userProfile?.roles?.advisor) {
            const advisorQuery = query(collection(db, 'engagements'), where('advisorId', '==', user.uid));
            unsubscribeAdvisor = onSnapshot(advisorQuery, (snapshot) => {
                const reqs: Engagement[] = [];
                const otherEngs: Engagement[] = [];
                snapshot.forEach(doc => {
                    const engagement = { id: doc.id, ...doc.data() } as Engagement;
                    if (engagement.status === 'requested') {
                        reqs.push(engagement);
                    } else {
                        otherEngs.push(engagement);
                    }
                });
                setAdvisorRequests(reqs);
                setAdvisorEngagements(otherEngs);
            });
        }

        return () => {
            unsubscribeDev();
            if (unsubscribeAdvisor) {
                unsubscribeAdvisor();
            }
        };

    }, [user, userProfile]);

    const handleAccept = async (engagementId: string) => {
        const engagementRef = doc(db, 'engagements', engagementId);
        try {
            await updateDoc(engagementRef, {
                status: 'active',
                activatedAt: serverTimestamp()
            });
            toast({ title: "Request Accepted", description: "The engagement room is now active." });
            router.push(`/engagements/${engagementId}`);
        } catch (error) {
            console.error("Error accepting engagement:", error);
            toast({ variant: 'destructive', title: "Error", description: "Could not accept the request." });
        }
    };
    
    const handleDeny = async (engagementId: string) => {
        const engagementRef = doc(db, 'engagements', engagementId);
        try {
            await updateDoc(engagementRef, {
                status: 'rejected'
            });
            toast({ title: "Request Denied", description: "The developer will be notified." });
        } catch (error) {
            console.error("Error denying engagement:", error);
            toast({ variant: 'destructive', title: "Error", description: "Could not deny the request." });
        }
    };

    const handleViewMessage = (message: string, participantName: string, isAdvisorView: boolean) => {
        setModalTitle(isAdvisorView ? `Original Request from ${participantName}` : `Your Original Request to ${participantName}`);
        setModalMessage(message);
        setShowMessageModal(true);
    };

    const getStatusColor = (status: Engagement['status']) => {
        switch (status) {
            case 'active': return 'text-green-500';
            case 'requested': return 'text-yellow-500';
            case 'rejected': return 'text-red-500';
            case 'closed': return 'text-gray-500';
            default: return 'text-gray-500';
        }
    };

    if (!user || !userProfile) {
        return null; // Don't render anything if user is not fully loaded
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">My Engagements</CardTitle>
                    <CardDescription className="text-sm">Engagements you have requested as a developer.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {developerEngagements.length > 0 ? developerEngagements.map(eng => (
                        <div key={eng.id} className="flex items-center justify-between p-2 border rounded-lg">
                            <div>
                                <p className="font-semibold text-sm">vs {eng.advisorName}</p>
                                <p className="text-sm">Status: <span className={`font-medium ${getStatusColor(eng.status)}`}>{eng.status}</span></p>
                            </div>
                            {eng.status === 'rejected' ? (
                                <Button variant="outline" onClick={() => handleViewMessage(eng.message, eng.advisorName, false)}>View Message</Button>
                            ) : (
                                <Button asChild><Link href={`/engagements/${eng.id}`}>View</Link></Button>
                            )}
                        </div>
                    )) : (
                        <p className="text-sm text-muted-foreground">You have not requested any engagements.</p>
                    )}
                </CardContent>
            </Card>

            {userProfile?.roles?.advisor && (
                <>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Advisory Requests</CardTitle>
                            <CardDescription className="text-sm">Requests from developers seeking your advice.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {advisorRequests.length > 0 ? advisorRequests.map(req => (
                                <div key={req.id} className="p-4 border rounded-lg">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-semibold text-sm">{req.developerName}</p>
                                            <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{req.message}</p>
                                        </div>
                                        <Avatar>
                                            <AvatarImage src={req.developerPhotoURL} />
                                            <AvatarFallback>{req.developerName?.[0]}</AvatarFallback>
                                        </Avatar>
                                    </div>
                                    <CardFooter className="flex justify-end gap-2 pt-4 px-0 pb-0">
                                       <Button variant="outline" onClick={() => handleDeny(req.id)}>Deny</Button>
                                       <Button onClick={() => handleAccept(req.id)}>Accept & Open Room</Button>
                                    </CardFooter>
                                </div>
                            )) : (
                                <p className="text-sm text-muted-foreground">You have no pending advisory requests.</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">My Advisor Engagements</CardTitle>
                            <CardDescription className="text-sm">Your ongoing and past engagements as an advisor.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {advisorEngagements.length > 0 ? advisorEngagements.map(eng => (
                                <div key={eng.id} className="flex items-center justify-between p-2 border rounded-lg">
                                    <div>
                                       <p className="font-semibold text-sm">with {eng.developerName}</p>
                                       <p className="text-sm">Status: <span className={`font-medium ${getStatusColor(eng.status)}`}>{eng.status}</span></p>
                                    </div>
                                    {eng.status === 'rejected' ? (
                                        <Button variant="outline" onClick={() => handleViewMessage(eng.message, eng.developerName, true)}>View Message</Button>
                                    ) : (
                                        <Button asChild><Link href={`/engagements/${eng.id}`}>View</Link></Button>
                                    )}
                                </div>
                            )) : (
                                <p className="text-sm text-muted-foreground">You have no active or past engagements.</p>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}

            <Dialog open={showMessageModal} onOpenChange={setShowMessageModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{modalTitle}</DialogTitle>
                        <DialogDescription className="whitespace-pre-wrap pt-4">{modalMessage}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button onClick={() => setShowMessageModal(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
