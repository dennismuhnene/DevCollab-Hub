'use client';

import type { Match } from '@/types';
import { useAuth } from '@/lib/hooks/use-auth';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Archive, ArchiveRestore, X } from 'lucide-react';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useToast } from '@/hooks/use-toast';
import { Badge } from './ui/badge';

type MatchListProps = {
  matches: Match[];
  activeMatchId?: string;
};

export default function MatchList({ matches, activeMatchId }: MatchListProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('');
  };

  const handleArchiveToggle = async (e: React.MouseEvent, match: Match) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) return;
    
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
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update conversation.' });
    }
  };


  return (
    <nav className="p-2 space-y-1 overflow-y-auto">
      {matches.length > 0 ? matches.map((match) => {
        const otherUserId = match.participants.find(p => p !== user?.uid);
        if (!otherUserId) return null; // Should not happen in a valid match
        
        const otherParticipantDetails = match.participantsDetails?.[otherUserId];
        if (!otherParticipantDetails) return null; // Data might not be populated yet
        
        const isArchived = match.archivedBy?.includes(user?.uid || '');
        const unreadCount = match.unreadCounts?.[user?.uid || ''] || 0;

        return (
          <div key={match.id} className="relative group">
            <Link
              href={`/messages/${match.id}`}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg transition-colors w-full',
                match.id === activeMatchId
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              )}
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={otherParticipantDetails.photoURL} />
                <AvatarFallback>{getInitials(otherParticipantDetails.name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <p className="font-semibold truncate">{otherParticipantDetails.name}</p>
                <p className={cn(
                    "text-sm truncate",
                    match.id === activeMatchId ? "text-primary-foreground/80" : "text-muted-foreground"
                )}>
                  {match.lastMessage || `Project: ${match.projectTitle}`}
                </p>
              </div>
              {unreadCount > 0 && (
                <Badge className="flex-shrink-0">{unreadCount}</Badge>
              )}
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "absolute top-1/2 right-2 -translate-y-1/2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity",
                match.id === activeMatchId && "text-primary-foreground hover:bg-primary/80"
              )}
              onClick={(e) => handleArchiveToggle(e, match)}
              title={isArchived ? "Unarchive" : "Archive"}
            >
              {isArchived ? <ArchiveRestore className="h-4 w-4" /> : <X className="h-4 w-4" />}
            </Button>
          </div>
        );
      }) : (
        <div className="p-4 text-center text-muted-foreground text-sm">
            You have no matches yet.
        </div>
      )}
    </nav>
  );
}
