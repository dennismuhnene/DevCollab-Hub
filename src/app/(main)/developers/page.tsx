'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/hooks/use-auth';
import type { UserProfile } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import DeveloperCard from '@/components/developer-card';

export default function DiscoverDevelopersPage() {
  const { user, loading: authLoading } = useAuth();
  const [allDevelopers, setAllDevelopers] = useState<UserProfile[]>([]);
  const [filteredDevelopers, setFilteredDevelopers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

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
    if (!searchTerm) {
        setFilteredDevelopers(allDevelopers);
        return;
    }

    const results = allDevelopers.filter(dev => 
      dev.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dev.bio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dev.skills?.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredDevelopers(results);
  }, [searchTerm, allDevelopers]);

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

      <div className="mb-8 max-w-lg mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name, skill, or bio..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
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
                    <p className="mt-2 text-muted-foreground">Your search for "{searchTerm}" did not return any results.</p>
                </div>
            )}
        </div>
      )}
    </div>
  );
}
