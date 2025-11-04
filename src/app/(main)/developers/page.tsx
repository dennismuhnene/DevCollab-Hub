'use client';

import { useState, useEffect, useTransition } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/hooks/use-auth';
import type { UserProfile } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Search, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import DeveloperCard from '@/components/developer-card';
import { getUserRecommendations } from '@/ai/flows/get-user-recommendations';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

export default function DiscoverDevelopersPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const [allDevelopers, setAllDevelopers] = useState<UserProfile[]>([]);
  const [filteredDevelopers, setFilteredDevelopers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAiSorting, startAiSortTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;

    const fetchDevelopers = async () => {
      setLoading(true);
      
      const usersCol = collection(db, 'users');
      // Fetch all users except the currently logged-in one
      const usersQuery = query(usersCol, where('uid', '!=', user.uid));
      const usersSnapshot = await getDocs(usersQuery);
      const developersData = usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      
      setAllDevelopers(developersData);
      setFilteredDevelopers(developersData);
      setLoading(false);
    };

    fetchDevelopers();
  }, [user]);

  useEffect(() => {
    const applyFilter = () => {
      if (!searchTerm) {
        setFilteredDevelopers(allDevelopers);
        return;
      }
      const lowercasedTerm = searchTerm.toLowerCase();
      const results = allDevelopers.filter(dev => 
        dev.name?.toLowerCase().includes(lowercasedTerm) ||
        dev.bio?.toLowerCase().includes(lowercasedTerm) ||
        dev.skills?.some(skill => skill.toLowerCase().includes(lowercasedTerm))
      );
      setFilteredDevelopers(results);
    };
    applyFilter();
  }, [searchTerm, allDevelopers]);

  const handleAiSort = () => {
    if (!userProfile?.skills || userProfile.skills.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Add Skills to Your Profile',
        description: 'AI recommendations require skills. Please edit your profile to add some.',
      });
      return;
    }

    startAiSortTransition(async () => {
      try {
        const projectDescriptions = allDevelopers.map(dev => 
          `Name: ${dev.name}, Bio: ${dev.bio || 'Not provided'}, Skills: ${dev.skills?.join(', ') || 'None'}`
        );

        const recommendedOrder = await getUserRecommendations({
          userSkills: userProfile.skills || [],
          projectDescriptions: projectDescriptions,
        });

        const sortedDevelopers = recommendedOrder.map(rec => {
          // Find the developer that matches the recommended description
          return allDevelopers.find(dev => {
            const devDescription = `Name: ${dev.name}, Bio: ${dev.bio || 'Not provided'}, Skills: ${dev.skills?.join(', ') || 'None'}`;
            return devDescription === rec;
          });
        }).filter((dev): dev is UserProfile => dev !== undefined);

        // Add developers not in the recommendation list to the end
        const recommendedIds = new Set(sortedDevelopers.map(d => d.uid));
        const otherDevelopers = allDevelopers.filter(dev => !recommendedIds.has(dev.uid));

        const finalSortedList = [...sortedDevelopers, ...otherDevelopers];
        
        setAllDevelopers(finalSortedList);
        setFilteredDevelopers(finalSortedList);
        setSearchTerm(''); // Reset search after sorting

        toast({
          title: 'Developers Sorted!',
          description: 'Developers have been sorted by relevance to your skills.',
        });
      } catch (error) {
        console.error('AI sorting failed:', error);
        toast({
          variant: 'destructive',
          title: 'AI Sorting Failed',
          description: 'Could not sort developers at this time. Please try again later.',
        });
      }
    });
  };

  const DeveloperListSkeleton = () => (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
         <div key={i} className="space-y-4 rounded-lg border p-4">
            <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-40" />
                </div>
            </div>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
      ))}
    </div>
  );

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight font-headline">Discover Developers</h1>
        <p className="mt-3 text-lg text-muted-foreground">Find and connect with talented developers from across the platform.</p>
      </div>

      <div className="mb-8 max-w-lg mx-auto flex gap-2">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name, skill, or bio..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={loading}
          />
        </div>
        <Button onClick={handleAiSort} disabled={isAiSorting || loading} variant="outline" className="flex-shrink-0">
          <Sparkles className={`mr-2 h-4 w-4 text-yellow-500 ${isAiSorting ? 'animate-spin' : ''}`} />
          Sort by AI
        </Button>
      </div>

      {loading || authLoading ? (
        <DeveloperListSkeleton />
      ) : (
        <div>
            {filteredDevelopers.length > 0 ? (
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {filteredDevelopers.map((dev) => (
                    <DeveloperCard key={dev.uid} developer={dev} />
                ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 py-20 text-center">
                    <h2 className="text-xl font-semibold">No Developers Found</h2>
                    <p className="mt-2 text-muted-foreground">
                      {searchTerm 
                        ? `Your search for "${searchTerm}" did not return any results.`
                        : "There are no other developers on the platform yet."
                      }
                    </p>
                </div>
            )}
        </div>
      )}
    </div>
  );

    