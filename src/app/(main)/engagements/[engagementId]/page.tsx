'use client';

import { useEffect, useState, useRef, Fragment } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, updateDoc, collection, addDoc, serverTimestamp, query, orderBy, Unsubscribe, where, getDocs, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, storage } from '@/lib/firebase/config';
import { useAuth } from '@/lib/hooks/use-auth';
import { Engagement, EngagementMessage } from '@/types/advisor';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Paperclip, Send, XCircle, Loader2, ShieldAlert, PlayCircle, Edit, UserX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { checkBlockStatus } from '@/lib/firebase/users';
import EngagementVideo from '@/components/engagement-video';
import { RequestDetails, ProposalDetails } from '@/components/dashboard/engagement-details';
import OutcomeLog from '@/components/engagement/outcome-log';
import SubmitWorkDialog from '@/components/engagement/submit-work-dialog';
import AcceptWorkDialog from '@/components/engagement/accept-work-dialog';
import { EngagementRoomSkeleton } from '@/components/skeletons/engagement-room-skeleton';

// Correctly infer the Milestone type from the imported Engagement interface.
type Milestone = NonNullable<Engagement['advisorProposal']>['milestones'][number];

/**
 * A helper component that finds URLs in a string and turns them into clickable links.
 */
const Linkify = ({ text }: { text: string }) => {
    if (!text) return null;
    
    const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    const parts = text.split(urlRegex);

    return (
        <>
            {parts.map((part, i) => {
                if (part && urlRegex.test(part)) {
                    return (
                        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-500">
                            {part}
                        </a>
                    );
                }
                return <Fragment key={i}>{part}</Fragment>;
            })}
        </>
    );
};

