'use client';

import type { Match } from '@/types';
import { useAuth } from '@/lib/hooks/use-auth';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { cn } from '@/lib/utils';

type MatchListProps = {
  matches: Match[];
  activeMatchId?: string;
};

export default function MatchList({ matches, activeMatchId }: MatchListProps) {
  const { user } = useAuth();

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('');
  };

  return (
    <nav className="p-2 space-y-1">
      {matches.length > 0 ? matches.map((match) => {
        const otherParticipant = match.participantsDetails.find(p => p.uid !== user?.uid);
        if (!otherParticipant) return null;

        return (
          <Link
            key={match.id}
            href={`/messages/${match.id}`}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg transition-colors',
              match.id === activeMatchId
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            )}
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={otherParticipant.photoURL} />
              <AvatarFallback>{getInitials(otherParticipant.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="font-semibold truncate">{otherParticipant.name}</p>
              <p className={cn(
                  "text-sm truncate",
                   match.id === activeMatchId ? "text-primary-foreground/80" : "text-muted-foreground"
              )}>
                {match.projectTitle}
              </p>
            </div>
          </Link>
        );
      }) : (
        <div className="p-4 text-center text-muted-foreground text-sm">
            You have no matches yet.
        </div>
      )}
    </nav>
  );
}

    