'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db as firestore } from '@/lib/firebase/config';
import { UserProfile } from '@/types';
import { AdvisorReview } from '@/types/advisor';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';
import { checkBlockStatus } from '@/lib/firebase/users';
import { useToast } from '@/hooks/use-toast';

const AdvisorProfilePage = () => {
    const { advisorId } = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { user, loading: authLoading } = useAuth();
    const [advisor, setAdvisor] = useState<UserProfile | null>(null);
    const [reviews, setReviews] = useState<AdvisorReview[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (typeof advisorId !== 'string' || !user) {
            if (!authLoading) setLoading(false);
            return;
        };

        const fetchAdvisorAndReviews = async () => {
            setLoading(true);

            const isBlocked = await checkBlockStatus(user.uid, advisorId);
            if (isBlocked) {
                toast({ variant: 'destructive', title: 'Access Denied', description: "You cannot view this advisor's profile." });
                router.push('/advisory');
                return;
            }

            const advisorDoc = await getDoc(doc(firestore, 'users', advisorId));
            if (advisorDoc.exists()) {
                const advisorData = { uid: advisorDoc.id, ...advisorDoc.data() } as UserProfile;
                if (!advisorData.roles?.advisor) {
                    toast({ variant: 'destructive', title: 'Not an Advisor', description: 'This user is not registered as an advisor.' });
                    router.push('/developers'); // Redirect to a more general page
                    return;
                }
                setAdvisor(advisorData);
            } else {
                toast({ variant: 'destructive', title: 'Not Found', description: 'This advisor profile could not be found.' });
                router.push('/advisory');
                return;
            }

            const reviewsQuery = query(
                collection(firestore, 'advisor_reviews'), 
                where('advisorId', '==', advisorId),
                orderBy('createdAt', 'desc')
            );
            const reviewsSnapshot = await getDocs(reviewsQuery);
            const fetchedReviews: AdvisorReview[] = [];
            reviewsSnapshot.forEach(doc => fetchedReviews.push({ id: doc.id, ...doc.data() } as AdvisorReview));
            setReviews(fetchedReviews);

            setLoading(false);
        };

        fetchAdvisorAndReviews();
    }, [advisorId, user, authLoading, router, toast]);

    const renderStars = (rating: number) => {
        return Array(5).fill(0).map((_, i) => (
            <Star key={i} className={`h-5 w-5 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
        ));
    }

    if (loading || authLoading) {
        return <div className="container mx-auto p-4"><p>Loading advisor profile...</p></div>;
    }

    if (!user) {
        return <div className="container mx-auto p-4"><p>Please log in to view advisor profiles.</p></div>;
    }

    if (!advisor) {
        // This case is mostly handled by the redirects in useEffect, but it's a good fallback.
        return <div className="container mx-auto p-4"><p>Advisor not found.</p></div>;
    }

    return (
        <div className="container mx-auto p-4 space-y-8">
            <Card>
                 <CardHeader className="flex-row items-start gap-4">
                    <Avatar className="w-24 h-24 border">
                        <AvatarImage src={advisor.photoURL} alt={advisor.name || 'Advisor'} />
                        <AvatarFallback className="text-3xl">{(advisor.name || 'A')[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <CardTitle className="text-3xl font-bold">{advisor.name || 'Unnamed Advisor'}</CardTitle>
                        <CardDescription className="text-xl">{advisor.advisorProfile?.headline}</CardDescription>
                         <div className="flex flex-wrap gap-2 mt-4">
                            {advisor.advisorProfile?.specialties?.map((spec) => (
                                <Badge key={spec}>{spec}</Badge>
                            ))}
                        </div>
                    </div>
                    <Button asChild><Link href={`/advisory/${advisor.uid}/request`}>Request Engagement</Link></Button>
                </CardHeader>
                <CardContent>
                    <div>
                        <h3 className="text-lg font-semibold">About Me</h3>
                        <p className="text-muted-foreground mt-1">{advisor.advisorProfile?.bio}</p>
                    </div>
                     <div className="mt-6">
                        <h3 className="text-lg font-semibold">Credentials</h3>
                        <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                            {advisor.advisorProfile?.credentials?.map((cred, i) => <li key={i}>{cred}</li>)}
                        </ul>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Feedback & Reviews</CardTitle>
                     <CardDescription>
                        {reviews.length > 0 
                            ? `See what other developers have to say about ${advisor.name || 'this advisor'}.`
                            : `No reviews yet. Be the first to leave feedback after an engagement.`}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {reviews.map(review => (
                        <div key={review.id} className="border-b pb-6 last:border-b-0">
                            <div className="flex items-center mb-2">
                                <div className="flex">{renderStars(review.rating)}</div>
                                <p className="ml-auto text-sm text-muted-foreground">{review.createdAt instanceof Timestamp ? new Date(review.createdAt.seconds * 1000).toLocaleDateString() : ''}</p>
                            </div>
                            <p className="text-muted-foreground">{review.comment}</p>
                            {review.advisorResponse && (
                                <div className="mt-4 bg-muted/50 p-4 rounded-lg">
                                    <p className="font-semibold text-sm">Response from {advisor.name || 'this advisor'}</p>
                                     <p className="text-muted-foreground text-sm mt-1">{review.advisorResponse}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
};

export default AdvisorProfilePage;
