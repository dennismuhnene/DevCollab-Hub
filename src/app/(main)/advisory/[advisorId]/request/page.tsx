'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { doc, getDoc, addDoc, collection, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db as firestore } from '@/lib/firebase/config';
import { useAuth } from '@/lib/hooks/use-auth';
import { PublicAdvisorProfile, AdvisorApplication } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { checkBlockStatus } from '@/lib/firebase/users';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

const EngagementRequestPage = () => {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const advisorId = params.advisorId as string;
    const applicationId = searchParams.get('applicationId');
    const { user, userProfile } = useAuth();
    const { toast } = useToast();

    const [advisor, setAdvisor] = useState<PublicAdvisorProfile | null>(null);
    const [application, setApplication] = useState<AdvisorApplication | null>(null);
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [proposedTimeline, setProposedTimeline] = useState('');
    const [constraints, setConstraints] = useState('');
    const [selectedDeliverables, setSelectedDeliverables] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [existingEngagementId, setExistingEngagementId] = useState<string | null>(null);

    useEffect(() => {
        const fetchAdvisorAndCheckEngagement = async () => {
            if (advisorId && user && applicationId) {
                setLoading(true);
                try {
                    const isBlocked = await checkBlockStatus(user.uid, advisorId);
                    if (isBlocked) {
                        toast({ variant: 'destructive', title: 'Action Not Allowed', description: 'You cannot request an engagement with this advisor.' });
                        router.push('/advisory');
                        return;
                    }

                    const engagementsRef = collection(firestore, 'engagements');
                    const q = query(
                        engagementsRef,
                        where('developerId', '==', user.uid),
                        where('advisorId', '==', advisorId),
                        where('status', 'in', ['requested', 'active', 'pending_proposal', 'pending_developer_acceptance', 'revision_requested'])
                    );
                    const querySnapshot = await getDocs(q);
                    if (!querySnapshot.empty) {
                        setExistingEngagementId(querySnapshot.docs[0].id);
                    }

                    const advisorDocRef = doc(firestore, 'publicAdvisorProfiles', advisorId);
                    const appDocRef = doc(firestore, `users/${advisorId}/advisorApplications/${applicationId}`);
                    
                    const [advisorDocSnap, appDocSnap] = await Promise.all([getDoc(advisorDocRef), getDoc(appDocRef)]);

                    if (advisorDocSnap.exists()) {
                        setAdvisor({ uid: advisorDocSnap.id, ...advisorDocSnap.data() } as PublicAdvisorProfile);
                    } else {
                        throw new Error("Advisor not found.");
                    }
                    
                    if (appDocSnap.exists()) {
                        const appData = appDocSnap.data() as Omit<AdvisorApplication, 'id'>;
                        if (appData.verificationStatus !== 'verified') {
                            throw new Error("This specific advisor profile is not active.");
                        }
                        setApplication({ id: appDocSnap.id, ...appData });
                    } else {
                        throw new Error("Advisor application not found.");
                    }

                } catch (error) {
                    console.error("Error fetching data:", error);
                    toast({ variant: 'destructive', title: 'Error', description: (error as Error).message || 'Could not load page details.' });
                    router.back();
                } finally {
                    setLoading(false);
                }
            }
        };

        if (!applicationId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Advisor application not specified.' });
            router.back();
            return;
        }

        fetchAdvisorAndCheckEngagement();
    }, [advisorId, user, applicationId, toast, router]);

    const handleRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !userProfile || !advisor || !applicationId || !subject || selectedDeliverables.length === 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please fill out the subject and select at least one deliverable.' });
            return;
        }

        try {
            const engagementData = {
                developerId: user.uid,
                developerName: userProfile.name || 'Anonymous',
                developerPhotoURL: userProfile.photoURL || '',
                advisorId: advisor.uid,
                advisorName: advisor.name,
                advisorPhotoURL: advisor.photoURL || '',
                advisorHeadline: advisor.headline,
                advisorApplicationId: applicationId,
                message: "", // Legacy message field, now part of developerRequest
                status: 'pending_proposal', 
                createdAt: serverTimestamp(),
                developerRequest: {
                    subject: subject,
                    message: message,
                    selectedDeliverables: selectedDeliverables,
                    proposedTimeline: proposedTimeline,
                    constraints: constraints,
                },
            };

            await addDoc(collection(firestore, 'engagements'), engagementData);
            toast({ title: 'Request Sent', description: 'Your proposal request has been sent to the advisor.' });
            router.push('/dashboard');
        } catch (error) {
            console.error('Error creating engagement:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to send engagement request.' });
        }
    };

    const handleDeliverableChange = (deliverable: string) => {
        setSelectedDeliverables(prev => 
            prev.includes(deliverable) 
                ? prev.filter(item => item !== deliverable) 
                : [...prev, deliverable]
        );
    };

    if (loading || !advisor || !userProfile) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (existingEngagementId) {
        return (
            <Dialog open={true} onOpenChange={(isOpen) => !isOpen && router.back()}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Existing Engagement</DialogTitle>
                        <DialogDescription>
                            You already have an engagement process with this advisor. You can view the engagement or close this window.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => router.back()}>Close</Button>
                        <Button asChild>
                             <Link href={`/engagements/${existingEngagementId}`}>View Engagement</Link>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={true} onOpenChange={(isOpen) => !isOpen && router.back()}>
            <DialogContent className="sm:max-w-[425px] md:max-w-[600px] lg:max-w-[800px] max-h-[90vh] flex flex-col">
                <form onSubmit={handleRequest} className="flex flex-col flex-grow min-h-0">
                    <DialogHeader className="px-6 pt-6">
                        <div className="flex items-start gap-4">
                            <Avatar className="w-16 h-16 border">
                                <AvatarImage src={advisor.photoURL || undefined} alt={advisor.name || 'Advisor'} />
                                <AvatarFallback>{(advisor.name || 'A')[0]}</AvatarFallback>
                            </Avatar>
                            <div className="pt-1 flex-grow">
                                <DialogTitle className="text-xl">Request an Engagement with {advisor.name}</DialogTitle>
                                <DialogDescription>{advisor.headline}</DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="grid gap-6 py-4 px-6 overflow-y-auto flex-grow">
                        <div>
                             <h3 className="font-semibold text-base mb-2">Subject</h3>
                             <Input
                                id="subject"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="e.g., 'Mentorship on AI Strategy'"
                                maxLength={37}
                                required
                            />
                            <p className="text-sm text-muted-foreground mt-1 text-right">{subject.length} / 37</p>
                        </div>

                        <div>
                            <h3 className="font-semibold text-base mb-2">What do you need help with?</h3>
                            <Textarea
                                id="message"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder={`Introduce yourself and what you'd like to accomplish...`}
                                rows={4}
                                maxLength={2000}
                                required
                            />
                            <p className="text-sm text-muted-foreground mt-1 text-right">{message.length} / 2000</p>
                        </div>

                        {application?.standardDeliverables && application.standardDeliverables.length > 0 && (
                            <div>
                                <h3 className="font-semibold text-base mb-3">Select from Advisor's Standard Deliverables</h3>
                                <div className="space-y-3">
                                    {application.standardDeliverables.map((deliverable) => (
                                        <div key={deliverable} className="flex items-center space-x-3">
                                            <Checkbox 
                                                id={deliverable} 
                                                onCheckedChange={() => handleDeliverableChange(deliverable)}
                                                checked={selectedDeliverables.includes(deliverable)}
                                            />
                                            <Label htmlFor={deliverable} className="font-normal leading-snug">{deliverable}</Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        <div>
                            <h3 className="font-semibold text-base mb-2">Proposed Timeline</h3>
                             <Input
                                id="timeline"
                                value={proposedTimeline}
                                onChange={(e) => setProposedTimeline(e.target.value)}
                                placeholder="e.g., 'Within 2 weeks', 'Flexible', 'ASAP'" 
                                required
                            />
                        </div>

                        <div>
                            <h3 className="font-semibold text-base mb-2">Constraints or Special Considerations (Optional)</h3>
                            <Textarea
                                id="constraints"
                                value={constraints}
                                onChange={(e) => setConstraints(e.target.value)}
                                placeholder="e.g., 'Budget limitations', 'Specific technologies to use', 'Weekly check-ins required'" 
                                rows={3}
                            />
                        </div>
                    </div>
                    
                    <DialogFooter className="mt-auto pt-4 border-t px-6 pb-6">
                        <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
                        <Button type="submit" size="lg" disabled={loading || !subject || selectedDeliverables.length === 0}>Send Request</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default EngagementRequestPage;
