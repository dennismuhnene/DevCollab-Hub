'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/hooks/use-auth';
import type { UserProfile } from '@/types';
import DeveloperCard from '@/components/developer-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DevelopersPage() {
  const { user, loading: authLoading } = useAuth();
  const [developers, setDevelopers] = useState<UserProfile[]>([]);
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
      const q = query(usersCol);
      const querySnapshot = await getDocs(q);
      const allDevelopers = querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      // Exclude the current user from the list
      const otherDevelopers = allDevelopers.filter(dev => dev.uid !== user.uid);
      setDevelopers(otherDevelopers);
      setFilteredDevelopers(otherDevelopers);
      setLoading(false);
    };

    fetchDevelopers();
  }, [user]);

  useEffect(() => {
    const results = developers.filter(dev => 
      dev.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dev.skills?.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredDevelopers(results);
  }, [searchTerm, developers]);

  const DeveloperListSkeleton = () => (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="space-y-4 rounded-lg border p-4">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight font-headline">Find Collaborators</h1>
        <p className="mt-3 text-lg text-muted-foreground">Browse and connect with other developers on the platform.</p>
      </div>

      <div className="mb-8 max-w-lg mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name or skill..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading || authLoading ? (
        <DeveloperListSkeleton />
      ) : (
        <>
          {filteredDevelopers.length > 0 ? (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredDevelopers.map((developer) => (
                <DeveloperCard key={developer.uid} developer={developer} />
              ))}
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 py-20 text-center">
              <h2 className="text-xl font-semibold">No developers found</h2>
              <p className="mt-2 text-muted-foreground">Your search for "{searchTerm}" did not return any results.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
