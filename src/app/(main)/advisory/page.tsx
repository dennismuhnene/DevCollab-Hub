'use client';

import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { PublicAdvisorProfile, UserProfile } from '@/types';
import { useAuth } from '@/lib/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { TagInput } from '@/components/ui/tag-input';
import { SlidersHorizontal, X, CheckSquare } from 'lucide-react';
import { AdvisorCardSkeleton } from '@/components/skeletons/advisor-card-skeleton';

interface DisplayAdvisorProfile extends PublicAdvisorProfile {
    advisorApplicationId: string;
}

const AdvisorHubPage = () => {
    const { user } = useAuth();
    const router = useRouter();
    const [advisors, setAdvisors] = useState<DisplayAdvisorProfile[]>([]);
    const [filteredAdvisors, setFilteredAdvisors] = useState<DisplayAdvisorProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
    const [selectedCredentials, setSelectedCredentials] = useState<string[]>([]);
    const [selectedAdvisor, setSelectedAdvisor] = useState<DisplayAdvisorProfile | null>(null);
    const [showFilters, setShowFilters] = useState(false);

    const getAsArray = (data: string | string[] | undefined | null): string[] => {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (typeof data === 'string') return data.split(',').map(s => s.trim()).filter(Boolean);
        return [];
    };

    const resetFilters = () => {
        setSearchTerm('');
        setSelectedSpecialties([]);
        setSelectedCredentials([]);
    };

    useEffect(() => {
        if (!user) return;
        setLoading(true);

        const fetchBlockedUsersAndAdvisors = async () => {
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            const currentUserData = userDoc.data() as UserProfile;
            const blockedUsers = currentUserData?.blockedUsers || [];
            const blockedBy = currentUserData?.blockedBy || [];
            const allBlockedIds = [...blockedUsers, ...blockedBy];

            const q = query(collection(db, 'publicAdvisorProfiles'));
            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                const fetchedAdvisors: DisplayAdvisorProfile[] = [];
                querySnapshot.forEach((doc) => {
                    const advisor = doc.data() as PublicAdvisorProfile;
                    if (!allBlockedIds.includes(advisor.uid) && advisor.activeAdvisorApplicationId) {
                        fetchedAdvisors.push({ 
                            ...advisor, 
                            advisorApplicationId: advisor.activeAdvisorApplicationId 
                        } as DisplayAdvisorProfile);
                    }
                });
                setAdvisors(fetchedAdvisors);
                setLoading(false);
            }, (error) => {
                console.error("Error listening for advisor profiles:", error);
                setLoading(false);
            });
            return unsubscribe;
        };

        const unsubscribePromise = fetchBlockedUsersAndAdvisors();

        return () => {
            unsubscribePromise.then(unsub => unsub && unsub());
        };
    }, [user]);

    useEffect(() => {
        let filtered = advisors;

        if (searchTerm) {
            filtered = filtered.filter(adv => 
                (adv.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                adv.headline.toLowerCase().includes(searchTerm.toLowerCase()) ||
                adv.bio.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (selectedSpecialties.length > 0) {
            filtered = filtered.filter(adv => {
                const advisorSpecialties = getAsArray(adv.specialties).map(s => s.toLowerCase());
                return selectedSpecialties.some(selSpec => advisorSpecialties.includes(selSpec.toLowerCase()));
            });
        }

        if (selectedCredentials.length > 0) {
            filtered = filtered.filter(adv => {
                const advisorCredentials = getAsArray(adv.credentials).map(c => c.toLowerCase());
                return selectedCredentials.some(selCred => advisorCredentials.includes(selCred.toLowerCase()));
            });
        }

        setFilteredAdvisors(filtered);

    }, [searchTerm, selectedSpecialties, selectedCredentials, advisors]);


    if (loading) {
        return (
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <div className="mb-8 text-center">
                    <h1 className="text-2xl font-semibold leading-none tracking-tight">Expert Advisory Hub</h1>
                    <p className="text-muted-foreground mt-2 text-sm">Connect with verified industry experts for structured, private consultations.</p>
                </div>
                <div className="mb-4">
                    <Button variant="outline" disabled>
                        <SlidersHorizontal className="mr-2 h-4 w-4" />
                        Filter
                    </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, index) => (
                        <AdvisorCardSkeleton key={index} />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="mb-8 text-center">
                <h1 className="text-2xl font-semibold leading-none tracking-tight">Expert Advisory Hub</h1>
                <p className="text-muted-foreground mt-2 text-sm">Connect with verified industry experts for structured, private consultations.</p>
            </div>

            <div className="mb-4">
                <Button onClick={() => setShowFilters(!showFilters)} variant="outline">
                    <SlidersHorizontal className="mr-2 h-4 w-4" />
                    Filter
                </Button>
            </div>

            {showFilters && (
                <Card className="mb-8 relative">
                     <Button
                        onClick={() => setShowFilters(false)}
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                    <CardHeader>
                        <CardTitle>Filter Advisors</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Input 
                            placeholder="Search by name, headline, or bio..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <TagInput
                            value={selectedSpecialties}
                            onChange={setSelectedSpecialties}
                            placeholder="Filter by specialty..."
                        />
                        <TagInput
                            value={selectedCredentials}
                            onChange={setSelectedCredentials}
                            placeholder="Filter by credentials..."
                        />
                        <Button onClick={resetFilters} variant="ghost" className="w-full">
                            <X className="mr-2 h-4 w-4" />
                            Reset Filters
                        </Button>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAdvisors.map((advisor) => {
                    const advisorSpecialties = getAsArray(advisor.specialties);
                    const advisorDeliverables = getAsArray(advisor.standardDeliverables);

                    return (
                        <Card 
                            key={advisor.uid} 
                            className="flex flex-col cursor-pointer hover:shadow-lg transition-shadow duration-300"
                            onClick={() => {
                                if (user && user.uid === advisor.uid) {
                                    router.push(`/advisory/${advisor.uid}`);
                                } else {
                                    setSelectedAdvisor(advisor);
                                }
                            }}
                        >
                            <CardHeader className="flex-row items-start gap-4">
                                <Avatar className="w-16 h-16 border">
                                    <AvatarImage src={advisor.photoURL || undefined} alt={advisor.name || 'Advisor'} />
                                    <AvatarFallback>{(advisor.name || 'A')[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <CardTitle className="text-lg font-semibold">
                                        <span className="hover:underline">
                                            {advisor.name}
                                        </span>
                                    </CardTitle>
                                    <CardDescription>{advisor.headline}</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-grow flex flex-col">
                                <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{advisor.bio}</p>
                                 <div className="flex flex-wrap gap-2">
                                    {advisorSpecialties.slice(0,3).map((spec: string) => (
                                        <Badge key={spec} variant="secondary">{spec}</Badge>
                                    ))}
                                    {advisorSpecialties.length > 3 && (
                                        <Badge variant="outline">+{advisorSpecialties.length - 3} more</Badge>
                                    )}
                                </div>

                                {advisorDeliverables && advisorDeliverables.length > 0 && (
                                    <div className="mt-auto pt-4">
                                        <h4 className="font-semibold text-xs text-muted-foreground mb-2 flex items-center"><CheckSquare className="h-3 w-3 mr-1.5" />COMMON DELIVERABLES</h4>
                                        <div className="flex flex-wrap gap-1">
                                            {advisorDeliverables.slice(0, 2).map((del: string) => (
                                                <Badge key={del} variant="outline" className="text-xs font-normal">{del}</Badge>
                                            ))}
                                            {advisorDeliverables.length > 2 && (
                                                <Badge variant="outline" className="text-xs font-normal">+{advisorDeliverables.length - 2} more</Badge>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

             {filteredAdvisors.length === 0 && !loading && (
                <div className="text-center py-16">
                    <p className="text-base font-semibold">No advisors found.</p>
                    <p className="text-muted-foreground text-sm">Try adjusting your search or filters.</p>
                </div>
            )}

            {selectedAdvisor && (() => {
                const modalSpecialties = getAsArray(selectedAdvisor.specialties);
                const modalCredentials = getAsArray(selectedAdvisor.credentials);
                const modalDeliverables = getAsArray(selectedAdvisor.standardDeliverables);

                return (
                    <Dialog open={!!selectedAdvisor} onOpenChange={(isOpen) => !isOpen && setSelectedAdvisor(null)}>
                        <DialogContent className="sm:max-w-[425px] md:max-w-[600px] lg:max-w-[800px] max-h-[90vh] flex flex-col">
                            <DialogHeader className="pr-12">
                                <div className="flex items-start gap-4">
                                    <Avatar className="w-20 h-20 border">
                                        <AvatarImage src={selectedAdvisor.photoURL || undefined} alt={selectedAdvisor.name || 'Advisor'} />
                                        <AvatarFallback>{(selectedAdvisor.name || 'A')[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="pt-2">
                                        <DialogTitle className="text-lg">
                                            <Link href={`/advisory/${selectedAdvisor.uid}`} className="hover:underline">
                                                {selectedAdvisor.name}
                                            </Link>
                                        </DialogTitle>
                                        <DialogDescription>{selectedAdvisor.headline}</DialogDescription>
                                    </div>
                                </div>
                            </DialogHeader>

                            <div className="grid gap-6 py-4 overflow-y-auto px-6">
                                <div>
                                    <h3 className="font-semibold text-base mb-2">About Me</h3>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedAdvisor.bio}</p>
                                </div>
                                
                                {modalSpecialties.length > 0 && (
                                    <div>
                                        <h3 className="font-semibold text-base mb-2">Specialties</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {modalSpecialties.map((spec: string) => (
                                                <Badge key={spec} variant="secondary">{spec}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {modalCredentials.length > 0 && (
                                    <div>
                                        <h3 className="font-semibold text-base mb-2">Credentials</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {modalCredentials.map((cred: string) => (
                                                <Badge key={cred} variant="outline">{cred}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {modalDeliverables && modalDeliverables.length > 0 && (
                                    <div>
                                        <h3 className="font-semibold text-base mb-2">Standard Deliverables</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {modalDeliverables.map((del: string) => (
                                                <Badge key={del}>{del}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <DialogFooter className="mt-auto pt-4 border-t">
                                {user?.uid !== selectedAdvisor.uid && (
                                     <Button asChild className="w-full sm:w-auto" size="lg">
                                        <Link href={`/advisory/${selectedAdvisor.uid}/request?applicationId=${selectedAdvisor.activeAdvisorApplicationId}`}>
                                            Request Engagement
                                        </Link>
                                    </Button>
                                )}
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                );
            })()}
        </div>
    );
};

export default AdvisorHubPage;
