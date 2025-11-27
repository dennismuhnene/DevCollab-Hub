
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, arrayRemove, arrayUnion, documentId, serverTimestamp, addDoc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase/config';
import { useAuth } from '@/lib/hooks/use-auth';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import type { Project, UserProfile, Match } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Hand, Undo, Edit, Trash2, Code, BrainCircuit, Clock, UserCheck, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { updateDocumentNonBlocking, deleteDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { createMatch } from '@/lib/firebase/matches';
import { addNotification, markInterestNotificationsAsRead } from '@/lib/firebase/notifications';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useMemoFirebase } from '@/firebase';

interface UserWithId extends UserProfile {
  id: string;
}

export default function ProjectDetailsPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const projectRef = useMemoFirebase(() => projectId ? doc(db, 'projects', projectId) : null, [projectId]);
  const { data: project, isLoading: projectLoading, error: projectError } = useDoc<Project>(projectRef);

  const [owner, setOwner] = useState<UserProfile | null>(null);
  const [interestedUsers, setInterestedUsers] = useState<UserWithId[]>([]);
  const [matchedUsers, setMatchedUsers] = useState<UserWithId[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [isInterested, setIsInterested] = useState(false);
  const [isMatched, setIsMatched] = useState(false);
  const [isInterestLoading, setIsInterestLoading] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchedInfo, setMatchedInfo] = useState<{ projectName: string; devName: string; matchId: string } | null>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);
  
  useEffect(() => {
    if (projectError) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load project data.' });
      router.push('/projects');
    }
  }, [projectError, toast, router]);

  useEffect(() => {
    if (!project) return;
    
    setLoadingUsers(true);

    const fetchAssociatedUsers = async () => {
        // Fetch owner
        const ownerDocRef = doc(db, 'users', project.ownerId);
        const ownerDoc = await getDoc(ownerDocRef);
        if (ownerDoc.exists()) {
          setOwner({ uid: ownerDoc.id, ...ownerDoc.data() } as UserProfile);
        }

        if (user) {
          setIsOwner(project.ownerId === user.uid);
          setIsInterested(project.interestedUsers?.includes(user.uid) || false);
          setIsMatched(project.matchedUsers?.includes(user.uid) || false);
          
          if (project.ownerId !== user.uid) {
            const viewsRef = collection(db, 'projects', project.id, 'views');
            addDocumentNonBlocking(viewsRef, {
              visitorId: user.uid,
              timestamp: serverTimestamp(),
            });
          }
          
          // If the current user is the owner, mark interest notifications as read
          if (project.ownerId === user.uid) {
            markInterestNotificationsAsRead(user.uid, project.id);
          }
        }
        
        const fetchUsersByIds = async (ids: string[]) => {
          if (!ids || ids.length === 0) return [];
          // Firestore 'in' query is limited to 30 elements.
          const userChunks = [];
          for (let i = 0; i < ids.length; i += 30) {
            userChunks.push(ids.slice(i, i + 30));
          }
          const userPromises = userChunks.map(chunk => 
            getDocs(query(collection(db, 'users'), where(documentId(), 'in', chunk)))
          );
          const userSnapshots = await Promise.all(userPromises);
          return userSnapshots.flatMap(snap => snap.docs.map(d => ({ id: d.id, ...d.data() } as UserWithId)));
        };
        
        // Only the owner needs to see the list of interested users
        if (project.ownerId === user?.uid) {
           const interested = await fetchUsersByIds(project.interestedUsers || []);
           setInterestedUsers(interested);
        }

        const matched = await fetchUsersByIds(project.matchedUsers || []);
        setMatchedUsers(matched);

        setLoadingUsers(false);
    };

    fetchAssociatedUsers();
  }, [project, user]);

  const handleInterest = async () => {
    if (!user || !userProfile || !project) return;
    
    setIsInterestLoading(true);
    const wasInterested = isInterested;
    // UI state is now handled by the real-time listener, no need to setIsInterested here.
    
    const projectRef = doc(db, 'projects', project.id);
    const updateData = {
        interestedUsers: wasInterested ? arrayRemove(user.uid) : arrayUnion(user.uid)
    };
    
    updateDocumentNonBlocking(projectRef, updateData);

    if (!wasInterested) {
        try {
            await addNotification(project.ownerId, {
                type: 'interest',
                fromUserId: user.uid,
                fromUserName: userProfile.name,
                projectId: project.id,
                projectTitle: project.title,
                read: false,
            });
             toast({
                title: 'Interest expressed!',
                description: 'The project owner has been notified.',
            });
        } catch (e) {
            console.error("Failed to send interest notification:", e);
             toast({
                title: 'Interest expressed!',
                description: 'But failed to notify the owner.',
            });
        }
    } else {
         toast({
            title: 'Interest removed',
        });
    }
    
    setIsInterestLoading(false);
  };
  
  const handleMatch = async (interestedUser: UserWithId) => {
    if (!user || !userProfile || !project) return;
    try {
      const matchId = await createMatch(user.uid, interestedUser.id, project.id, project.title);
      
      const projectRef = doc(db, 'projects', project.id);
      // Let the real-time listener handle UI updates.
      updateDocumentNonBlocking(projectRef, {
        interestedUsers: arrayRemove(interestedUser.id),
        matchedUsers: arrayUnion(interestedUser.id),
        updatedAt: serverTimestamp(),
      });

      addNotification(interestedUser.id, {
        type: 'match',
        fromUserId: user.uid,
        fromUserName: userProfile.name,
        matchId: matchId,
        projectId: project.id,
        projectTitle: project.title,
        read: false,
      });

      addNotification(user.uid, {
        type: 'match',
        fromUserId: interestedUser.name,
        fromUserName: interestedUser.name,
        matchId: matchId,
        projectId: project.id,
        projectTitle: project.title,
        read: false,
      });

      setMatchedInfo({ projectName: project.title, devName: interestedUser.name, matchId: matchId });
      setShowMatchModal(true);

    } catch (error) {
       console.error("Failed to create match:", error);
       toast({ variant: 'destructive', title: 'Matching Failed', description: error instanceof Error ? error.message : 'An unknown error occurred.' });
    }
  };

  const handleGoToMessage = async (matchedUserId: string) => {
    if (!user || !project) return;
  
    try {
      const matchesRef = collection(db, 'matches');
      const q = query(
        matchesRef,
        where('projectId', '==', project.id),
        where('participants', 'array-contains', user.uid)
      );
  
      const querySnapshot = await getDocs(q);
      let matchDoc = querySnapshot.docs.find(doc => 
        (doc.data() as Match).participants.includes(matchedUserId)
      );
  
      if (matchDoc) {
        router.push(`/messages/${matchDoc.id}`);
      } else {
        toast({
          title: 'Conversation not found',
          description: 'Creating a new conversation for this project match...',
        });
        const newMatchId = await createMatch(user.uid, matchedUserId, project.id, project.title);
        router.push(`/messages/${newMatchId}`);
      }
    } catch (error) {
      console.error('Error finding or creating match:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not start the conversation. Please try again.',
      });
    }
  };

  const handleDeleteProject = async () => {
    if (!project || !user || !isOwner) return;
    setLoadingUsers(true);

    try {
      if (project.imageUrl) {
        const { ref, deleteObject } = await import('firebase/storage');
        const imageRef = ref(storage, project.imageUrl);
        await deleteObject(imageRef).catch(err => console.warn("Image deletion failed, may not exist", err));
      }
      
      const projectRef = doc(db, 'projects', project.id);
      deleteDocumentNonBlocking(projectRef);

      toast({ title: 'Project deleted successfully' });
      router.push('/projects');

    } catch (error: any) {
      console.error("Project deletion error:", error);
      toast({ variant: 'destructive', title: 'Error deleting project', description: error.message });
      setLoadingUsers(false);
    }
  };
  
  const defaultProjectImage = PlaceHolderImages.find(p => p.id === 'project-1')?.imageUrl || "https://picsum.photos/seed/default/1200/800";
  
  const formatExperience = (years?: number) => {
    if (years === undefined) return 'Not specified';
    if (years < 1) {
      const months = Math.round(years * 12);
      return `${months} month${months !== 1 ? 's' : ''}`;
    }
    return `${years} year${years !== 1 ? 's' : ''}`;
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0]).join('');
  };
  
  const loading = authLoading || projectLoading || loadingUsers || !user;

  if (loading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="h-10 w-3/4 mb-4" />
        <Skeleton className="h-6 w-1/2 mb-8" />
        <Skeleton className="w-full h-96 mb-8" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!project) {
    return <div className="text-center py-20">Project not found.</div>;
  }
  
  const uniqueMatchedUsers = matchedUsers.filter((v,i,a)=>a.findIndex(t=>(t.id === v.id))===i);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-2">{project.title}</h1>
        {owner && (
          <div className="flex items-center space-x-2 text-muted-foreground">
            <Avatar className="h-6 w-6">
              <AvatarImage src={owner.photoURL} />
              <AvatarFallback>{owner.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <span>by {owner.name}</span>
          </div>
        )}
      </div>

      <div className="aspect-[3/2] w-full overflow-hidden rounded-lg mb-8 shadow-lg">
        <Image
          src={project.imageUrl || defaultProjectImage}
          alt={project.title}
          width={1200}
          height={800}
          className="h-full w-full object-cover"
          priority
          data-ai-hint="technology code"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <h2 className="text-2xl font-semibold">About this project</h2>
          <p className="text-lg leading-relaxed text-foreground/80">{project.description}</p>
          
          {isOwner && (
            <Card>
              <CardHeader>
                <CardTitle>Collaboration Hub</CardTitle>
              </CardHeader>
              <CardContent>
                {interestedUsers.length > 0 ? (
                  <div className="mb-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2"><Hand className="h-5 w-5 text-yellow-500"/>Interested Developers</h3>
                    <ul className="space-y-4">
                      {interestedUsers.map(interested => (
                        <li key={interested.id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                             <Avatar>
                              <AvatarImage src={interested.photoURL} />
                              <AvatarFallback>{getInitials(interested.name)}</AvatarFallback>
                            </Avatar>
                            <Link href={`/developers/${interested.id}`} className="font-medium hover:underline">{interested.name}</Link>
                          </div>
                          <Button size="sm" onClick={() => handleMatch(interested)}>Match</Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : <p className="text-muted-foreground text-sm mb-6">No one has shown interest yet.</p>}

                 {uniqueMatchedUsers.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-4 flex items-center gap-2"><UserCheck className="h-5 w-5 text-green-500"/>Matched Developers</h3>
                     <ul className="space-y-4">
                      {uniqueMatchedUsers.map(matchedUser => (
                        <li key={matchedUser.id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                             <Avatar>
                              <AvatarImage src={matchedUser.photoURL} />
                              <AvatarFallback>{getInitials(matchedUser.name)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{matchedUser.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/developers/${matchedUser.id}`}>Profile</Link>
                            </Button>
                             <Button size="sm" onClick={() => handleGoToMessage(matchedUser.id)}>
                               <MessageSquare className="mr-2 h-4 w-4"/>
                               Message
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

        </div>
        
        <div className="space-y-6">
          <div className="flex flex-col space-y-2">
            {isOwner ? (
              <div className="flex gap-2">
                <Button size="lg" className="w-full" asChild>
                    <Link href={`/projects/${project.id}/edit`}>
                        <Edit className="mr-2 h-4 w-4"/>
                        Edit Project
                    </Link>
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="destructive">
                      <Trash2 className="h-4 w-4"/>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your project and remove its data from our servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteProject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ) : isMatched ? (
                 <div className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-green-500 bg-green-500/10 p-4 text-center">
                    <UserCheck className="h-8 w-8 text-green-500" />
                    <p className="font-semibold text-green-700 dark:text-green-400">You're Matched!</p>
                    <Button size="sm" className="w-full" onClick={() => handleGoToMessage(project.ownerId)}>
                        <MessageSquare className="mr-2 h-4 w-4"/>
                        Go to Conversation
                    </Button>
                 </div>
            ) : (
              <Button size="lg" className="w-full" onClick={handleInterest} disabled={!project.collaborationOpen || isInterestLoading}>
                {project.collaborationOpen ? (
                  isInterested ? (
                    <>
                      <Undo className="mr-2 h-4 w-4" />
                      Remove Interest
                    </>
                  ) : (
                    <>
                      <Hand className="mr-2 h-4 w-4" />
                      I&apos;m interested
                    </>
                  )
                ) : (
                  "Collaboration Closed"
                )}
              </Button>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Required Experience</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold text-lg">{formatExperience(project.requiredYearsOfExperience)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Code className="h-4 w-4"/>Required Tech Stack</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {project.requiredTechStack?.map((tech) => (
                <Badge key={tech} variant="secondary">{tech}</Badge>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><BrainCircuit className="h-4 w-4"/>Required Skills</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {project.requiredSkills?.map((skill) => (
                <Badge key={skill} variant="outline">{skill}</Badge>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
       <AlertDialog open={showMatchModal} onOpenChange={setShowMatchModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-2xl">It's a Match!</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              You and <span className="font-bold">{matchedInfo?.devName}</span> have matched for the project: <span className="font-bold">{matchedInfo?.projectName}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-center py-4">
            <UserCheck className="h-16 w-16 text-green-500" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.push(`/messages/${matchedInfo?.matchId}`)}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Send a Message
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
