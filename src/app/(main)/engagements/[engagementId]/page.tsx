'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, updateDoc, collection, addDoc, serverTimestamp, query, orderBy, Unsubscribe } from 'firebase/firestore';
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
import { Paperclip, Send, XCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';


const EngagementRoomPage = () => {
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
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_FILE_TYPES = [
        'image/jpeg', 'image/png', 'image/gif', 'application/pdf', 
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .doc, .docx
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xls, .xlsx
        'text/plain'
    ];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (typeof engagementId !== 'string' || !user) return;
        let unsubMessages: Unsubscribe | null = null;

        const unsubEngagement = onSnapshot(doc(db, 'engagements', engagementId), (engagementDoc) => {
            if (engagementDoc.exists()) {
                const engData = { id: engagementDoc.id, ...engagementDoc.data() } as Engagement;
                if (user.uid !== engData.developerId && user.uid !== engData.advisorId) {
                    toast({ variant: 'destructive', title: 'Access Denied', description: 'You are not a participant in this engagement.'});
                    router.push('/dashboard');
                    return;
                }
                setEngagement(engData);

                // Always fetch messages for a valid engagement
                const messagesQuery = query(collection(db, `engagements/${engagementId}/messages`), orderBy('createdAt', 'asc'));
                unsubMessages = onSnapshot(messagesQuery, (snapshot) => {
                    const msgs: EngagementMessage[] = [];
                    snapshot.forEach(doc => msgs.push({ id: doc.id, ...doc.data() } as EngagementMessage));
                    setMessages(msgs);
                });
                
                setLoading(false);
            } else {
                toast({ variant: 'destructive', title: 'Not Found', description: 'This engagement does not exist.'});
                router.push('/dashboard');
                setLoading(false);
            }
        });

        return () => {
            unsubEngagement();
            if (unsubMessages) unsubMessages();
        };
    }, [engagementId, user, router, toast]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        if (selectedFile.size > MAX_FILE_SIZE) {
            toast({ variant: 'destructive', title: 'File too large', description: `Please select a file smaller than ${MAX_FILE_SIZE / 1024 / 1024}MB.` });
            return;
        }

        if (!ALLOWED_FILE_TYPES.includes(selectedFile.type)) {
            toast({ variant: 'destructive', title: 'Invalid file type', description: 'Please select a valid file type (images, PDFs, documents).' });
            return;
        }

        setFile(selectedFile);
        e.target.value = ''; // Reset input to allow re-selecting the same file
    };

    const handleSendMessage = async () => {
        if (!user) {
          toast({ variant: 'destructive', title: 'Authentication required', description: 'Please sign in to send messages.' });
          return;
        }
      
        if ((!newMessage.trim() && !file) || typeof engagementId !== 'string') return;
        if (engagement?.status !== 'active') {
          toast({ variant: 'destructive', title: 'Room not active' });
          return;
        }
      
        try {
          let fileURL = '';
          let fileName = '';
      
          if (file) {
            setUploading(true);
            const filePath = `engagements/${engagementId}/${Date.now()}_${file.name}`;
            const storageRef = ref(storage, filePath);
      
            await uploadBytes(storageRef, file);
            fileURL = await getDownloadURL(storageRef);
            fileName = file.name;
          }
      
          await addDoc(collection(db, `engagements/${engagementId}/messages`), {
            senderId: user.uid,
            text: newMessage.trim(),
            fileURL,
            fileName,
            createdAt: serverTimestamp(),
          });
      
          setNewMessage('');
          setFile(null);
        } catch (err: any) {
          console.error(err);
          toast({
            variant: 'destructive',
            title: 'Upload failed',
            description: err.message || 'Could not upload file',
          });
        } finally {
          setUploading(false);
        }
      };          

    const sendMessageWithAttachment = async (fileURL: string, fileName: string) => {
        if (!user || typeof engagementId !== 'string') return;
        const messageData: Omit<EngagementMessage, 'id'> = {
            senderId: user.uid,
            text: newMessage.trim(),
            createdAt: serverTimestamp(),
            fileURL: fileURL,
            fileName: fileName,
        };
        await addDoc(collection(db, `engagements/${engagementId}/messages`), messageData);
        setNewMessage('');
    };

    const resetUploadState = () => {
        setFile(null);
        setUploading(false);
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleCloseEngagement = async () => {
        if (typeof engagementId !== 'string') return;
        await updateDoc(doc(db, 'engagements', engagementId), { status: 'closed', closedAt: serverTimestamp() });
        toast({ title: 'Engagement Closed', description: 'This engagement has been successfully closed.'});
    };

    const isParticipant = user && engagement && (user.uid === engagement.developerId || user.uid === engagement.advisorId);
    const isRoomActive = engagement?.status === 'active';

    if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    if (!engagement || !isParticipant) return <div>Engagement not found or access denied.</div>

    return (
        <div className="container mx-auto p-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Engagement Room</CardTitle>
                            <CardDescription>Status: <span className={`font-bold ${isRoomActive ? 'text-green-500' : 'text-red-500'}`}>{engagement.status}</span></CardDescription>
                        </CardHeader>
                        <CardContent className="h-[500px] overflow-y-auto border-y p-4 space-y-4">
                            {messages.map(msg => (
                                <div key={msg.id} className={`flex ${msg.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`p-3 rounded-lg max-w-md ${msg.senderId === user?.uid ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                        <p style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                                        {msg.fileURL && (
                                            <a href={msg.fileURL} target="_blank" rel="noopener noreferrer" className="text-sm underline mt-2 block">
                                                {msg.fileName || 'View Attached File'}
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                             <div ref={messagesEndRef} />
                        </CardContent>
                        <div className="p-4 space-y-2">
                            {(file || uploading) && (
                                <div className="bg-muted/50 p-2 rounded-md mb-2 text-sm">
                                    <div className="flex items-center justify-between">
                                        <span>{file?.name || 'Uploading...'}</span>
                                        {!uploading && <Button size="icon" variant="ghost" onClick={() => setFile(null)}><XCircle className="h-4 w-4"/></Button>}
                                    </div>
                                </div>
                            )}
                             <div className="flex items-start gap-2">
                                <Textarea 
                                    value={newMessage} 
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder={isRoomActive ? "Type a message... (Shift + Enter for new line)" : "This room is not active."}
                                    disabled={!isRoomActive || uploading}
                                    onKeyDown={handleKeyDown}
                                    rows={1}
                                    className="flex-1 min-h-[40px] resize-none no-scrollbar"
                                />
                                <Button asChild variant="outline" size="icon" disabled={!isRoomActive || uploading}>
                                    <label htmlFor="file-upload" className="cursor-pointer">
                                        <Paperclip className="h-4 w-4"/>
                                    </label>
                                </Button>
                                <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} disabled={!isRoomActive || uploading}/>
                                <Button onClick={handleSendMessage} disabled={!isRoomActive || uploading || (!newMessage.trim() && !file)}>
                                    {uploading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
                <div className="space-y-6">
                    <Card>
                        <CardHeader><CardTitle>Engagement Details</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <h4 className="font-semibold">Advisor</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <Avatar className="h-10 w-10"><AvatarImage src={engagement.advisorPhotoURL}/><AvatarFallback>{engagement.advisorName[0]}</AvatarFallback></Avatar>
                                    <div>
                                        <p>{engagement.advisorName}</p>
                                        <p className="text-sm text-muted-foreground">{engagement.advisorHeadline}</p>
                                    </div>
                                </div>
                            </div>
                             <div>
                                <h4 className="font-semibold">Developer</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <Avatar className="h-10 w-10"><AvatarImage src={engagement.developerPhotoURL}/><AvatarFallback>{engagement.developerName[0]}</AvatarFallback></Avatar>
                                    <p>{engagement.developerName}</p>
                                </div>
                            </div>
                            <div>
                                <h4 className="font-semibold">Request Message</h4>
                                <p className="text-sm text-muted-foreground mt-1 bg-gray-50 p-3 rounded-md">{engagement.message}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
                        <CardContent className="flex flex-col gap-4">
                             {isRoomActive && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild><Button variant="destructive">Close Engagement</Button></AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will close the engagement. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleCloseEngagement}>Confirm & Close</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                            {engagement.status === 'closed' && user?.uid === engagement.developerId && (
                                <Button asChild><Link href={`/engagements/${engagementId}/review`}>Leave a Review</Link></Button>
                            )}
                            {engagement.status === 'requested' && (<p className='text-sm text-muted-foreground'>Waiting for advisor to accept.</p>)}
                            {engagement.status === 'closed' && (<p className='text-sm text-muted-foreground'>This engagement is closed.</p>)}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default EngagementRoomPage;
