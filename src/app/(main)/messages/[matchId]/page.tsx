'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { useAuth } from '@/lib/hooks/use-auth';
import { db } from '@/lib/firebase/config';
import type { Match, Message, UserProfile } from '@/types';
import { useCollection } from '@/firebase/firestore/use-collection';
import MatchList from '@/components/match-list';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Send, Users, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';
import { addNotification } from '@/lib/firebase/notifications';
import { useMemoFirebase } from '@/firebase';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useDoc } from '@/firebase/firestore/use-doc';
import { markMatchNotificationsAsRead } from '@/lib/firebase/notifications';

export default function ChatPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const matchId = params.matchId as string;

  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [sortedMatches, setSortedMatches] = useState<Match[]>([]);
  const [showArchived, setShowArchived] = useState(false);

  const matchRef = useMemoFirebase(() => matchId ? doc(db, 'matches', matchId) : null, [matchId]);
  const { data: match, isLoading: matchLoading } = useDoc<Match>(matchRef);


  // This query now perfectly matches the security rule for 'list'
  const matchesQuery = useMemoFirebase(
    () => {
      if (!user?.uid) return null; // CRITICAL: Do not query if user is not loaded
      return query(
            collection(db, 'matches'),
            where('participants', 'array-contains', user.uid)
          );
    },
    [user?.uid]
  );

  const { data: matches, isLoading: matchesLoading, error: matchesError } = useCollection<Match>(user ? matchesQuery : null);
  
  // Sorting is now done on the client-side to avoid complex indexed queries
   useEffect(() => {
    if (matches) {
        const sorted = [...matches].sort((a, b) => {
            const timeA = a.timestamp?.toMillis() || a.createdAt?.toMillis() || 0;
            const timeB = b.timestamp?.toMillis() || b.createdAt?.toMillis() || 0;
            return timeB - timeA;
        });
        setSortedMatches(sorted);
    }
  }, [matches]);

  const filteredMatches = useMemo(() => {
    if (!user) return [];
    return sortedMatches.filter(match => {
      const isArchived = match.archivedBy?.includes(user.uid);
      return showArchived ? isArchived : !isArchived;
    });
  }, [sortedMatches, showArchived, user]);

  useEffect(() => {
    if (matchesError) {
      // The useCollection hook will throw a contextual error which is caught by the FirebaseErrorListener
      console.error("ChatPage Matches Error:", matchesError);
    }
  }, [matchesError]);

  useEffect(() => {
    if (match && user) {
      const userUnreadCount = match.unreadCounts?.[user.uid] || 0;
      if (userUnreadCount > 0) {
        const matchDocRef = doc(db, 'matches', matchId);
        updateDoc(matchDocRef, {
          [`unreadCounts.${user.uid}`]: 0,
        });
      }
      // This will now mark both 'message' and 'match' notifications as read
      markMatchNotificationsAsRead(user.uid, matchId);
    }
}, [match, user, matchId]);

  useEffect(() => {
    if (!matchId || !user) return;

    const fetchOtherUser = async () => {
      setLoading(true);
      const matchDocRef = doc(db, 'matches', matchId);
      const matchDoc = await getDoc(matchDocRef);

      if (matchDoc.exists()) {
        const matchData = { id: matchDoc.id, ...matchDoc.data() } as Match;
        if (!matchData.participants.includes(user.uid)) {
          router.push('/messages');
          return;
        }

        const otherUserId = matchData.participants.find(p => p !== user.uid);
        if (otherUserId) {
          const userDocRef = doc(db, 'users', otherUserId);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setOtherUser(userDoc.data() as UserProfile);
          }
        }
      } else {
        router.push('/messages');
      }
      setLoading(false);
    };

    fetchOtherUser();

    const messagesQuery = query(collection(db, 'matches', matchId, 'messages'), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      setMessages(snapshot.docs.map(doc => doc.data() as Message));
    }, (err) => {
        console.error("ChatPage Messages Snapshot Error:", err);
    });

    return () => unsubscribe();

  }, [matchId, user, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !match || !otherUser) return;

    const messageData = {
      text: newMessage,
      senderId: user.uid,
      timestamp: serverTimestamp(),
    };
    
    const messagesCollectionRef = collection(db, 'matches', matchId, 'messages');
    await addDoc(messagesCollectionRef, messageData);
    
    // Also update the parent match document to reflect the latest message time and unread count
    const matchDocRef = doc(db, 'matches', matchId);
    await updateDoc(matchDocRef, { 
      timestamp: serverTimestamp(),
      lastMessage: newMessage,
      [`unreadCounts.${otherUser.uid}`]: increment(1),
    });

    addNotification(otherUser.uid, {
        type: 'message',
        fromUserId: user.uid,
        fromUserName: user.displayName || 'A user',
        matchId: matchId,
        read: false,
        messageSnippet: newMessage,
    });

    setNewMessage('');
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('');
  };

  if (authLoading || loading || matchLoading) {
    return (
         <div className="flex h-full border-t">
            <aside className="w-1/3 lg:w-1/4 h-full border-r bg-muted/20">
                <div className="p-4 space-y-3">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
            </aside>
            <main className="flex-1 flex flex-col">
                 <Skeleton className="h-full w-full" />
            </main>
        </div>
    )
  }

  return (
    <div className="flex h-full border-t">
      <aside className="hidden md:block w-1/3 lg:w-1/4 h-full border-r bg-muted/20 flex-col">
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
        {matchesLoading ? (
           <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : (
          <MatchList matches={filteredMatches} activeMatchId={matchId} />
        )}
      </aside>
      <main className="flex-1 flex flex-col">
        {otherUser && match && match.participantsDetails && match.participantsDetails[otherUser.uid] ? (
           <div className="p-4 border-b flex items-center gap-4 bg-background">
            <Avatar>
                <AvatarImage src={match.participantsDetails[otherUser.uid].photoURL} />
                <AvatarFallback>{getInitials(match.participantsDetails[otherUser.uid].name)}</AvatarFallback>
            </Avatar>
            <div>
                <h3 className="font-semibold">{match.participantsDetails[otherUser.uid].name}</h3>
                <p className="text-sm text-muted-foreground">Project: {match?.projectTitle}</p>
            </div>
           </div>
        ) : (
            otherUser && (
                <div className="p-4 border-b flex items-center gap-4 bg-background">
                    <Avatar>
                        <AvatarImage src={otherUser.photoURL} />
                        <AvatarFallback>{getInitials(otherUser.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h3 className="font-semibold">{otherUser.name}</h3>
                        <p className="text-sm text-muted-foreground">Project: {match?.projectTitle}</p>
                    </div>
                </div>
            )
        )}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((msg, index) => (
                <div key={index} className={cn("flex items-end gap-2", msg.senderId === user?.uid ? "justify-end" : "justify-start")}>
                   {msg.senderId !== user?.uid && otherUser && match && match.participantsDetails && match.participantsDetails[otherUser.uid] && (
                     <Avatar className="h-8 w-8">
                       <AvatarImage src={match.participantsDetails[otherUser.uid].photoURL} />
                       <AvatarFallback>{getInitials(match.participantsDetails[otherUser.uid].name)}</AvatarFallback>
                     </Avatar>
                   )}
                   <div className={cn(
                       "max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-lg",
                       msg.senderId === user?.uid ? "bg-primary text-primary-foreground" : "bg-muted"
                   )}>
                    <p className="text-sm">{msg.text}</p>
                   </div>
                </div>
            ))}
            <div ref={messagesEndRef} />
        </div>
         <div className="p-4 border-t bg-background">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <Input 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    autoComplete="off"
                />
                <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                    <Send className="h-4 w-4" />
                </Button>
            </form>
         </div>
      </main>
    </div>
  );
}
