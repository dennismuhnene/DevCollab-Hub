'use client';

import { collection, query, where, Timestamp, FieldValue } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useAuth } from '@/lib/hooks/use-auth';
import { db } from '@/lib/firebase/config';
import type { Match } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Users, Archive } from 'lucide-react';
import MatchList from '@/components/match-list';
import { useMemoFirebase } from '@/firebase';
import { useEffect, useState, useMemo } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

// Helper function to safely get milliseconds from a timestamp
const getSortableTime = (timestamp: Timestamp | FieldValue | null | undefined): number => {
  if (!timestamp) return 0;
  if (timestamp instanceof Timestamp) {
    return timestamp.toMillis();
  }
  // For FieldValue (like serverTimestamp()), return current time for optimistic sorting
  return Date.now();
};

export default function MessagesPage() {
  const { user } = useAuth();
  const [sortedMatches, setSortedMatches] = useState<Match[]>([]);
  const [showArchived, setShowArchived] = useState(false);

  const matchesQuery = useMemoFirebase(
    () => {
      if (!user?.uid) return null;
      return query(
        collection(db, 'matches'),
        where('participants', 'array-contains', user.uid)
      );
    },
    [user?.uid]
  );

  const { data: matches, isLoading, error } = useCollection<Match>(user ? matchesQuery : null);
  
  // ROBUST SORTING: Handles both new and legacy data structures
  useEffect(() => {
    if (matches) {
        const sorted = [...matches].sort((a, b) => {
            const timeA = getSortableTime(a.lastMessageTimestamp) || getSortableTime(a.timestamp as any) || getSortableTime(a.createdAt);
            const timeB = getSortableTime(b.lastMessageTimestamp) || getSortableTime(b.timestamp as any) || getSortableTime(b.createdAt);
            return timeB - timeA;
        });
        setSortedMatches(sorted);
    }
  }, [matches]);
  
  const filteredMatches = useMemo(() => {
    if (!user) return [];
    return sortedMatches.filter(match => {
      const isArchived = match.archivedBy?.includes(user.uid);
      const isDeleted = match.deletedBy?.includes(user.uid);
      if (isDeleted) return false;
      return showArchived ? isArchived : !isArchived;
    });
  }, [sortedMatches, showArchived, user]);


  useEffect(() => {
    if (error) {
      console.error("MessagesPage Firestore Error:", error);
    }
  }, [error]);

  return (
    <div className="flex h-[calc(100vh-theme(spacing.16))] border-t">
      <aside className="w-full md:w-1/3 lg:w-1/4 h-full border-r bg-muted/20 flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold flex items-center">
            <Users className="mr-3 h-5 w-5" />
            Matches
          </h2>
        </div>
        <div className="p-4 border-b flex items-center justify-between">
           <Label htmlFor="show-archived" className="flex items-center gap-2 text-sm font-medium">
             <Archive className="h-4 w-4" />
             Show Archived
           </Label>
           <Switch id="show-archived" checked={showArchived} onCheckedChange={setShowArchived} />
        </div>
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : (
          <MatchList matches={filteredMatches} />
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
