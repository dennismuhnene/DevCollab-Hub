
'use client';

import { useEffect, useState, useRef, useMemo, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { useAuth } from '@/lib/hooks/use-auth';
import { db } from '@/lib/firebase/config';
import type { Match, Message, UserProfile, Project } from '@/types';
import { useCollection } from '@/firebase/firestore/use-collection';
import MatchList from '@/components/match-list';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Send, Users, Archive, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { addNotification } from '@/lib/firebase/notifications';
import { useMemoFirebase } from '@/firebase';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useDoc } from '@/firebase/firestore/use-doc';
import { markMatchNotificationsAsRead } from '@/lib/firebase/notifications';
import { getChatInsights } from '@/ai/flows/get-chat-insights';
import type { GetChatInsightsOutput } from '@/types/ai';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { logMessageSent, logAiChatInsightGenerated } from '@/firebase/analytics';

export default function ChatPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const matchId = params.matchId as string;

  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [sortedMatches, setSortedMatches] = useState<Match[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [isAiInsightsLoading, startAiInsightsTransition] = useTransition();
  const [aiInsights, setAiInsights] = useState<GetChatInsightsOutput | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const { toast } = useToast();

  const matchRef = useMemoFirebase(() => matchId ? doc(db, 'matches', matchId) : null, [matchId]);
  const { data: match, isLoading: matchLoading } = useDoc<Match>(matchRef);


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

  const { data: matches, isLoading: matchesLoading, error: matchesError } = useCollection<Match>(user ? matchesQuery : null);
  
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
      markMatchNotificationsAsRead(user.uid, matchId);
    }
}, [match, user, matchId]);

  useEffect(() => {
    if (!matchId || !user) return;

    const fetchOtherUserAndProject = async () => {
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

        if (matchData.projectId) {
            const projectDocRef = doc(db, 'projects', matchData.projectId);
            const projectDoc = await getDoc(projectDocRef);
            if (projectDoc.exists()) {
                setProject({ id: projectDoc.id, ...projectDoc.data() } as Project);
            }
        }

      } else {
        router.push('/messages');
      }
      setLoading(false);
    };

    fetchOtherUserAndProject();

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
    logMessageSent(user.uid, matchId);
    
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

  const handleGetAiInsights = () => {
    if (!userProfile || !otherUser || !project) {
        toast({ variant: 'destructive', title: 'Missing data for AI analysis.' });
        return;
    }

    startAiInsightsTransition(async () => {
        try {
            logAiChatInsightGenerated(user.uid, matchId);
            const insights = await getChatInsights({
                currentUser: {
                    skills: userProfile.skills || [],
                    yearsOfExperience: userProfile.yearsOfExperience || 0,
                },
                otherUser: {
                    skills: otherUser.skills || [],
                    yearsOfExperience: otherUser.yearsOfExperience || 0,
                },
                project: {
                    title: project.title,
                    description: project.description,
                    requiredSkills: project.requiredSkills,
                }
            });
            setAiInsights(insights);
            setShowAiModal(true);
        } catch (e) {
            console.error("Failed to get chat insights:", e);
            toast({ variant: 'destructive', title: 'Could not load AI insights.'});
        }
    });
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('');
  };
  
  const MatchListContent = () => (
      <>
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
      </>
  );

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

  const isProjectOwner = project?.ownerId === user?.uid;

  return (
    <>
    <div className="flex h-full border-t">
      <aside className="hidden md:flex w-1/3 lg:w-1/4 h-full border-r bg-muted/20 flex-col">
        <MatchListContent />
      </aside>
      <main className="flex-1 flex flex-col">
        {otherUser && match && match.participantsDetails && match.participantsDetails[otherUser.uid] ? (
           <div className="p-4 border-b flex items-center justify-between gap-4 bg-background">
            <div className="flex items-center gap-4">
                <div className="md:hidden">
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Users className="h-5 w-5" />
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="left" className="p-0 w-3/4">
                          <MatchListContent />
                      </SheetContent>
                    </Sheet>
                </div>
              <Avatar>
                  <AvatarImage src={match.participantsDetails[otherUser.uid].photoURL} />
                  <AvatarFallback>{getInitials(match.participantsDetails[otherUser.uid].name)}</AvatarFallback>
              </Avatar>
              <div>
                  <h3 className="font-semibold">{match.participantsDetails[otherUser.uid].name}</h3>
                  <p className="text-sm text-muted-foreground">Project: {match?.projectTitle}</p>
              </div>
            </div>
            {isProjectOwner && (
             <Button variant="outline" size="sm" onClick={handleGetAiInsights} disabled={isAiInsightsLoading}>
                {isAiInsightsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4 text-yellow-500" />}
                Get AI Insights
             </Button>
            )}
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
     {aiInsights && (
        <AlertDialog open={showAiModal} onOpenChange={setShowAiModal}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-yellow-500" />
                        AI-Powered Chat Insights
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Here are some tailored questions and insights to guide your conversation.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="text-sm space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    <div>
                        <h4 className="font-semibold mb-1">Key Overlaps & Strengths</h4>
                        <p className="text-muted-foreground">{aiInsights.keyOverlaps}</p>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-1">Potential Gaps to Discuss</h4>
                        <p className="text-muted-foreground">{aiInsights.potentialGaps}</p>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2">Suggested Questions to Ask</h4>
                        <ul className="list-disc list-outside pl-5 space-y-2 text-muted-foreground">
                            {aiInsights.suggestedQuestions.map((q, i) => (
                                <li key={i}>{q}</li>
                            ))}
                        </ul>
                    </div>
                </div>
                <AlertDialogFooter>
                    <AlertDialogAction>Got it!</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
     )}
     </>
  );
}
