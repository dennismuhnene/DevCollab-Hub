'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove, serverTimestamp, collection, addDoc, query, where, documentId, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/hooks/use-auth';
import type { Role, UserProfile, Project, Match } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Hand, Edit, Trash2, Code, BrainCircuit, Clock, UserCheck, Handshake, Briefcase, MapPin, Users, Link as LinkIcon, UserPlus, UserX, MessageSquare } from 'lucide-react';
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

export default function RoleDetailsPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const roleId = params.roleId as string;

  const [role, setRole] = useState<Role | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  
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
  
  const { toast } = useToast();

  const isPermanentlyRejected = rejectionCount >= MAX_REJECTIONS;

  const invalidateRoleCache = useCallback(() => {
    try {
      sessionStorage.removeItem(`role_${roleId}`);
    } catch (error) {
      console.warn('Could not remove from session storage', error);
    }
  }, [roleId]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!roleId || !user) return;

    setRoleLoading(true);
    const roleDocRef = doc(db, 'roles', roleId);

    const unsubscribe = onSnapshot(roleDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        const roleData = { id: docSnap.id, ...docSnap.data() } as Role;
        setRole(roleData);
        setRejectionCount(roleData.rejections?.[user.uid] || 0);

        if (user && user.uid !== roleData.ownerId && !sessionStorage.getItem(`role_viewed_${roleId}`)) {
          logAnalyticsEvent('role_view', { role_id: roleId });
          sessionStorage.setItem(`role_viewed_${roleId}`, 'true');
        }

        if (roleData.projectId) {
            const projectDocRef = doc(db, 'projects', roleData.projectId);
            const projectDoc = await getDoc(projectDocRef);
            if (projectDoc.exists()) {
                setProject({ id: projectDoc.id, ...projectDoc.data() } as Project);
            }
        }
      } else {
        toast({ variant: 'destructive', title: 'Not Found', description: 'This role could not be found.' });
        router.push('/roles');
      }
      setRoleLoading(false);
    }, (error) => {
      console.error("Error fetching role data in real-time:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load role data.' });
      setRoleLoading(false);
    });

    return () => unsubscribe();
  }, [roleId, user, router, toast]);

  useEffect(() => {
    if (!role || !user) return;

    const fetchMatch = async () => {
      const qNew = query(
        collection(db, 'matches'),
        where('contextId', '==', role.id),
        where('participants', 'array-contains', user.uid)
      );

      const qLegacy = query(
        collection(db, 'matches'),
        where('roleId', '==', role.id),
        where('participants', 'array-contains', user.uid)
      );

      const [newSnap, legacySnap] = await Promise.all([getDocs(qNew), getDocs(qLegacy)]);
      const snap = !newSnap.empty ? newSnap : legacySnap;

      if (!snap.empty) {
        setMatchId(snap.docs[0].id);
        setIsMatched(true);
      } else {
        setMatchId(null);
      }
    };

    fetchMatch();
  }, [role, user]);

  useEffect(() => {
    if (!role || !user) return;
    
    setLoadingUsers(true);
    const fetchAssociatedUsers = async () => {
        try {
          const ownerDocRef = doc(db, 'users', role.ownerId);
          const ownerDoc = await getDoc(ownerDocRef);
          if (ownerDoc.exists()) setOwner({ uid: ownerDoc.id, ...ownerDoc.data() } as UserProfile);

          setIsOwner(role.ownerId === user.uid);
          setIsInterested(role.interestedUsers?.includes(user.uid) || false);
          setIsMatched(role.matchedUsers?.includes(user.uid) || isMatched);
          
          if (role.ownerId === user.uid) {
            markInterestNotificationsAsRead(user.uid, role.id);
          }
          
          const fetchUsersByIds = async (ids: string[]) => {
            if (!ids || ids.length === 0) return [];
            const userChunks = [];
            for (let i = 0; i < ids.length; i += 30) userChunks.push(ids.slice(i, i + 30));
            const userPromises = userChunks.map(chunk => getDocs(query(collection(db, 'users'), where(documentId(), 'in', chunk))));
            const userSnapshots = await Promise.all(userPromises);
            return userSnapshots.flatMap(snap => snap.docs.map(d => ({ ...d.data(), id: d.id } as UserWithId)));
          };
          
          if (role.ownerId === user.uid) {
             const interested = await fetchUsersByIds(role.interestedUsers || []);
             setInterestedUsers(interested);
          }

          const matched = await fetchUsersByIds(role.matchedUsers || []);
          setMatchedUsers(matched);

          if (role.ownerId === user.uid && matched.length > 0) {
            const qNew = query(
              collection(db, 'matches'),
              where('contextId', '==', role.id),
              where('participants', 'array-contains', user.uid)
            );

            const qLegacy = query(
              collection(db, 'matches'),
              where('roleId', '==', role.id),
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

        } catch(error) {
          console.error("Error fetching associated users:", error);
          toast({ variant: 'destructive', title: 'Error', description: 'Could not load associated user data.' });
        } finally {
          setLoadingUsers(false);
        }
    };

    fetchAssociatedUsers();
  }, [role, user, toast, isMatched]);

  const handleInterest = async () => {
    if (!user || !userProfile || !role || isPermanentlyRejected) return;
    setIsInterestLoading(true);
    invalidateRoleCache();
    
    const wasInterested = isInterested;
    const roleRef = doc(db, 'roles', role.id);
    
    try {
      if(wasInterested) {
        await updateDoc(roleRef, { interestedUsers: arrayRemove(user.uid) });
        setIsInterested(false);
        toast({ title: 'Interest removed' });
      } else {
        await updateDoc(roleRef, { interestedUsers: arrayUnion(user.uid) });
        setIsInterested(true);

        logAnalyticsEvent('show_interest_role', { role_id: role.id });
        if (userProfile.name) {
            await addNotification(role.ownerId, { type: 'interest', fromUserId: user.uid, fromUserName: userProfile.name, roleId: role.id, roleTitle: role.title });
            toast({ title: 'Interest expressed!', description: 'The role owner has been notified.' });
        }
      }
    } catch(e) {
        console.error("Failed to update interest:", e);
        toast({ variant: 'destructive', title: 'Update Failed', description: 'Your interest could not be updated.' });
        setIsInterested(wasInterested);
    } finally {
        setIsInterestLoading(false);
    }
  };

  const handleMatch = async (matchedUser: UserWithId) => {
    if (!user || !role || !userProfile?.name) return;

    setLoadingUsers(true);
    invalidateRoleCache();

    try {
        const matchData: Omit<Match, 'id' | 'lastMessageTimestamp'> & { lastMessageTimestamp?: any } = {
            type: 'role' as const,
            contextId: role.id,
            contextTitle: role.title,
            participants: [user.uid, matchedUser.id],
            participantsDetails: {
                [user.uid]: { name: userProfile.name, photoURL: userProfile.photoURL || '' },
                [matchedUser.id]: { name: matchedUser.name, photoURL: matchedUser.photoURL || '' }
            },
            unreadCounts: { [user.uid]: 0, [matchedUser.id]: 0 },
            createdAt: serverTimestamp(),
            lastMessage: null,
            lastMessageSender: null,
            lastMessageTimestamp: serverTimestamp(),
        };
        const docRef = await addDoc(collection(db, 'matches'), matchData);
        const newMatchId = docRef.id;

        const roleRef = doc(db, 'roles', role.id);
        await updateDoc(roleRef, {
            matchedUsers: arrayUnion(matchedUser.id),
            interestedUsers: arrayRemove(matchedUser.id)
        });

        await addNotification(matchedUser.id, {
            type: 'match',
            fromUserId: user.uid,
            fromUserName: userProfile.name,
            roleId: role.id,
            roleTitle: role.title,
            matchId: newMatchId
        });

        toast({ title: 'Match Created!', description: `You have matched with ${matchedUser.name} for the role: ${role.title}` });

    } catch (error) {
        console.error("Error creating match:", error);
        toast({ variant: 'destructive', title: 'Match Failed', description: 'Could not create the match.' });
    } finally {
        setLoadingUsers(false);
    }
  };

  const handleReject = async (rejectedUser: UserWithId) => {
    if (!user || !role || !userProfile?.name) return;
    setLoadingUsers(true);
    invalidateRoleCache();
    
    try {
        const currentRejectionCount = role.rejections?.[rejectedUser.id] || 0;
        const newRejectionCount = currentRejectionCount + 1;

        const roleRef = doc(db, 'roles', role.id);
        await updateDoc(roleRef, {
            [`rejections.${rejectedUser.id}`]: newRejectionCount,
            interestedUsers: arrayRemove(rejectedUser.id)
        });

        await addNotification(rejectedUser.id, {
            type: 'rejection',
            fromUserId: user.uid,
            fromUserName: userProfile.name,
            roleId: role.id,
            roleTitle: role.title,
            rejectionCount: newRejectionCount
        });

        if (newRejectionCount >= MAX_REJECTIONS) {
            toast({ 
                title: 'Developer Rejected', 
                description: `${rejectedUser.name} has been permanently rejected after reaching the maximum limit.` 
            });
        } else {
            toast({ 
                title: 'Interest Rejected', 
                description: `${rejectedUser.name} can still express interest again.` 
            });
        }

    } catch (error) {
        console.error("Error rejecting developer:", error);
        toast({ variant: 'destructive', title: 'Action Failed', description: 'Could not reject the developer.' });
    } finally {
        setLoadingUsers(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!role || !user || !isOwner) return;
    setRoleLoading(true);
    invalidateRoleCache();
    try {
        const roleRef = doc(db, 'roles', role.id);
        await deleteDoc(roleRef);
        toast({ title: 'Role deleted successfully' });
        router.push('/roles');
    } catch (error: any) {
        console.error("Role deletion error:", error);
        toast({ variant: 'destructive', title: 'Error deleting role', description: error.message });
        setRoleLoading(false);
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

  const loading = authLoading || roleLoading;

  if (loading || !role) return (
    <div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="h-10 w-3/4 mb-4" />
        <Skeleton className="h-6 w-1/2 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6"><Skeleton className="h-64 w-full" /></div>
            <div className="lg:col-span-1 space-y-6"><Skeleton className="h-48 w-full" /></div>
        </div>
    </div>
  );
  
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-2">{role.title}</h1>
        {owner && <div className="flex items-center space-x-2 text-muted-foreground"><Avatar className="h-6 w-6"><AvatarImage src={owner.photoURL} /><AvatarFallback>{owner.name?.charAt(0) || 'U'}</AvatarFallback></Avatar><span>by <Link href={`/developers/${owner.uid}`} className="hover:underline">{owner.name || 'A user'}</Link></span></div>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-2xl font-semibold">About this Role</CardTitle></CardHeader>
              <CardContent><p className="text-lg leading-relaxed text-foreground/80 whitespace-pre-wrap">{role.roleDescription}</p></CardContent>
            </Card>

            {project && (
              <Card>
                <CardHeader><CardTitle className="text-xl flex items-center gap-3"><LinkIcon className="h-5 w-5"/> Associated Project</CardTitle></CardHeader>
                <CardContent>
                    <Link href={`/projects/${project.id}`} className="font-semibold text-lg text-blue-500 hover:underline">{project.title}</Link>
                    <p className="text-foreground/80 leading-relaxed mt-2">{project.description.substring(0, 200)}...</p>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Briefcase className="h-4 w-4"/> Commitment</CardTitle></CardHeader><CardContent><p className="font-semibold text-lg">{role.commitmentLevel}</p></CardContent></Card>
              <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Handshake className="h-4 w-4"/> Incentives</CardTitle></CardHeader><CardContent><p className="font-semibold text-lg">{role.incentives}</p></CardContent></Card>
              <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4"/> Collaboration Type</CardTitle></CardHeader><CardContent><p className="font-semibold text-lg">{role.collaborationType}</p></CardContent></Card>
              <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Required Experience</CardTitle></CardHeader><CardContent><p className="font-semibold text-lg">{formatExperience(role.requiredYearsOfExperience)}</p></CardContent></Card>
              <Card className="md:col-span-2"><CardHeader><CardTitle className="text-base flex items-center gap-2"><Code className="h-4 w-4"/>Required Tech Stack</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">{role.requiredTechStack?.map((tech) => <Badge key={tech} variant="secondary">{tech}</Badge>)}</CardContent></Card>
              <Card className="md:col-span-2"><CardHeader><CardTitle className="text-base flex items-center gap-2"><BrainCircuit className="h-4 w-4"/>Required Skills</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">{role.requiredSkills?.map((skill) => <Badge key={skill} variant="outline">{skill}</Badge>)}</CardContent></Card>
              <Card className="md:col-span-2"><CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4"/>Locations</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">{role.locations?.map((location) => <Badge key={location} variant="default">{location}</Badge>)}</CardContent></Card>
            </div>

            {isOwner && (
              <Card>
                <CardHeader>
                    <CardTitle>Collaboration Hub</CardTitle>
                    <CardDescription>Manage developers who are interested in this role.</CardDescription>
                </CardHeader>
                <CardContent>
                    <h3 className="font-semibold mb-2">Interested Developers ({interestedUsers.length})</h3>
                    {loadingUsers ? <Skeleton className="h-24 w-full"/> :
                    (interestedUsers.length > 0 ? (
                        <div className="space-y-4">
                        {interestedUsers.map(p => (
                            <div key={p.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 rounded-md border">
                                <div className="flex items-center gap-3">
                                    <Avatar><AvatarImage src={p.photoURL} /><AvatarFallback>{p.name?.charAt(0) || 'U'}</AvatarFallback></Avatar>
                                    <div>
                                        <Link href={`/developers/${p.id}`} className="font-semibold hover:underline">{p.name || 'A User'}</Link>
                                        <p className="text-sm text-muted-foreground">{p.title || 'No title'}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                     <Button variant="outline" size="sm" asChild><Link href={`/developers/${p.id}`}>Profile</Link></Button>
                                     <Button onClick={() => handleMatch(p)} size="sm"><UserPlus className="h-4 w-4 mr-2"/>Match</Button>
                                     <Button onClick={() => handleReject(p)} size="sm" variant="destructive"><UserX className="h-4 w-4 mr-2"/>Reject</Button>
                                </div>
                            </div>
                        ))}
                        </div>
                    ) : <p className="text-muted-foreground text-sm">No one has expressed interest yet.</p>)}
                    
                    <h3 className="font-semibold mt-6 mb-2">Matched Developers ({matchedUsers.length})</h3>
                     {loadingUsers ? <Skeleton className="h-12 w-full"/> :
                    (matchedUsers.length > 0 ? (
                         <div className="space-y-2">
                         {matchedUsers.map(p => (
                            <div key={p.id} className="flex items-center justify-between p-2 rounded-md bg-green-500/10">
                                <Link href={`/developers/${p.id}`} className="flex items-center gap-3 hover:underline">
                                    <Avatar><AvatarImage src={p.photoURL} /><AvatarFallback>{p.name?.charAt(0) || 'U'}</AvatarFallback></Avatar>
                                    <p className="font-semibold">{p.name || 'A User'}</p>
                                </Link>
                                {matchIdsByUser[p.id] ? (
                                  <Button asChild size="sm"><Link href={`/messages/${matchIdsByUser[p.id]}`}><MessageSquare className="mr-2 h-4 w-4"/>Conversation</Link></Button>
                                ) : (
                                  <Button variant="secondary" size="sm" disabled>Matched</Button>
                                )}
                            </div>
                        ))}
                        </div>
                    ) : <p className="text-muted-foreground text-sm">No developers matched yet.</p>)}
                </CardContent>
              </Card>
            )}
        </div>
        
        <div className="lg:col-span-1 space-y-6">
          <div className="flex flex-col space-y-2">
            {isOwner ? (
                <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
                    <Button size="lg" className="w-full" asChild><Link href={`/roles/edit/${role.id}`} onClick={invalidateRoleCache}><Edit className="mr-2 h-4 w-4"/>Edit Role</Link></Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild><Button size="icon" variant="destructive"><Trash2 className="h-4 w-4"/></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete your role.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteRole} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            ) : isMatched ? (
                    <div className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-green-500 bg-green-500/10 p-4">
                        <UserCheck className="h-8 w-8 text-green-500" />
                        <p className="font-semibold text-lg text-green-500">You're Matched!</p>
                        {matchId && 
                            <Button asChild className="bg-amber-500 hover:bg-amber-600">
                                <Link href={`/messages/${matchId}`}>
                                    <MessageSquare className="mr-2 h-4 w-4" />
                                    Go to Conversation
                                </Link>
                            </Button>
                        }
                    </div>
            ) : getInterestButton()}
          </div>
        </div>
      </div>
    </div>
  );
}
