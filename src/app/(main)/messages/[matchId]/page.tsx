'use client';

import { useEffect, useState, useRef, useMemo, useCallback, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, increment, Timestamp, FieldValue, arrayUnion } from 'firebase/firestore';
import { useAuth } from '@/lib/hooks/use-auth';
import { db } from '@/lib/firebase/config';
import type { Match, Message, UserProfile, Project, Role } from '@/types';
import type { GetChatInsightsOutput } from '@/types/ai';
import { useCollection } from '@/firebase/firestore/use-collection';
import MatchList from '@/components/match-list';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Send, Users, Archive, ArrowLeft, Sparkles, Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { addNotification } from '@/lib/firebase/notifications';
import { useMemoFirebase } from '@/firebase';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { markMatchNotificationsAsRead } from '@/lib/firebase/notifications';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { logAnalyticsEvent } from '@/firebase/analytics';
import Link from 'next/link';
import { generateChatInsightsAction } from './actions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Helper to get initials
const getInitials = (name?: string) => name ? name.split(' ').map((n) => n[0]).join('') : '?';

const MatchListContent = ({ matches, isLoading, activeMatchId, showArchived, onShowArchivedChange }: {
  matches: Match[];
  isLoading: boolean;
  activeMatchId: string;
  showArchived: boolean;
  onShowArchivedChange: (checked: boolean) => void;
}) => (
  <>
    <div className="p-4 border-b"><h2 className="text-xl font-semibold flex items-center"><Users className="mr-3 h-5 w-5" />Matches</h2></div>
    <div className="p-4 border-b flex items-center justify-between">
      <Label htmlFor="show-archived" className="flex items-center gap-2 text-sm font-medium"><Archive className="h-4 w-4" />Show Archived</Label>
      <Switch id="show-archived" checked={showArchived} onCheckedChange={onShowArchivedChange} />
    </div>
    {isLoading && matches.length === 0 ? (
      <div className="p-4 space-y-3">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
    ) : (
      <MatchList matches={matches} activeMatchId={activeMatchId} />
    )}
  </>
);

