'use client';

import { collection, query, where } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useAuth } from '@/lib/hooks/use-auth';
import { db } from '@/lib/firebase/config';
import type { Match } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Users } from 'lucide-react';
import MatchList from '@/components/match-list';
import { useMemoFirebase } from '@/firebase';
import { useEffect, useState, useMemo } from 'react';

export default function MessagesPage() {
  const { user } = useAuth();
  const [sortedMatches, setSortedMatches] = useState<Match[]>([]);

  const matchesQuery = useMemoFirebase(
    () => {
      if (!user) return null;
      
      const q = query(
        collection(db, 'matches'),
        where('participants', 'array-contains', user.uid)
      );
      return q;
    },
    [user]
  );

  const { data: matches, isLoading, error } = useCollection<Match>(matchesQuery);
  
  useEffect(() => {
    if (matches) {
        const sorted = [...matches].sort((a, b) => {
            const timeA = a.timestamp?.toMillis() || 0;
            const timeB = b.timestamp?.toMillis() || 0;
            return timeB - timeA;
        });
        setSortedMatches(sorted);
    }
  }, [matches]);


  useEffect(() => {
    if (error) {
      console.error("MessagesPage Firestore Error:", error);
    }
  }, [error]);

  return (
    <div className="flex h-full border-t">
      <aside className="w-full md:w-1/3 lg:w-1/4 h-full border-r bg-muted/20">
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold flex items-center">
            <Users className="mr-3 h-5 w-5" />
            Matches
          </h2>
        </div>
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : (
          <MatchList matches={sortedMatches} />
        )}
      </aside>
      <main className="flex-1 hidden md:flex flex-col items-center justify-center text-center bg-background">
        <MessageSquare className="h-16 w-16 text-muted-foreground/50" />
        <h2 className="mt-4 text-2xl font-semibold">Select a conversation</h2>
        <p className="text-muted-foreground">Choose one of your matches from the sidebar to start chatting.</p>
      </main>
    </div>
  );
}
