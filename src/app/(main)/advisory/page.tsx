'use client';

import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { PublicAdvisorProfile, UserProfile } from '@/types';
import { useAuth } from '@/lib/hooks/use-auth';
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
import { countries } from '@/lib/constants';
import { MultiSelect, Option } from '@/components/ui/multi-select';

const AdvisorHubPage = () => {
    const { user } = useAuth();
    const [advisors, setAdvisors] = useState<PublicAdvisorProfile[]>([]);
    const [filteredAdvisors, setFilteredAdvisors] = useState<PublicAdvisorProfile[]>([]);
    const [specialties, setSpecialties] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
    const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
    const [selectedAdvisor, setSelectedAdvisor] = useState<PublicAdvisorProfile | null>(null);

    const getAsArray = (data: string | string[] | undefined | null): string[] => {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (typeof data === 'string') return data.split(',').map(s => s.trim()).filter(Boolean);
        return [];
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
                const fetchedAdvisors: PublicAdvisorProfile[] = [];
                const allSpecialties = new Set<string>();
                querySnapshot.forEach((doc) => {
                    const advisor = doc.data() as PublicAdvisorProfile;
                    if (!allBlockedIds.includes(advisor.uid)) {
                        fetchedAdvisors.push(advisor);
                        getAsArray(advisor.specialties).forEach(spec => allSpecialties.add(spec));
                    }
                });
                setAdvisors(fetchedAdvisors);
                setSpecialties(Array.from(allSpecialties).sort());
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

        if (selectedCountries.length > 0) {
            const lowerSelectedCountries = selectedCountries.map(c => c.toLowerCase());
            const naCountries = ['canada', 'united states of america', 'mexico'];

            filtered = filtered.filter(adv => {
                if (!adv.country) return false;
                const advisorCountry = adv.country.toLowerCase();

                if (lowerSelectedCountries.includes(advisorCountry)) {
                    return true;
                }

                if (lowerSelectedCountries.includes('na (north america)') && naCountries.includes(advisorCountry)) {
                    return true;
                }
                
                return false;
            });
        }

        setFilteredAdvisors(filtered);

    }, [searchTerm, selectedSpecialties, selectedCountries, advisors]);


    if (loading) {
        return <div className="flex justify-center items-center h-screen">Loading advisors...</div>;
    }

    const specialtyOptions: Option[] = specialties.map(s => ({ label: s, value: s }));
    const countryOptions: Option[] = countries.map(c => ({ label: c, value: c }));

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="mb-8 text-center">
                <h1 className="text-2xl font-semibold leading-none tracking-tight">Expert Advisory Hub</h1>
                <p className="text-muted-foreground mt-2 text-sm">Connect with verified industry experts for structured, private consultations.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-8">
                <Input 
                    placeholder="Search by name, headline, or bio..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="md:col-span-1"
                />
                <MultiSelect
                    options={specialtyOptions}
                    selected={selectedSpecialties}
                    onChange={setSelectedSpecialties}
                    placeholder="Filter by specialty..."
                    className="md:col-span-1"
                />
                 <MultiSelect
                    options={countryOptions}
                    selected={selectedCountries}
                    onChange={setSelectedCountries}
                    placeholder="Filter by country..."
                    className="md:col-span-1"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {filteredAdvisors.map((advisor) => {
                    const advisorSpecialties = getAsArray(advisor.specialties);
                    return (
                        <Card 
                            key={advisor.uid} 
                            className="flex flex-col cursor-pointer hover:shadow-lg transition-shadow duration-300"
                            onClick={() => setSelectedAdvisor(advisor)}
                        >
                            <CardHeader className="flex-row items-start gap-4">
                                <Avatar className="w-16 h-16 border">
                                    <AvatarImage src={advisor.photoURL || undefined} alt={advisor.name || 'Advisor'} />
                                    <AvatarFallback>{(advisor.name || 'A')[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <CardTitle>
                                        <Link href={`/developers/${advisor.uid}`} onClick={(e) => e.stopPropagation()} className="hover:underline">
                                            {advisor.name}
                                        </Link>
                                    </CardTitle>
                                    <CardDescription>{advisor.headline}</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{advisor.bio}</p>
                                 <div className="flex flex-wrap gap-2">
                                    {advisorSpecialties.slice(0,3).map((spec: string) => (
                                        <Badge key={spec} variant="secondary">{spec}</Badge>
                                    ))}
                                    {advisorSpecialties.length > 3 && (
                                        <Badge variant="outline">+{advisorSpecialties.length - 3} more</Badge>
                                    )}
                                </div>
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
                                            <Link href={`/developers/${selectedAdvisor.uid}`} className="hover:underline">
                                                {selectedAdvisor.name}
                                            </Link>
                                        </DialogTitle>
                                        <DialogDescription>{selectedAdvisor.headline}</DialogDescription>
                                    </div>
                                </div>
                            </DialogHeader>

                            <div className="grid gap-2 py-4 overflow-y-auto px-6">
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
                            </div>
                            
                            <DialogFooter className="mt-auto pt-4 border-t">
                                {user?.uid !== selectedAdvisor.uid && (
                                    <Button asChild className="w-full sm:w-auto" size="lg">
                                        <Link href={`/advisory/${selectedAdvisor.uid}/request`}>Request Engagement</Link>
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