export default function ChatPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const matchId = params.matchId as string;

  // State Management
  const [match, setMatch] = useState<Match | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
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

  const matchesQuery = useMemoFirebase(
    () => user?.uid ? query(collection(db, 'matches'), where('participants', 'array-contains', user.uid)) : null,
    [user?.uid]
  );
  const { data: matches, isLoading: matchesLoading, error: matchesError } = useCollection<Match>(matchesQuery);

  const getSortableTime = (timestamp: Timestamp | FieldValue | null | undefined): number => {
    if (!timestamp) return 0;
    if (timestamp instanceof Timestamp) return timestamp.toMillis();
    return Date.now();
  };

  useEffect(() => {
    if (matches) {
        const sorted = [...matches].sort((a, b) => {
            const timeA = getSortableTime(a.lastMessageTimestamp) || getSortableTime(a.createdAt);
            const timeB = getSortableTime(b.lastMessageTimestamp) || getSortableTime(b.createdAt);
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
    if (matchesError) console.error("ChatPage Matches Error:", matchesError);
  }, [matchesError]);

  useEffect(() => {
    if (!matchId || !user) return;
    setLoading(true);

    const messagesQuery = query(collection(db, 'matches', matchId, 'messages'), orderBy('timestamp', 'asc'));
    const unsubscribeMessages = onSnapshot(messagesQuery, 
        (snapshot) => setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message))),
        (err) => console.error("ChatPage Messages Snapshot Error:", err)
    );

    const matchDocRef = doc(db, 'matches', matchId);
    const unsubscribeMatch = onSnapshot(matchDocRef, async (matchDoc) => {
        if (!matchDoc.exists()) {
            toast({ variant: 'destructive', title: 'Match not found' });
            return router.push('/messages');
        }

        const matchData = { id: matchDoc.id, ...matchDoc.data() } as Match;
        setMatch(matchData);

        if (!matchData.participants.includes(user.uid)) {
            toast({ variant: 'destructive', title: 'Access Denied' });
            return router.push('/messages');
        }

        // Handle new and legacy match structures
        if (matchData.type === 'project' && matchData.contextId) {
            const projectDoc = await getDoc(doc(db, 'projects', matchData.contextId));
            setProject(projectDoc.exists() ? { id: projectDoc.id, ...projectDoc.data() } as Project : null);
            setRole(null);
        } else if (matchData.type === 'role' && matchData.contextId) {
            const roleDoc = await getDoc(doc(db, 'roles', matchData.contextId));
            setRole(roleDoc.exists() ? { id: roleDoc.id, ...roleDoc.data() } as Role : null);
            setProject(null);
        } else if ((matchData as any).projectId) { // LEGACY FALLBACK for older project-based matches
            const projectDoc = await getDoc(doc(db, 'projects', (matchData as any).projectId));
            setProject(projectDoc.exists() ? { id: projectDoc.id, ...projectDoc.data() } as Project : null);
            setRole(null);
        } else {
            setProject(null);
            setRole(null);
        }
        
        const otherUserId = matchData.participants.find(p => p !== user.uid);
        if (otherUserId) {
            const userDoc = await getDoc(doc(db, 'users', otherUserId));
            if (userDoc.exists()) {
                setOtherUser({ uid: userDoc.id, ...userDoc.data() } as UserProfile);
            }
        }

        if ((matchData.unreadCounts?.[user.uid] || 0) > 0) {
            await updateDoc(matchDocRef, { [`unreadCounts.${user.uid}`]: 0 });
            markMatchNotificationsAsRead(user.uid, matchId);
        }

        setLoading(false);
    }, (err) => {
        console.error("ChatPage Match Snapshot Error:", err);
        toast({ variant: 'destructive', title: 'Error loading chat' });
        setLoading(false);
    });

    return () => {
      unsubscribeMessages();
      unsubscribeMatch();
    };

  }, [matchId, user, router, toast]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !user || !match || !otherUser?.uid) return;

    const trimmedMessage = newMessage.trim();
    setNewMessage('');

    try {
      await addDoc(collection(db, 'matches', matchId, 'messages'), {
        text: trimmedMessage,
        senderId: user.uid,
        timestamp: serverTimestamp(),
      });

      await updateDoc(doc(db, 'matches', matchId), { 
        lastMessage: trimmedMessage,
        lastMessageSender: user.uid,
        lastMessageTimestamp: serverTimestamp(),
        [`unreadCounts.${otherUser.uid}`]: increment(1),
        archivedBy: [],
      });

      await addNotification(otherUser.uid, {
          type: 'message',
          fromUserId: user.uid,
          fromUserName: userProfile?.name || 'A user', 
          matchId: matchId,
          messageSnippet: trimmedMessage,
          contextTitle: match.contextTitle || '',
      });

      logAnalyticsEvent('send_message', { match_id: matchId });

    } catch (error) {
      console.error("Failed to send message or add notification: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not send your message. Please try again.' });
      setNewMessage(trimmedMessage);
    }
  }, [newMessage, user, match, otherUser, userProfile, matchId, toast]);

  const handleDeleteMessage = async (messageId: string) => {
    if (!user) return;
    const messageRef = doc(db, 'matches', matchId, 'messages', messageId);
    try {
      await updateDoc(messageRef, { deletedFor: arrayUnion(user.uid) });
      toast({ title: 'Message Deleted' });
    } catch (error) {
      console.error("Error deleting message:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete message.' });
    }
  };

  const handleGetAiInsights = () => {
    const isOwner = project?.ownerId === user?.uid || role?.ownerId === user?.uid;
    if (!isOwner) {
      return; // Silently exit if not the owner.
    }

    if (!user || !userProfile || !otherUser || (!project && !role)) {
        toast({ variant: 'destructive', title: 'Missing data for AI analysis.' });
        return;
    }

    startAiInsightsTransition(async () => {
        const authToken = await user.getIdToken();
        if (!authToken) {
          toast({ variant: 'destructive', title: 'Authentication Error', description: 'Could not verify your identity. Please log in again.' });
          return;
        }

        let insightContext;
        if (project) {
            insightContext = {
                title: project.title,
                description: project.description,
                requiredSkills: project.requiredSkills,
            };
        } else if (role) {
            insightContext = {
                title: role.title,
                description: role.roleDescription, // Corrected property
                requiredSkills: role.requiredSkills,
            };
        }

        if (!insightContext) { // Guard against undefined context
            toast({ variant: 'destructive', title: 'Could not determine context for AI insights.' });
            return;
        }
        
        logAnalyticsEvent('ai_chat_insight_generated', { match_id: matchId, context_type: project ? 'project' : 'role' });

        const result = await generateChatInsightsAction({
            authToken,
            currentUser: {
                skills: userProfile.skills || [],
                yearsOfExperience: userProfile.yearsOfExperience || 0,
            },
            otherUser: {
                skills: otherUser.skills || [],
                yearsOfExperience: otherUser.yearsOfExperience || 0,
            },
            project: insightContext
        });

        if (result.success && result.data) {
            setAiInsights(result.data);
            setShowAiModal(true);
        } else {
            console.error("Failed to get chat insights:", result.error);
            toast({ variant: 'destructive', title: 'Could not load AI insights', description: result.error });
        }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }
  
  const isOwner = project?.ownerId === user?.uid || role?.ownerId === user?.uid;
  const title = match?.contextTitle;

  const visibleMessages = useMemo(() => {
      if (!user) return [];
      return messages.filter(msg => !msg.deletedFor?.includes(user.uid))
  }, [messages, user]);

  if (authLoading || (loading && !match)) {
    return (
      <div className="flex h-[calc(100vh-theme(spacing.16))] border-t">
        <aside className="w-1/3 lg:w-1/4 h-full border-r bg-muted/20 hidden md:block">
          <div className="p-4 border-b"><h2 className="text-xl font-semibold">Matches</h2></div>
          <div className="p-4 space-y-3">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        </aside>
        <main className="flex-1 flex flex-col">
          <div className="p-4 border-b flex items-center gap-4 bg-background"><Skeleton className="h-10 w-10 rounded-full" /><div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-24" /></div></div>
          <div className="flex-1 p-6"><Skeleton className="h-full w-full" /></div>
          <div className="p-4 border-t"><Skeleton className="h-10 w-full" /></div>
        </main>
      </div>
    )
  }

  return (
    <>
      <div className="flex h-[calc(100vh-theme(spacing.16))] border-t">
        <aside className="hidden md:flex w-1/3 lg:w-1/4 h-full border-r bg-muted/20 flex-col">
          <MatchListContent 
            matches={filteredMatches}
            isLoading={matchesLoading}
            activeMatchId={matchId}
            showArchived={showArchived}
            onShowArchivedChange={setShowArchived}
          />
        </aside>

        <main className="flex-1 flex flex-col bg-background">
          {otherUser ? (
            <div className="p-4 border-b flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="md:hidden">
                  <Sheet>
                    <SheetTrigger asChild><Button variant="ghost" size="icon"><Users className="h-5 w-5" /></Button></SheetTrigger>
                    <SheetContent side="left" className="p-0 w-full sm:w-3/4">
                      <MatchListContent 
                        matches={filteredMatches}
                        isLoading={matchesLoading}
                        activeMatchId={matchId}
                        showArchived={showArchived}
                        onShowArchivedChange={setShowArchived}
                      />
                    </SheetContent>
                  </Sheet>
                </div>
                <Avatar><AvatarImage src={otherUser?.photoURL} /><AvatarFallback>{getInitials(otherUser?.name)}</AvatarFallback></Avatar>
                <div><h3 className="font-semibold">{otherUser?.name || 'New Match'}</h3>{title && <p className="text-sm text-muted-foreground">{title}</p>}</div>
              </div>
                {isOwner && (
                 <Button variant="outline" size="sm" onClick={handleGetAiInsights} disabled={isAiInsightsLoading}>
                    {isAiInsightsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4 text-yellow-500" />}
                    Insights
                 </Button>
                )}
            </div>
          ) : (
            <div className="p-4 border-b flex items-center gap-4">
                <div className="md:hidden"><Button variant="ghost" size="icon" asChild><Link href="/messages"><ArrowLeft className="h-5 w-5" /></Link></Button></div>
                {loading ? (
                    <div className="flex items-center gap-4 w-full">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-24" />
                        </div>
                    </div>
                ) : <p>Select a conversation to start chatting</p>}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loading && messages.length === 0 ? (
                  <div className="space-y-4">
                      {[...Array(5)].map((_, i) => (
                          <div key={i} className={`flex items-end gap-2 ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                              {i % 2 === 0 && <Skeleton className="h-8 w-8 rounded-full" />}
                              <Skeleton className="h-12 w-48 rounded-lg" />
                          </div>
                      ))}
                  </div>
              ) : visibleMessages.map((msg, index) => (
                <div key={index} className={cn("group flex items-end gap-2", msg.senderId === user?.uid ? "justify-end" : "justify-start")}>
                    {msg.senderId !== user?.uid && otherUser && (
                        <Avatar className="h-8 w-8"><AvatarImage src={otherUser?.photoURL} /><AvatarFallback>{getInitials(otherUser?.name)}</AvatarFallback></Avatar>
                    )}
                    <div className={cn("max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-lg shadow-sm relative", msg.senderId === user?.uid ? "bg-primary text-primary-foreground" : "bg-muted")}>
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                    </div>
                    {msg.senderId === user?.uid && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                        onClick={() => handleDeleteMessage(msg.id!)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                </div>
              ))}
              <div ref={messagesEndRef} />
          </div>

           <div className="p-4 border-t bg-card mt-auto">
              <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center gap-2">
                  <Input 
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type a message..."
                      autoComplete="off"
                      className="flex-1"
                      disabled={!otherUser}
                  />
                  <Button type="submit" size="icon" disabled={!newMessage.trim() || !otherUser}><Send className="h-4 w-4" /></Button>
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
                        Chat Insights
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Here are some tailored questions and insights to guide your conversation.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="text-sm space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    <div>
                        <h4 className="font-semibold mb-1">Key Overlaps & Strengths</h4>
                        <p className="text-muted-foreground">{aiInsights?.keyOverlaps}</p>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-1">Potential Gaps to Discuss</h4>
                        <p className="text-muted-foreground">{aiInsights?.potentialGaps}</p>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2">Suggested Questions to Ask</h4>
                        <ul className="list-disc list-outside pl-5 space-y-2 text-muted-foreground">
                            {aiInsights?.suggestedQuestions.map((q, i) => (
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
