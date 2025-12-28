'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, addDoc, collection, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db as firestore } from '@/lib/firebase/config';
import { useAuth } from '@/lib/hooks/use-auth';
import { Engagement, AdvisorReview } from '@/types/advisor';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Star } from 'lucide-react';

const ReviewPage = () => {
    const { engagementId } = useParams();
    const { user } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [engagement, setEngagement] = useState<Engagement | null>(null);
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [alreadyReviewed, setAlreadyReviewed] = useState(false);

    useEffect(() => {
        if (typeof engagementId !== 'string' || !user) return;

        const checkExistingReview = async () => {
            const reviewQuery = query(
                collection(firestore, 'advisor_reviews'), 
                where('engagementId', '==', engagementId),
                where('developerId', '==', user.uid)
            );
            const reviewSnapshot = await getDocs(reviewQuery);
            if (!reviewSnapshot.empty) {
                setAlreadyReviewed(true);
            }
        };

        const fetchEngagement = async () => {
            const engagementDoc = await getDoc(doc(firestore, 'engagements', engagementId));
            if (engagementDoc.exists()) {
                const engData = { id: engagementDoc.id, ...engagementDoc.data() } as Engagement;
                setEngagement(engData);

                if (engData.status !== 'closed' || engData.developerId !== user.uid) {
                     toast({ variant: 'destructive', title: 'Invalid Action', description: 'You can only review closed engagements you were a part of.'});
                     router.push('/dashboard');
                }
            } else {
                router.push('/dashboard');
            }
        };
        
        const loadData = async () => {
            setLoading(true);
            await Promise.all([checkExistingReview(), fetchEngagement()]);
            setLoading(false);
        }

        loadData();

    }, [engagementId, user, router, toast]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !engagement || rating === 0 || !comment.trim()) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please provide a rating and a comment.'});
            return;
        }

        const reviewData: Omit<AdvisorReview, 'id'> = {
            engagementId: engagement.id,
            developerId: user.uid,
            advisorId: engagement.advisorId,
            rating: rating as 1 | 2 | 3 | 4 | 5,
            comment,
            createdAt: serverTimestamp(),
        };

        try {
            await addDoc(collection(firestore, 'advisor_reviews'), reviewData);
            toast({ title: 'Review Submitted', description: 'Thank you for your feedback!' });
            router.push(`/advisory/${engagement.advisorId}`);
        } catch (error) {
            console.error("Error submitting review:", error);
            toast({ variant: 'destructive', title: 'Submission Failed', description: 'Could not submit your review.' });
        }
    };
    
    if (loading) return <div>Loading...</div>

    if (alreadyReviewed) {
        return (
             <div className="container mx-auto p-4 text-center">
                <Card className="max-w-md mx-auto">
                    <CardHeader>
                        <CardTitle>Already Reviewed</CardTitle>
                        <CardDescription>You have already submitted a review for this engagement.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => router.push(`/advisory/${engagement?.advisorId}`)}>View Advisor Profile</Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="container mx-auto p-4">
            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle>Leave a Review for {engagement?.advisorInfo.name}</CardTitle>
                    <CardDescription>Your feedback helps other developers make informed decisions.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="font-semibold mb-2 block">Rating</label>
                            <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star 
                                        key={star}
                                        className={`cursor-pointer h-8 w-8 ${ (hoverRating || rating) >= star ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                                        onClick={() => setRating(star)}
                                        onMouseEnter={() => setHoverRating(star)}
                                        onMouseLeave={() => setHoverRating(0)}
                                    />
                                ))}
                            </div>
                        </div>
                        <div>
                            <label htmlFor="comment" className="font-semibold mb-2 block">Comment</label>
                            <Textarea
                                id="comment"
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Share your experience with this advisor..."
                                rows={6}
                                required
                            />
                        </div>
                        <Button type="submit" disabled={rating === 0 || !comment.trim()}>Submit Review</Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default ReviewPage;
