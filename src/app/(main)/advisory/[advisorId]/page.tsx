'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db as firestore } from '@/lib/firebase/config';
import { UserProfile } from '@/types';
import { AdvisorApplication, AdvisorReview } from '@/types/advisor';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Star, Loader2, BadgeCheck } from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';
import { checkBlockStatus } from '@/lib/firebase/users';
import { useToast } from '@/hooks/use-toast';

type ProfileData = {
    application: AdvisorApplication;
    reviews: AdvisorReview[];
};

const AdvisorProfilePage = () => {
    const { advisorId } = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { user, loading: authLoading } = useAuth();

    const [advisor, setAdvisor] = useState<UserProfile | null>(null);
    const [profileData, setProfileData] = useState<Map<string, ProfileData>>(new Map());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (typeof advisorId !== 'string' || authLoading) return;

        const fetchProfileData = async () => {
            setLoading(true);
            try {
                if (user) {
                    const isBlocked = await checkBlockStatus(user.uid, advisorId);
                    if (isBlocked) {
                        toast({ variant: 'destructive', title: 'Access Denied', description: "You cannot view this advisor's profile." });
                        router.push('/advisory');
                        return;
                    }
                }
                
                const advisorDocRef = doc(firestore, 'users', advisorId);
                const applicationsCollectionRef = collection(firestore, 'users', advisorId, 'advisorApplications');
                const reviewsCollectionRef = collection(firestore, 'advisor_reviews');

                const [advisorDoc, applicationsSnapshot, reviewsSnapshot] = await Promise.all([
                    getDoc(advisorDocRef),
                    getDocs(query(
                        applicationsCollectionRef, 
                        where('verificationStatus', '==', 'verified')
                    )),
                    getDocs(query(
                        reviewsCollectionRef,
                        where('advisorId', '==', advisorId),
                        orderBy('createdAt', 'desc')
                    ))
                ]);

                if (!advisorDoc.exists() || !advisorDoc.data().roles?.advisor) {
                    toast({ variant: 'destructive', title: 'Not Found', description: 'This advisor profile could not be found.' });
                    router.push('/advisory');
                    return;
                }

                const advisorData = { uid: advisorDoc.id, ...advisorDoc.data() } as UserProfile;
                setAdvisor(advisorData);

                const fetchedReviews: AdvisorReview[] = [];
                reviewsSnapshot.forEach(doc => fetchedReviews.push({ id: doc.id, ...doc.data() } as AdvisorReview));

                const newProfileData = new Map<string, ProfileData>();
                applicationsSnapshot.forEach(appDoc => {
                    const appData = { id: appDoc.id, ...appDoc.data() } as AdvisorApplication;
                    newProfileData.set(appDoc.id, { application: appData, reviews: [] });
                });

                fetchedReviews.forEach(review => {
                    const { advisorApplicationId } = review;
                    if (advisorApplicationId && newProfileData.has(advisorApplicationId)) {
                        newProfileData.get(advisorApplicationId)!.reviews.push(review);
                    }
                });

                setProfileData(newProfileData);

            } catch (error) {
                console.error("Error fetching profile data:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to load advisor profile.' });
            } finally {
                setLoading(false);
            }
        };

        fetchProfileData();
    }, [advisorId, user, authLoading, router, toast]);

    const renderStars = (rating: number) => (
        Array(5).fill(0).map((_, i) => (
            <Star key={i} className={`h-5 w-5 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
        ))
    );

    if (loading || authLoading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!advisor) {
        return null; 
    }

    return (
        <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <Card className="overflow-hidden">
                <CardHeader className="flex-col sm:flex-row items-start gap-4 p-6">
                    <Avatar className="w-24 h-24 border-2 shadow-sm">
                        <AvatarImage src={advisor.photoURL} alt={advisor.name || 'Advisor'} />
                        <AvatarFallback className="text-3xl">{(advisor.name || 'A')[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 pt-2">
                        <CardTitle className="text-xl sm:text-2xl font-bold">
                            <Link href={`/developers/${advisorId}`} className="hover:underline">
                                {advisor.name || 'Unnamed Advisor'}
                            </Link>
                        </CardTitle>
                        <CardDescription className="text-base text-muted-foreground mt-1">Advisor Profile</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-4">
                    <div>
                        <h2 className="text-lg font-bold tracking-tight mb-6 flex items-center">
                            <BadgeCheck className="h-7 w-7 text-primary mr-3" />
                            Verified Specializations
                        </h2>
                        {profileData.size === 0 ? (
                            <Card className="text-center py-12 px-6">
                                <CardTitle className="text-lg font-medium">No Verified Specializations</CardTitle>
                                <CardDescription className="mt-2 text-sm">This advisor has not set up any public specializations yet. Check back later!</CardDescription>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                                {Array.from(profileData.entries()).map(([appId, data]) => (
                                    <Card key={appId} className="flex flex-col">
                                        <CardHeader>
                                            <CardTitle className="text-base">{data.application.headline}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="flex-grow space-y-6">
                                            <div>
                                                <h4 className="font-semibold text-sm mb-2">About this Specialization</h4>
                                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{data.application.bio}</p>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-sm mb-2">Area of Expertise</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {Array.isArray(data.application.specialties) ? data.application.specialties.map(spec => <Badge key={spec} variant="secondary">{spec}</Badge>) : <Badge variant="secondary">{data.application.specialties}</Badge>}
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-sm mb-2">Credentials</h4>
                                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{Array.isArray(data.application.credentials) ? data.application.credentials.join('\n') : data.application.credentials}</p>
                                            </div>
                                        </CardContent>
                                        <div className="p-6 pt-0">
                                            <Button asChild className="w-full">
                                                <Link href={`/advisory/${advisorId}/request?applicationId=${appId}`}>Request Engagement</Link>
                                            </Button>
                                        </div>
                                        <div className="p-6 border-t">
                                            <h3 className="text-base font-semibold mb-4">Feedback</h3>
                                            <div className="space-y-6">
                                                {data.reviews.length > 0 ? data.reviews.map(review => (
                                                    <div key={review.id} className="border-b border-dashed pb-6 last:border-b-0">
                                                        <div className="flex items-center mb-2">
                                                            <div className="flex">{renderStars(review.rating)}</div>
                                                            <p className="ml-auto text-xs text-muted-foreground">
                                                                {review.createdAt instanceof Timestamp ? new Date(review.createdAt.seconds * 1000).toLocaleDateString() : ''}
                                                            </p>
                                                        </div>
                                                        <p className="text-sm text-muted-foreground italic">{`"${review.comment}"`}</p>
                                                    </div>
                                                )) : (
                                                    <p className="text-sm text-muted-foreground text-center py-4">No reviews for this specialization yet.</p>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default AdvisorProfilePage;
