'use client';

import type { Match, UserProfile } from '@/types';
import { useAuth } from '@/lib/hooks/use-auth';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Archive, ArchiveRestore } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from './ui/badge';
import { useEffect, useState, memo } from 'react'; // Correctly import memo
import { Skeleton } from './ui/skeleton';
import { getDoc, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

// Helper to get initials
const getInitials = (name?: string) => {
  if (!name) return '?';
  return name.split(' ').map((n) => n[0]).join('');
};

// Wrap the component in React.memo to prevent re-renders when props are unchanged
const MatchListItem = memo(({ match, activeMatchId, currentUserId }: { match: Match, activeMatchId?: string, currentUserId: string }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [otherUser, setOtherUser] = useState<Partial<UserProfile> | null>(null);
  const [loading, setLoading] = useState(true);
  const [isArchiving, setIsArchiving] = useState(false);

  const otherUserId = match.participants.find(p => p !== currentUserId);

  useEffect(() => {
    setLoading(true);
    setOtherUser(null);
    if (!otherUserId) {
      setLoading(false);
      return;
    }

    const userDocRef = doc(db, 'users', otherUserId);
    getDoc(userDocRef).then(userDoc => {
      if (userDoc.exists()) {
        setOtherUser({ uid: userDoc.id, ...userDoc.data() });
      } else {
        setOtherUser({ uid: otherUserId });
      }
      setLoading(false);
    }).catch(err => {
      console.error("Error fetching user profile in MatchListItem:", err);
      setLoading(false);
    });
  }, [match, otherUserId]);

  const handleArchiveToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;

    setIsArchiving(true);
    const matchRef = doc(db, 'matches', match.id);
    const isArchived = match.archivedBy?.includes(user.uid);

    try {
      if (isArchived) {
        await updateDoc(matchRef, { archivedBy: arrayRemove(user.uid) });
        toast({ title: 'Conversation Unarchived' });
      } else {
        await updateDoc(matchRef, { archivedBy: arrayUnion(user.uid) });
        toast({ title: 'Conversation Archived' });
      }
    } catch (error) {
      console.error("Error archiving match:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update conversation.' });
    } finally {
      setIsArchiving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-start gap-3 p-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    );
  }

  if (!otherUserId || !otherUser) return null;

  const participantName = otherUser?.name || 'New Match';
  const participantPhoto = otherUser?.photoURL;
  const isProjectMatch = match.type === 'project' || !!match.projectId;

  const primaryTitle = isProjectMatch
    ? match.contextTitle || match.projectTitle || 'Project Conversation'
    : participantName;

  const secondaryTitle = isProjectMatch
    ? participantName
    : match.contextTitle || 'Role Conversation';

  const isArchived = match.archivedBy?.includes(currentUserId);
  const unreadCount = match.unreadCounts?.[currentUserId] || 0;

  return (
    <div className="relative group">
      <Link
        href={`/messages/${match.id}`}
        className={cn(
          'flex items-start gap-3 p-3 rounded-lg transition-colors w-full',
          match.id === activeMatchId ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
        )}
      >
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarImage src={participantPhoto} />
          <AvatarFallback>{getInitials(participantName)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 overflow-hidden">
          <div className="flex justify-between items-start">
            <p className="font-semibold truncate">{primaryTitle}</p>
            {unreadCount > 0 && <Badge className="flex-shrink-0 h-5">{unreadCount}</Badge>}
          </div>
          <p className={cn("text-sm truncate font-medium", match.id === activeMatchId ? "text-primary-foreground/90" : "text-muted-foreground")}>
            {secondaryTitle}
          </p>
          {match.lastMessage && (
            <p className={cn("text-xs truncate", match.id === activeMatchId ? "text-primary-foreground/80" : "text-muted-foreground/90")}>
              {match.lastMessageSender === currentUserId && "You: "}
              {match.lastMessage}
            </p>
          )}
        </div>
      </Link>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "absolute top-1/2 right-2 -translate-y-1/2 h-7 w-7 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity",
          match.id === activeMatchId && "text-primary-foreground hover:bg-primary/80"
        )}
        onClick={handleArchiveToggle}
        disabled={isArchiving}
        title={isArchived ? "Unarchive" : "Archive"}
      >
        {isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
      </Button>
    </div>
  );
});
// Add a display name for better debugging
MatchListItem.displayName = 'MatchListItem';


export default function MatchList({ matches, activeMatchId }: { matches: Match[], activeMatchId?: string }) {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <nav className="p-2 space-y-1 overflow-y-auto">
      {matches.length > 0 ? matches.map((match) => (
        <MatchListItem
          key={match.id}
          match={match}
          activeMatchId={activeMatchId}
          currentUserId={user.uid}
        />
      )) : (
        <div className="p-4 text-center text-muted-foreground text-sm">
          You have no matches yet.
        </div>
      )}
    </nav>
  );
}