const EngagementRoomPage = (): JSX.Element => {
    const { engagementId } = useParams();
    const { user } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [engagement, setEngagement] = useState<Engagement | null>(null);
    const [messages, setMessages] = useState<EngagementMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isBlocked, setIsBlocked] = useState(false);
    const [hasReviewed, setHasReviewed] = useState(false);
    const [startingMilestone, setStartingMilestone] = useState<string | null>(null);

    const [openSubmitDialogs, setOpenSubmitDialogs] = useState<Record<string, boolean>>({});
    const [acceptWorkDialogOpen, setAcceptWorkDialogOpen] = useState(false);
    const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
    const [closeEngagementAlertOpen, setCloseEngagementAlertOpen] = useState(false);
    const [closeEngagementMessage, setCloseEngagementMessage] = useState('');
    const [isClosing, setIsClosing] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const functions = getFunctions();
    
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_FILE_TYPES = [
        'image/jpeg', 'image/png', 'image/gif', 'application/pdf', 
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain'
    ];

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

    useEffect(() => { scrollToBottom(); }, [messages]);

    useEffect(() => {
        if (typeof engagementId !== 'string' || !user) return;
        let unsubMessages: Unsubscribe | null = null;

        const unsubEngagement = onSnapshot(doc(db, 'engagements', engagementId), async (engagementDoc) => {
            if (!engagementDoc.exists()) {
                toast({ variant: 'destructive', title: 'Not Found', description: 'This engagement does not exist.'});
                router.push('/dashboard');
                setLoading(false);
                return;
            }

            const engData = { id: engagementDoc.id, ...engagementDoc.data() } as Engagement;
            if (user.uid !== engData.developerId && user.uid !== engData.advisorId) {
                toast({ variant: 'destructive', title: 'Access Denied', description: 'You are not a participant in this engagement.'});
                router.push('/dashboard');
                return;
            }

            // Check for block status only if the engagement is not frozen
            if (engData.status !== 'participant_deleted') {
                const otherUserId = user.uid === engData.developerId ? engData.advisorId : engData.developerId;
                const blockStatus = await checkBlockStatus(user.uid, otherUserId);
                setIsBlocked(blockStatus);
            }

            setEngagement(engData);

            if (user.uid === engData.developerId) {
                const reviewsQuery = query(collection(db, 'advisor_reviews'), where('engagementId', '==', engagementId), where('developerId', '==', user.uid));
                const reviewSnapshot = await getDocs(reviewsQuery);
                setHasReviewed(!reviewSnapshot.empty);
            }

            if (!unsubMessages) {
                const messagesQuery = query(collection(db, `engagements/${engagementId}/messages`), orderBy('createdAt', 'asc'));
                unsubMessages = onSnapshot(messagesQuery, (snapshot) => {
                    const msgs: EngagementMessage[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EngagementMessage));
                    setMessages(msgs);
                });
            }
            setLoading(false);
        });

        return () => {
            unsubEngagement();
            if (unsubMessages) unsubMessages();
        };
    }, [engagementId, user, router, toast]);

    const handleStartMilestone = async (milestoneId: string) => {
        setStartingMilestone(milestoneId);
        try {
            const startMilestoneFn = httpsCallable(functions, 'startMilestone');
            await startMilestoneFn({ engagementId, milestoneId });
            toast({ title: "Milestone Started", description: "The milestone is now in progress. You can submit your work when ready." });
        } catch (error: any) {
            console.error("Error starting milestone:", error);
            toast({ variant: 'destructive', title: 'Error', description: error.message || 'Could not start milestone.' });
        } finally {
            setStartingMilestone(null);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;
        if (selectedFile.size > MAX_FILE_SIZE) {
            toast({ variant: 'destructive', title: 'File too large', description: `Please select a file smaller than ${MAX_FILE_SIZE / 1024 / 1024}MB.` });
            return;
        }
        if (!ALLOWED_FILE_TYPES.includes(selectedFile.type)) {
            toast({ variant: 'destructive', title: 'Invalid file type', description: 'Please select a valid file type.' });
            return;
        }
        setFile(selectedFile);
        e.target.value = ''; 
    };

    const handleSendMessage = async () => {
        if (!user || typeof engagementId !== 'string' || isBlocked || engagement?.status !== 'active') return;
        if (!newMessage.trim() && !file) return;
      
        try {
          let fileURL = '', fileName = '';
          if (file) {
            setUploading(true);
            const filePath = `engagements/${engagementId}/${Date.now()}_${file.name}`;
            const storageRef = ref(storage, filePath);
            await uploadBytes(storageRef, file);
            fileURL = await getDownloadURL(storageRef);
            fileName = file.name;
          }
          await addDoc(collection(db, `engagements/${engagementId}/messages`), { senderId: user.uid, text: newMessage.trim(), fileURL, fileName, createdAt: serverTimestamp() });
          setNewMessage(''); setFile(null);
        } catch (err: any) {
          console.error(err);
          toast({ variant: 'destructive', title: 'Upload failed', description: err.message || 'Could not upload file' });
        } finally {
          setUploading(false);
        }
      };          

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } };
    
    const handleCloseEngagementClick = () => {
        if (!engagement?.advisorProposal?.milestones) return;

        const notAcceptedMilestones = engagement.advisorProposal.milestones.filter(
            m => m.status !== 'accepted'
        );

        if (notAcceptedMilestones.length > 0) {
            const milestoneTitles = notAcceptedMilestones.map(m => `"${m.description}"`).join(', ');
            setCloseEngagementMessage(`The following milestones have not been accepted yet: ${milestoneTitles}. Closing the engagement is final and will move the room to a view-only state. Are you sure you want to proceed?`);
        } else {
            setCloseEngagementMessage('Are you sure you want to permanently close this engagement? The room will become view-only.');
        }
        setCloseEngagementAlertOpen(true);
    };

    const confirmCloseEngagement = async () => {
        if (!engagementId) return;
        setIsClosing(true);
        try {
            const closeEngagementFn = httpsCallable(functions, 'closeEngagement');
            await closeEngagementFn({ engagementId });
            toast({ title: 'Engagement Closed' });
            setCloseEngagementAlertOpen(false);
        } catch (error: any) {
            console.error("Error closing engagement:", error);
            toast({ variant: 'destructive', title: 'Error', description: error.message || 'Could not close engagement.' });
        } finally {
            setIsClosing(false);
        }
    };

    const formatTimestamp = (ts: Timestamp | undefined) => ts ? new Date(ts.seconds * 1000).toLocaleString() : 'N/A';

    const isParticipant = user && engagement && (user.uid === engagement.developerId || user.uid === engagement.advisorId);
    const isRoomActive = engagement?.status === 'active';
    const isRoomReadOnly = engagement?.status === 'closed' || engagement?.status === 'participant_deleted';

    if (loading) return <EngagementRoomSkeleton />;
    if (!engagement || !isParticipant || !user) return <div>Engagement not found or access denied.</div>;

    return (
        <div className="container mx-auto p-4 space-y-2">
            {/* Page-level alert for deleted participant */}
            {engagement.status === 'participant_deleted' && (
                <div className="flex items-center justify-center p-4 mb-4 rounded-lg bg-yellow-100/50 text-yellow-800 border border-yellow-200/80">
                    <UserX className="mr-3 h-5 w-5" />
                    <p className="text-sm font-medium">This engagement is frozen because the other participant has deleted their account. The room is now read-only.</p>
                </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
                <div className="lg:col-span-2 space-y-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Engagement Room</CardTitle>
                            <CardDescription>Status: <span className={`font-bold ${isRoomActive ? 'text-green-500' : 'text-red-500'}`}>{engagement.status.replace('_', ' ')}</span></CardDescription>
                        </CardHeader>
                        <CardContent className="h-[500px] overflow-y-auto border-y p-4 space-y-2">
                            {messages.map(msg => (
                                <div key={msg.id} className={`flex ${msg.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`p-3 rounded-lg max-w-md ${msg.senderId === user?.uid ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                        <p style={{ whiteSpace: 'pre-wrap' }}><Linkify text={msg.text} /></p>
                                        {msg.fileURL && <a href={msg.fileURL} target="_blank" rel="noopener noreferrer" className="text-sm underline mt-2 block">{msg.fileName || 'View Attachment'}</a>}
                                    </div>
                                </div>
                            ))}
                             <div ref={messagesEndRef} />
                        </CardContent>
                        <div className="p-4 space-y-2">
                            {isBlocked ? (
                                <div className="flex items-center justify-center p-4 rounded-lg bg-destructive/10 text-destructive-foreground"><ShieldAlert className="mr-3 h-5 w-5" /><p className="text-sm font-medium">Messaging disabled.</p></div>
                            ) : isRoomReadOnly ? (
                                <div className="flex items-center justify-center p-4 rounded-lg bg-gray-100 text-gray-600">
                                    <p className="text-sm font-medium">This room is read-only.</p>
                                </div>
                            ) : (
                                <>
                                    {(file || uploading) && <div className="bg-muted/50 p-2 rounded-md mb-2 text-sm"><div className="flex items-center justify-between"><span>{file?.name || 'Uploading...'}</span>{!uploading && <Button size="icon" variant="ghost" onClick={() => setFile(null)}><XCircle className="h-4 w-4"/></Button>}</div></div>}
                                    <div className="flex items-start gap-2">
                                        <Textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message... (Shift + Enter for new line)" onKeyDown={handleKeyDown} rows={1} className="flex-1 min-h-[40px] resize-none no-scrollbar"/>
                                        <Button asChild variant="outline" size="icon"><label htmlFor="file-upload" className="cursor-pointer"><Paperclip className="h-4 w-4"/></label></Button>
                                        <input id="file-upload" type="file" className="hidden" onChange={handleFileChange}/>
                                        <Button onClick={handleSendMessage} disabled={uploading || (!newMessage.trim() && !file)}>{uploading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}</Button>
                                    </div>
                                </>
                            )}
                        </div>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle className="text-base font-semibold">Milestone Progress</CardTitle></CardHeader>
                        <CardContent>
                            <Accordion type="single" collapsible className="w-full">
                                {engagement.advisorProposal?.milestones?.map((milestone) => (
                                    <AccordionItem value={milestone.id} key={milestone.id} disabled={isRoomReadOnly}>
                                        <AccordionTrigger className="text-sm font-semibold">{milestone.description}</AccordionTrigger>
                                        <AccordionContent>
                                            <div className="space-y-3">
                                                <p className="text-sm text-muted-foreground">{milestone.deliverable}</p>
                                                <div className="text-xs text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1">
                                                    <p><b>Timeline:</b> {milestone.timeline}</p>
                                                    <p><b>Status:</b> <span className="font-medium text-primary">{milestone.status}</span></p>
                                                    {milestone.startedAt && <p><b>Started:</b> {formatTimestamp(milestone.startedAt)}</p>}
                                                    {milestone.completedAt && <p><b>Completed:</b> {formatTimestamp(milestone.completedAt)}</p>}
                                                </div>
                                                {user?.uid === engagement.advisorId && milestone.status === 'pending' && !isRoomReadOnly && (
                                                    <Button size="sm" className="mt-2" onClick={() => handleStartMilestone(milestone.id)} disabled={startingMilestone === milestone.id}>
                                                        {startingMilestone === milestone.id ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Starting...</> : <><PlayCircle className="mr-2 h-4 w-4" /> Start Milestone</>}
                                                    </Button>
                                                )}
                                                {user?.uid === engagement.advisorId && milestone.status === 'in_progress' && !isRoomReadOnly && (
                                                    <Button size="sm" className="mt-2" onClick={() => setOpenSubmitDialogs(prev => ({ ...prev, [milestone.id]: true }))}>
                                                        <Edit className="mr-2 h-4 w-4" /> Submit Work
                                                    </Button>
                                                )}
                                                {user?.uid === engagement.developerId && milestone.status === 'submitted' && !isRoomReadOnly && (
                                                    <Button size="sm" className="mt-2" onClick={() => { setSelectedMilestone(milestone); setAcceptWorkDialogOpen(true); }}>Review & Accept</Button>
                                                )}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </CardContent>
                    </Card>

                    <Card><CardHeader><CardTitle className="text-base font-semibold">Outcome Log</CardTitle></CardHeader><CardContent><OutcomeLog engagement={engagement} /></CardContent></Card>
                </div>

                <div className="space-y-2">
                    <Card><CardHeader><CardTitle className="text-base">Engagement Details</CardTitle></CardHeader><CardContent className="space-y-4">
                        <div><h4 className="font-semibold text-sm">Advisor</h4><div className="flex items-center gap-2 mt-1"><Avatar className="h-10 w-10"><AvatarImage src={engagement.advisorPhotoURL}/><AvatarFallback>{engagement.advisorName[0]}</AvatarFallback></Avatar><div><p>{engagement.advisorName}</p><p className="text-sm text-muted-foreground">{engagement.advisorHeadline}</p></div></div></div>
                        <div><h4 className="font-semibold text-sm">Developer</h4><div className="flex items-center gap-2 mt-1"><Avatar className="h-10 w-10"><AvatarImage src={engagement.developerPhotoURL}/><AvatarFallback>{engagement.developerName[0]}</AvatarFallback></Avatar><p>{engagement.developerName}</p></div></div>
                        <div className="space-y-2"><h3 className="text-sm font-semibold">Negotiation History</h3><Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="developer-request"><AccordionTrigger className="text-sm font-semibold">Developer's Request</AccordionTrigger><AccordionContent><RequestDetails engagement={engagement} /></AccordionContent></AccordionItem>
                            {engagement.advisorProposal && <AccordionItem value="advisor-proposal"><AccordionTrigger className="text-sm font-semibold">Advisor's Proposal</AccordionTrigger><AccordionContent><ProposalDetails engagement={engagement} /></AccordionContent></AccordionItem>}
                            {engagement.developerRevisionNote && <AccordionItem value="revision-note"><AccordionTrigger className="text-sm font-semibold">Developer's Revision Note</AccordionTrigger><AccordionContent><p className="p-3 bg-yellow-50 rounded-md text-yellow-800 text-sm border border-yellow-200">{engagement.developerRevisionNote}</p></AccordionContent></AccordionItem>}
                        </Accordion></div>
                    </CardContent></Card>
                    <Card><CardHeader><CardTitle className="text-base font-semibold">Video Sessions</CardTitle></CardHeader><CardContent>{isRoomActive ? <EngagementVideo engagement={engagement} /> : <p className='text-sm text-muted-foreground'>Video sessions are for active engagements.</p>}</CardContent></Card>
                    {!isRoomReadOnly && <Card className="border-destructive"><CardHeader><CardTitle className="text-base">Danger Zone</CardTitle><CardDescription>Closing the engagement is final.</CardDescription></CardHeader><CardContent><Button variant="destructive" onClick={handleCloseEngagementClick} disabled={isClosing}>{isClosing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Closing...</> : 'Close Engagement'}</Button></CardContent></Card>}
                    {engagement.status === 'closed' && user?.uid === engagement.developerId && <Card><CardHeader><CardTitle className="text-base">Engagement Closed</CardTitle></CardHeader><CardContent className="flex flex-col gap-4">{hasReviewed ? <><p className='text-sm text-muted-foreground'>You&apos;ve already reviewed.</p><Button asChild><Link href={`/advisory/${engagement.advisorId}`}>View Advisor Profile</Link></Button></> : <><p className='text-sm text-muted-foreground'>This engagement is closed. Leave a review for your advisor.</p><Button asChild><Link href={`/engagements/${engagementId}/review`}>Leave a Review</Link></Button></>}</CardContent></Card>}
                </div>
            </div>

            <AlertDialog open={closeEngagementAlertOpen} onOpenChange={setCloseEngagementAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>{closeEngagementMessage}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmCloseEngagement} disabled={isClosing}>{isClosing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Closing...</> : 'Confirm & Close'}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {engagement.advisorProposal?.milestones?.map((milestone) => (
                 <SubmitWorkDialog
                    key={milestone.id}
                    open={openSubmitDialogs[milestone.id] || false}
                    onOpenChange={(isOpen) => setOpenSubmitDialogs(prev => ({ ...prev, [milestone.id]: isOpen }))}
                    milestone={milestone}
                    engagementId={engagementId as string}
                />
            ))}
            {selectedMilestone && <AcceptWorkDialog open={acceptWorkDialogOpen} onOpenChange={setAcceptWorkDialogOpen} milestone={selectedMilestone} engagementId={engagementId as string}/>}
        </div>
    );
};

export default EngagementRoomPage;
