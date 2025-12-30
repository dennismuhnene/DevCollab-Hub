'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db as firestore } from '@/lib/firebase/config';
import { useAuth } from '@/lib/hooks/use-auth';
import { PublicAdvisorProfile } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';

const EngagementRequestPage = () => {
    const params = useParams();
    const router = useRouter();
    const advisorId = params.advisorId as string;
    const { user } = useAuth();
    const { toast } = useToast();

    const [advisor, setAdvisor] = useState<PublicAdvisorProfile | null>(null);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);

    // Helper to safely get arrays from profile data
    const getAsArray = (data: string | string[] | undefined | null): string[] => {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (typeof data === 'string') return data.split(',').map(s => s.trim()).filter(Boolean);
        return [];
    };

    useEffect(() => {
        const fetchAdvisor = async () => {
            if (advisorId) {
                setLoading(true);
                try {
                    const advisorDocRef = doc(firestore, 'publicAdvisorProfiles', advisorId);
                    const advisorDocSnap = await getDoc(advisorDocRef);

                    if (advisorDocSnap.exists()) {
                        setAdvisor({ uid: advisorDocSnap.id, ...advisorDocSnap.data() } as PublicAdvisorProfile);
                    } else {
                        console.log('No such advisor profile!');
                        setAdvisor(null);
                        toast({ variant: 'destructive', title: 'Error', description: 'Advisor not found.' });
                        router.back();
                    }
                } catch (error) {
                    console.error("Error fetching advisor profile:", error);
                    toast({ variant: 'destructive', title: 'Error', description: 'Could not load advisor details.' });
                    router.back();
                }
                setLoading(false);
            }
        };

        fetchAdvisor();
    }, [advisorId, toast, router]);

    const handleRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !advisor) {
            toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to send a request.' });
            return;
        }

        try {
            const engagementData = {
                developerId: user.uid,
                developerName: user.displayName || 'Anonymous',
                developerPhotoURL: user.photoURL,
                advisorId: advisor.uid,
                advisorName: advisor.name,
                advisorPhotoURL: advisor.photoURL,
                message,
                status: 'requested',
                createdAt: serverTimestamp(),
            };

            await addDoc(collection(firestore, 'engagements'), engagementData);
            toast({ title: 'Request Sent', description: 'Your engagement request has been sent to the advisor.' });
            router.push('/dashboard');
        } catch (error) {
            console.error('Error creating engagement:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to send engagement request.' });
        }
    };

    if (loading || !advisor) {
        // Provide a minimal loading state that fits the modal-like feel
        return <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center h-screen w-screen">Loading...</div>;
    }
    
    const modalSpecialties = getAsArray(advisor.specialties);
    const modalCredentials = getAsArray(advisor.credentials);

    return (
        <Dialog open={true} onOpenChange={(isOpen) => !isOpen && router.back()}>
            <DialogContent className="sm:max-w-[425px] md:max-w-[600px] lg:max-w-[800px] max-h-[90vh] flex flex-col">
                <form onSubmit={handleRequest} className="flex flex-col flex-grow min-h-0">
                    <DialogHeader className="pr-12">
                        <div className="flex items-start gap-4">
                            <Avatar className="w-20 h-20 border">
                                <AvatarImage src={advisor.photoURL || undefined} alt={advisor.name || 'Advisor'} />
                                <AvatarFallback>{(advisor.name || 'A')[0]}</AvatarFallback>
                            </Avatar>
                            <div className="pt-2 flex-grow">
                                <DialogTitle className="text-2xl">Request an Engagement with {advisor.name}</DialogTitle>
                                <DialogDescription>{advisor.headline}</DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="grid gap-4 py-4 overflow-y-auto px-6 flex-grow">
                        <div>
                            <h3 className="font-semibold text-lg mb-2">About Me</h3>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{advisor.bio}</p>
                        </div>
                        
                        {modalSpecialties.length > 0 && (
                            <div>
                                <h3 className="font-semibold text-lg mb-2">Specialties</h3>
                                <div className="flex flex-wrap gap-2">
                                    {modalSpecialties.map((spec: string) => (
                                        <Badge key={spec} variant="secondary">{spec}</Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {modalCredentials.length > 0 && (
                            <div>
                                <h3 className="font-semibold text-lg mb-2">Credentials</h3>
                                <div className="flex flex-wrap gap-2">
                                    {modalCredentials.map((cred: string) => (
                                        <Badge key={cred} variant="outline">{cred}</Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                         <div>
                            <h3 className="font-semibold text-lg mb-2 mt-4">Your Message</h3>
                            <Textarea
                                id="message"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder={`Introduce yourself and what you'd like to discuss with ${advisor.name}...`}
                                rows={6}
                                required
                            />
                        </div>
                    </div>
                    
                    <DialogFooter className="mt-auto pt-4 border-t">
                        <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
                        <Button type="submit" size="lg">Send Request</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default EngagementRequestPage;
