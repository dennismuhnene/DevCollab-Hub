'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, updateDoc, collection, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase/config';
import { useAuth } from '@/lib/hooks/use-auth';
import { Engagement, EngagementMessage } from '@/types/advisor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Paperclip, Send, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

const EngagementRoomPage = () => {
    const { engagementId } = useParams();
    const { user, userProfile } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [engagement, setEngagement] = useState<Engagement | null>(null);
    const [messages, setMessages] = useState<EngagementMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (typeof engagementId !== 'string') return;
        const unsubEngagement = onSnapshot(doc(db, 'engagements', engagementId), (doc) => {
            if (doc.exists()) {
                const engData = { id: doc.id, ...doc.data() } as Engagement;
                setEngagement(engData);
                // Security check
                if (user && user.uid !== engData.developerId && user.uid !== engData.advisorId) {
                    toast({ variant: 'destructive', title: 'Access Denied', description: 'You are not a participant in this engagement.'});
                    router.push('/dashboard');
                }
            } else {
                toast({ variant: 'destructive', title: 'Not Found', description: 'This engagement does not exist.'});
                router.push('/dashboard');
            }
            setLoading(false);
        });

        const messagesQuery = query(collection(db, `engagements/${engagementId}/messages`), orderBy('createdAt', 'asc'));
        const unsubMessages = onSnapshot(messagesQuery, (snapshot) => {
            const msgs: EngagementMessage[] = [];
            snapshot.forEach(doc => msgs.push({ id: doc.id, ...doc.data() } as EngagementMessage));
            setMessages(msgs);
        });

        return () => {
            unsubEngagement();
            unsubMessages();
        };
    }, [engagementId, user, router, toast]);

    const handleSendMessage = async () => {
        if (!user || (!newMessage.trim() && !file) || typeof engagementId !== 'string') return;

        const isRoomActive = engagement?.status === 'active';
        if (!isRoomActive) {
            toast({ variant: 'destructive', title: 'Room Not Active', description: 'You can only send messages in an active engagement.'});
            return;
        }

        let fileURL = '';
        if (file) {
            setUploading(true);
            const storageRef = ref(storage, `engagements/${engagementId}/${file.name}`);
            const uploadTask = uploadBytesResumable(storageRef, file);
            try {
                await uploadTask;
                fileURL = await getDownloadURL(uploadTask.snapshot.ref);
                setFile(null);
            } catch (error) {
                console.error("Upload failed:", error);
                toast({ variant: 'destructive', title: 'File Upload Failed'});
                setUploading(false);
                return;
            } finally {
                setUploading(false);
            }
        }

        const messageData: Omit<EngagementMessage, 'id'> = {
            senderId: user.uid,
            text: newMessage,
            createdAt: serverTimestamp(),
            fileURL: fileURL,
            fileName: file?.name || '',
        };

        await addDoc(collection(db, `engagements/${engagementId}/messages`), messageData);
        setNewMessage('');
    };

    const handleCloseEngagement = async () => {
        if (typeof engagementId !== 'string') return;
        const engagementRef = doc(db, 'engagements', engagementId);
        await updateDoc(engagementRef, {
            status: 'closed',
            closedAt: serverTimestamp()
        });
        toast({ title: 'Engagement Closed', description: 'This engagement has been successfully closed.'});
    };

    const isParticipant = user && engagement && (user.uid === engagement.developerId || user.uid === engagement.advisorId);
    const isRoomActive = engagement?.status === 'active';

    if (loading) return <div>Loading engagement...</div>;
    if (!engagement || !isParticipant) return <div>Engagement not found or access denied.</div>

    return (
        <div className="container mx-auto p-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Chat & Activity */}
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
                                        <p>{msg.text}</p>
                                        {msg.fileURL && (
                                            <a href={msg.fileURL} target="_blank" rel="noopener noreferrer" className="text-sm underline mt-2 block">
                                                {msg.fileName || 'View Attached File'}
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                        <div className="p-4">
                            {file && (
                                <div className="flex items-center justify-between bg-muted/50 p-2 rounded-md mb-2">
                                    <span className="text-sm">{file.name}</span>
                                    <Button size="icon" variant="ghost" onClick={() => setFile(null)}><XCircle className="h-4 w-4"/></Button>
                                </div>
                            )}
                             <div className="flex items-center gap-2">
                                <Input 
                                    type="text" 
                                    value={newMessage} 
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder={isRoomActive ? "Type a message..." : "This room is not active."}
                                    disabled={!isRoomActive || uploading}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                />
                                <Button asChild variant="outline" size="icon" disabled={!isRoomActive || uploading}>
                                    <label htmlFor="file-upload" className="cursor-pointer"><Paperclip className="h-4 w-4"/></label>
                                </Button>
                                <input id="file-upload" type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} disabled={!isRoomActive || uploading}/>
                                <Button onClick={handleSendMessage} disabled={!isRoomActive || uploading}><Send className="h-4 w-4"/></Button>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Right Column: Context & Actions */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Engagement Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <h4 className="font-semibold">Advisor</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <Avatar className="h-10 w-10"><AvatarImage src={engagement.advisorInfo.photoURL}/><AvatarFallback>{engagement.advisorInfo.name[0]}</AvatarFallback></Avatar>
                                    <div>
                                        <p>{engagement.advisorInfo.name}</p>
                                        <p className="text-sm text-muted-foreground">{engagement.advisorInfo.headline}</p>
                                    </div>
                                </div>
                            </div>
                             <div>
                                <h4 className="font-semibold">Developer</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <Avatar className="h-10 w-10"><AvatarImage src={engagement.developerInfo.photoURL}/><AvatarFallback>{engagement.developerInfo.name[0]}</AvatarFallback></Avatar>
                                    <p>{engagement.developerInfo.name}</p>
                                </div>
                            </div>
                            <div>
                                <h4 className="font-semibold">Request Message</h4>
                                <p className="text-sm text-muted-foreground mt-1 bg-gray-50 p-3 rounded-md">{engagement.requestMessage}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
                        <CardContent className="flex flex-col gap-4">
                             {engagement.status === 'active' && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive">Close Engagement</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>This will close the engagement, and no more messages can be sent. This action cannot be undone.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleCloseEngagement}>Confirm & Close</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                            {engagement.status === 'closed' && user?.uid === engagement.developerId && (
                                <Button asChild>
                                    <Link href={`/engagements/${engagementId}/review`}>Leave a Review</Link>
                                </Button>
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
