'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove, serverTimestamp, collection, addDoc, query, where, documentId, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/hooks/use-auth';
import type { Project, UserProfile } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Hand, Edit, Trash2, Code, BrainCircuit, Clock, UserCheck, Handshake, Briefcase, UserPlus, UserX, MessageSquare, Github, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';
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
import { addNotification, markInterestNotificationsAsRead } from '@/lib/firebase/notifications';
import { logAnalyticsEvent } from '@/firebase/analytics';

interface UserWithId extends UserProfile {
  id: string;
}

const MAX_REJECTIONS = 3;

export const ProjectDetailsContent = ({ project: initialProject }: { project: Project }) => {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [project, setProject] = useState<Project>(initialProject);
  const [owner, setOwner] = useState<UserProfile | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isInterested, setIsInterested] = useState(false);
  const [isMatched, setIsMatched] = useState(false);
  const [rejectionCount, setRejectionCount] = useState(0);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [matchIdsByUser, setMatchIdsByUser] = useState<Record<string, string>>({});
  const [isInterestLoading, setIsInterestLoading] = useState(false);
  const [interestedUsers, setInterestedUsers] = useState<UserWithId[]>([]);
  const [matchedUsers, setMatchedUsers] = useState<UserWithId[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const isPermanentlyRejected = rejectionCount >= MAX_REJECTIONS;

  const invalidateProjectCache = useCallback(() => {
    try {
      sessionStorage.removeItem(`project_${project.id}`);
    } catch (error) {
      console.warn('Could not remove from session storage', error);
    }
  }, [project.id]);

  useEffect(() => {
    if (!project.id || !user) return;

    const unsubscribe = onSnapshot(doc(db, 'projects', project.id), (docSnap) => {
      if (docSnap.exists()) {
        const projectData = { id: docSnap.id, ...docSnap.data() } as Project;
        setProject(projectData);
        setRejectionCount(projectData.rejections?.[user.uid] || 0);
      }
    });

    return () => unsubscribe();
  }, [project.id, user]);

  useEffect(() => {
    if (!project || !user) return;

    const fetchMatch = async () => {
      if (!project.matchedUsers?.includes(user.uid)) {
        setMatchId(null);
        return;
      }

      const qNew = query(
        collection(db, 'matches'),
        where('contextId', '==', project.id),
        where('participants', 'array-contains', user.uid)
      );

      const qLegacy = query(
        collection(db, 'matches'),
        where('projectId', '==', project.id),
        where('participants', 'array-contains', user.uid)
      );

      const [newSnap, legacySnap] = await Promise.all([getDocs(qNew), getDocs(qLegacy)]);
      const snap = !newSnap.empty ? newSnap : legacySnap;

      if (!snap.empty) {
        setMatchId(snap.docs[0].id);
      }
    };

    fetchMatch();
  }, [project, user]);

  useEffect(() => {
    if (!project || !user) return;

    setLoadingUsers(true);
    const fetchAssociatedUsers = async () => {
      try {
        const ownerDocRef = doc(db, 'users', project.ownerId);
        const ownerDoc = await getDoc(ownerDocRef);
        if (ownerDoc.exists()) setOwner({ uid: ownerDoc.id, ...ownerDoc.data() } as UserProfile);

        setIsOwner(project.ownerId === user.uid);
        setIsInterested(project.interestedUsers?.includes(user.uid) || false);
        setIsMatched(project.matchedUsers?.includes(user.uid) || false);

        if (project.ownerId === user.uid) {
          markInterestNotificationsAsRead(user.uid, project.id);
        }

        const fetchUsersByIds = async (ids: string[]) => {
          if (!ids || ids.length === 0) return [];
          const userChunks = [];
          for (let i = 0; i < ids.length; i += 30) userChunks.push(ids.slice(i, i + 30));
          const userPromises = userChunks.map(chunk => getDocs(query(collection(db, 'users'), where(documentId(), 'in', chunk))));
          const userSnapshots = await Promise.all(userPromises);
          return userSnapshots.flatMap(snap => snap.docs.map(d => ({ ...d.data(), id: d.id } as UserWithId)));
        };

        if (project.ownerId === user.uid) {
          const interested = await fetchUsersByIds(project.interestedUsers || []);
          setInterestedUsers(interested);
        }

        const matched = await fetchUsersByIds(project.matchedUsers || []);
        setMatchedUsers(matched);

        if (project.ownerId === user.uid && matched.length > 0) {
          const qNew = query(
            collection(db, 'matches'),
            where('contextId', '==', project.id),
            where('participants', 'array-contains', user.uid)
          );

          const qLegacy = query(
            collection(db, 'matches'),
            where('projectId', '==', project.id),
            where('participants', 'array-contains', user.uid)
          );

          const [newSnap, legacySnap] = await Promise.all([getDocs(qNew), getDocs(qLegacy)]);
          const snaps = [...newSnap.docs, ...legacySnap.docs];

          const map: Record<string, string> = {};
          snaps.forEach(d => {
            const participants = d.data().participants as string[];
            const other = participants.find(p => p !== user.uid);
            if (other && !map[other]) map[other] = d.id;
          });
          setMatchIdsByUser(map);
        }
      } catch (error) {
        console.error('Error fetching associated users:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load associated user data.' });
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchAssociatedUsers();
  }, [project, user, toast]);

  const handleRestoreAndGoToConversation = async (mId: string) => {
    if (!user) return;
    const matchRef = doc(db, 'matches', mId);
    const snap = await getDoc(matchRef);
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data.deletedBy) && data.deletedBy.includes(user.uid)) {
        await updateDoc(matchRef, { deletedBy: arrayRemove(user.uid) });
      }
    }
    router.push(`/messages/${mId}`);
  };

  const handleInterest = async () => {
    if (!user || !userProfile || !project || isPermanentlyRejected) return;
    setIsInterestLoading(true);
    invalidateProjectCache();

    const wasInterested = isInterested;
    const projectRef = doc(db, 'projects', project.id);

    try {
      if (wasInterested) {
        await updateDoc(projectRef, { interestedUsers: arrayRemove(user.uid) });
        setIsInterested(false);
        toast({ title: 'Interest removed' });
      } else {
        await updateDoc(projectRef, { interestedUsers: arrayUnion(user.uid) });
        setIsInterested(true);

        logAnalyticsEvent('show_interest_project', { project_id: project.id });
        if (userProfile.name) {
          await addNotification(project.ownerId, { type: 'interest', fromUserId: user.uid, fromUserName: userProfile.name, projectId: project.id, projectTitle: project.title });
          toast({ title: 'Interest expressed!', description: 'The project owner has been notified.' });
        }
      }
    } catch (e) {
      console.error('Failed to update interest:', e);
      toast({ variant: 'destructive', title: 'Update Failed', description: 'Your interest could not be updated.' });
      setIsInterested(wasInterested);
    } finally {
      setIsInterestLoading(false);
    }
  };

  const handleMatch = async (matchedUser: UserWithId) => {
    if (!user || !project || !userProfile?.name) return;

    setLoadingUsers(true);
    invalidateProjectCache();

    try {
      const matchData = {
        type: 'project' as const,
        contextId: project.id,
        contextTitle: project.title,
        participants: [user.uid, matchedUser.id],
        participantsDetails: {
          [user.uid]: { name: userProfile.name, photoURL: userProfile.photoURL || '' },
          [matchedUser.id]: { name: matchedUser.name, photoURL: matchedUser.photoURL || '' },
        },
        unreadCounts: { [user.uid]: 0, [matchedUser.id]: 0 },
        createdAt: serverTimestamp(),
        lastMessage: null,
        lastMessageSender: null,
        lastMessageTimestamp: null,
      };
      const docRef = await addDoc(collection(db, 'matches'), matchData);
      const newMatchId = docRef.id;

      const projectRef = doc(db, 'projects', project.id);
      await updateDoc(projectRef, {
        matchedUsers: arrayUnion(matchedUser.id, user.uid),
        interestedUsers: arrayRemove(matchedUser.id),
      });

      await addNotification(matchedUser.id, {
        type: 'match',
        fromUserId: user.uid,
        fromUserName: userProfile.name,
        projectId: project.id,
        projectTitle: project.title,
        matchId: newMatchId,
      });

      toast({ title: 'Match Created!', description: `You have matched with ${matchedUser.name} for the project: ${project.title}` });
    } catch (error) {
      console.error('Error creating match:', error);
      toast({ variant: 'destructive', title: 'Match Failed', description: 'Could not create the match.' });
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleReject = async (rejectedUser: UserWithId) => {
    if (!user || !project || !userProfile?.name) return;
    setLoadingUsers(true);
    invalidateProjectCache();

    try {
      const currentRejectionCount = project.rejections?.[rejectedUser.id] || 0;
      const newRejectionCount = currentRejectionCount + 1;

      const projectRef = doc(db, 'projects', project.id);
      await updateDoc(projectRef, {
        [`rejections.${rejectedUser.id}`]: newRejectionCount,
        interestedUsers: arrayRemove(rejectedUser.id),
      });

      await addNotification(rejectedUser.id, {
        type: 'rejection',
        fromUserId: user.uid,
        fromUserName: userProfile.name,
        projectId: project.id,
        projectTitle: project.title,
        rejectionCount: newRejectionCount,
      });

      if (newRejectionCount >= MAX_REJECTIONS) {
        toast({ title: 'Developer Rejected', description: `${rejectedUser.name} has been permanently rejected after reaching the maximum limit.` });
      } else {
        toast({ title: 'Interest Rejected', description: `${rejectedUser.name} can still express interest again.` });
      }
    } catch (error) {
      console.error('Error rejecting developer:', error);
      toast({ variant: 'destructive', title: 'Action Failed', description: 'Could not reject the developer.' });
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!project || !user || !isOwner) return;
    invalidateProjectCache();
    try {
      const projectRef = doc(db, 'projects', project.id);
      await deleteDoc(projectRef);
      toast({ title: 'Project deleted successfully' });
      router.push('/projects');
    } catch (error: any) {
      console.error('Project deletion error:', error);
      toast({ variant: 'destructive', title: 'Error deleting project', description: error.message });
    }
  };

  const formatExperience = (years?: number) => {
    if (years === undefined) return 'Not specified';
    if (years < 1) return '< 1 year';
    return `${years} year${years !== 1 ? 's' : ''}`;
  };

  const getInterestButton = () => {
    if (isPermanentlyRejected) {
      return <Button size="lg" className="w-full" disabled>Rejected</Button>;
    }
    if (isInterested) {
      return <Button size="lg" className="w-full" onClick={handleInterest} disabled={isInterestLoading}><UserCheck className="mr-2 h-4 w-4" />Interest Expressed</Button>;
    }
    return <Button size="lg" className="w-full" onClick={handleInterest} disabled={isInterestLoading}><Hand className="mr-2 h-4 w-4" />I&apos;m interested</Button>;
  };

  if (!project) {
    return <div className="text-center py-20">Project data is not available.</div>
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
      <h2 className="text-xl font-semibold leading-none tracking-tight">{project.title}</h2> 
        {owner && (
          <div className="flex items-center pt-2 space-x-2 text-muted-foreground">
            <Avatar className="h-6 w-6"><AvatarImage src={owner.photoURL} /><AvatarFallback>{owner.name?.charAt(0) || 'U'}</AvatarFallback></Avatar>
            <span>by <Link href={`/developers/${owner.uid}`} className="hover:underline">{owner.name || 'A user'}</Link></span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        <div className="lg:col-span-2 space-y-2">
          {project.imageUrl && (
            <Card>
              <CardContent className="p-0">
                <img src={project.imageUrl} alt={project.title} className="w-full rounded-lg object-cover" />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-lg font-medium">About this Project</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-foreground/80 whitespace-pre-wrap">{project.description}</p></CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-lg flex items-center gap-3"><UserPlus className="h-5 w-5" /> Seeking Collaborators</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-foreground/80 mt-2">{project.roleRequirements}</p></CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-2">
          <Card><CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Briefcase className="h-4 w-4" /> Project Stage</CardTitle></CardHeader><CardContent><p className="text-sm">{project.projectStage}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Handshake className="h-4 w-4" /> Incentives</CardTitle></CardHeader><CardContent><p className="text-sm">{project.incentives}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Required Experience</CardTitle></CardHeader><CardContent><p className="text-sm">{formatExperience(project.requiredYearsOfExperience)}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Code className="h-4 w-4" />Required Tech Stack</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">{project.requiredTechStack?.map(tech => <Badge key={tech} variant="secondary">{tech}</Badge>)}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><BrainCircuit className="h-4 w-4" />Required Skills</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">{project.requiredSkills?.map(skill => <Badge key={skill} variant="outline">{skill}</Badge>)}</CardContent></Card>
          {project.projectLinks && project.projectLinks.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" /> Project Links
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col space-y-2 pt-2">
                {project.projectLinks.map((link, index) => {
                  const linkData = link as any;
                  const isGitHub = linkData.type.toLowerCase() === 'github';
                  const Icon = isGitHub ? Github : LinkIcon;
                  
                  return (
                    <Button key={index} asChild variant="outline" size="sm" className="justify-start w-full">
                      <a href={linkData.url} target="_blank" rel="noopener noreferrer" title={linkData.url}>
                        <Icon className="mr-2 h-4 w-4" />
                        <span className="truncate">{linkData.type}</span>
                      </a>
                    </Button>
                  );
                })}
              </CardContent>
            </Card>
          )}
          <div className="flex flex-col space-y-2 !mt-8"> 
            {isOwner ? (
              <div className="flex gap-2">
                <Button size="lg" className="w-full" asChild><Link href={`/projects/${project.id}/edit`} onClick={invalidateProjectCache}><Edit className="mr-2 h-4 w-4" />Edit Project</Link></Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button size="icon" variant="destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete your project.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteProject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ) : isMatched ? (
              <div className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-green-500 bg-green-500/10 p-4">
                <UserCheck className="h-8 w-8 text-green-500" />
                <p className="font-semibold text-lg text-green-500">You're Matched!</p>
                {matchId && (
                  <Button className="bg-amber-500 hover:bg-amber-600" onClick={() => handleRestoreAndGoToConversation(matchId)}>
                    <MessageSquare className="mr-2 h-4 w-4" />Go to Conversation
                  </Button>
                )}
              </div>
            ) : getInterestButton()}
          </div>
        </div>
      </div>

      {isOwner && (
        <div className="mt-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Collaboration Hub</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">Manage developers who are interested in this project.</CardDescription>
            </CardHeader>
            <CardContent>
              <h3 className="text-lg font-semibold mb-2">Interested Developers ({interestedUsers.length})</h3>
              {loadingUsers ? <Skeleton className="h-24 w-full" /> : (
                interestedUsers.length > 0 ? (
                  <div className="space-y-2">
                    {interestedUsers.map(p => (
                      <div key={p.id} className="flex flex-col md:flex-row md:items-center md:justify-between p-2 rounded-md border">
                        <div className="flex items-center gap-3 mb-2 md:mb-0">
                          <Avatar><AvatarImage src={p.photoURL} /><AvatarFallback>{p.name?.charAt(0) || 'U'}</AvatarFallback></Avatar>
                          <div>
                            <Link href={`/developers/${p.id}`} className="font-semibold hover:underline">{p.name || 'A User'}</Link>
                            <p className="text-sm text-muted-foreground">{p.title || 'No title'}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" asChild><Link href={`/developers/${p.id}`}>Profile</Link></Button>
                          <Button onClick={() => handleMatch(p)} size="sm"><UserPlus className="h-4 w-4 mr-2" />Match</Button>
                          <Button onClick={() => handleReject(p)} size="sm" variant="destructive"><UserX className="h-4 w-4 mr-2" />Reject</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-muted-foreground text-sm">No one has expressed interest yet.</p>
              )}

              <h3 className="text-lg font-semibold mt-6 mb-2">Matched Developers ({matchedUsers.length})</h3>
              {loadingUsers ? <Skeleton className="h-12 w-full" /> : (
                matchedUsers.length > 0 ? (
                  <div className="space-y-2">
                    {matchedUsers.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-2 rounded-md bg-green-500/10">
                        <Link href={`/developers/${p.id}`} className="flex items-center gap-3 hover:underline">
                          <Avatar><AvatarImage src={p.photoURL} /><AvatarFallback>{p.name?.charAt(0) || 'U'}</AvatarFallback></Avatar>
                          <p className="font-semibold">{p.name || 'A User'}</p>
                        </Link>
                        {matchIdsByUser[p.id] ? (
                          <Button size="sm" onClick={() => handleRestoreAndGoToConversation(matchIdsByUser[p.id])}>
                            <MessageSquare className="mr-2 h-4 w-4" />Conversation
                          </Button>
                        ) : (
                          <Button variant="secondary" size="sm" disabled>Matched</Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : <p className="text-muted-foreground text-sm">No developers matched yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default function ProjectDetailsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [projectLoading, setProjectLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!projectId) return;

    setProjectLoading(true);
    const projectDocRef = doc(db, 'projects', projectId);

    const unsubscribe = onSnapshot(projectDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const projectData = { id: docSnap.id, ...docSnap.data() } as Project;
        setProject(projectData);
      } else {
        toast({ variant: 'destructive', title: 'Not Found', description: 'This project could not be found.' });
        router.push('/projects');
      }
      setProjectLoading(false);
    }, (error) => {
      console.error('Error fetching project data in real-time:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load project data.' });
      setProjectLoading(false);
    });

    return () => unsubscribe();
  }, [projectId, router, toast]);

  if (projectLoading || authLoading) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="h-10 w-3/4 mb-4" />
        <Skeleton className="h-6 w-1/2 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
          <div className="lg:col-span-2 space-y-2"><Skeleton className="h-64 w-full" /></div>
          <div className="lg:col-span-1 space-y-2"><Skeleton className="h-48 w-full" /></div>
        </div>
      </div>
    );
  }

  if (!project) {
    return <div className="text-center py-20">Project not found.</div>;
  }

  return <ProjectDetailsContent project={project} />;
}