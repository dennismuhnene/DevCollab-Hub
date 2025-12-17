'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/hooks/use-auth';
import { useParams } from 'next/navigation';
import type { Role, UserProfile, Project } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Hand, Edit, Trash2, Code, BrainCircuit, Clock, UserCheck, Target, Handshake, Briefcase, MapPin, Users, Link as LinkIcon } from 'lucide-react';
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
import { addNotification } from '@/lib/firebase/notifications';
import { logAnalyticsEvent } from '@/firebase/analytics';

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
  const [isInterestLoading, setIsInterestLoading] = useState(false);
  
  const { toast } = useToast();

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

    const fetchRoleData = async () => {
      setRoleLoading(true);
      try {
        const roleDocRef = doc(db, 'roles', roleId);
        const roleDoc = await getDoc(roleDocRef);

        if (roleDoc.exists()) {
          const roleData = { id: roleDoc.id, ...roleDoc.data() } as Role;
          setRole(roleData);
          setIsOwner(roleData.ownerId === user.uid);
          if (user.uid !== roleData.ownerId) {
             logAnalyticsEvent('role_view', { role_id: roleId });
          }

          if (roleData.projectId) {
            const projectDocRef = doc(db, 'projects', roleData.projectId);
            const projectDoc = await getDoc(projectDocRef);
            if (projectDoc.exists()) {
                setProject({ id: projectDoc.id, ...projectDoc.data() } as Project)
            }
          }

          const ownerDocRef = doc(db, 'users', roleData.ownerId);
          const ownerDoc = await getDoc(ownerDocRef);
          if (ownerDoc.exists()) setOwner({ uid: ownerDoc.id, ...ownerDoc.data() } as UserProfile);

        } else {
          toast({ variant: 'destructive', title: 'Not Found', description: 'This role could not be found.' });
          router.push('/roles');
        }
      } catch (error) {
        console.error("Error fetching role data:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load role data.' });
      } finally {
        setRoleLoading(false);
      }
    };

    fetchRoleData();
  }, [roleId, user, router, toast]);

  const handleInterest = async () => {
    if (!user || !userProfile || !role) return;
    setIsInterestLoading(true);
    invalidateRoleCache();

    try {
        await addNotification(role.ownerId, { 
            type: 'interest', 
            fromUserId: user.uid, 
            fromUserName: userProfile.name, 
            read: false 
        });
        logAnalyticsEvent('show_interest_role', { role_id: role.id });
        toast({ title: 'Interest expressed!', description: 'The role owner has been notified.' });
        setIsInterested(true);
    } catch(e) {
        console.error("Failed to send notification:", e);
        toast({ variant: 'destructive', title: 'Update Failed', description: 'Your interest could not be recorded.' });
    } finally {
        setIsInterestLoading(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!role || !user || !isOwner) return;
    invalidateRoleCache();
    setRoleLoading(true);
    try {
        const { deleteDoc } = await import('firebase/firestore');
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
    if (years < 1) {
      const months = Math.round(years * 12);
      return `${months} month${months !== 1 ? 's' : ''}`;
    }
    return `${years} year${years !== 1 ? 's' : ''}`;
  };

  const loading = authLoading || roleLoading;

  if (loading) return <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8"><Skeleton className="h-10 w-3/4 mb-4" /><Skeleton className="h-6 w-1/2 mb-8" /><Skeleton className="w-full h-96 mb-8" /><Skeleton className="h-32 w-full" /></div>;

  if (!role) return <div className="text-center py-20">Role not found.</div>;
  
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-2">{role.title}</h1>
        {owner && <div className="flex items-center space-x-2 text-muted-foreground"><Avatar className="h-6 w-6"><AvatarImage src={owner.photoURL} /><AvatarFallback>{owner.name.charAt(0)}</AvatarFallback></Avatar><span>by {owner.name}</span></div>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-semibold">About this role</h2>
          <p className="text-lg leading-relaxed text-foreground/80">{role.roleDescription}</p>
           {project && (
            <Card>
                <CardHeader><CardTitle className="text-xl flex items-center gap-3"><LinkIcon className="h-5 w-5"/> Associated Project</CardTitle></CardHeader>
                <CardContent>
                    <Link href={`/projects/${project.id}`} className="font-semibold text-lg text-blue-500 hover:underline">{project.title}</Link>
                    <p className="text-foreground/80 leading-relaxed mt-2">{project.description.substring(0, 150)}...</p>
                </CardContent>
            </Card>
          )}
        </div>
        
        <div className="space-y-6">
          <div className="flex flex-col space-y-2">
            {isOwner ? (
                <div className="flex gap-2">
                    <Button size="lg" className="w-full" asChild><Link href={`/roles/edit/${role.id}`} onClick={invalidateRoleCache}><Edit className="mr-2 h-4 w-4"/>Edit Role</Link></Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild><Button size="icon" variant="destructive"><Trash2 className="h-4 w-4"/></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete your role.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteRole} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            ) : (
                <Button size="lg" className="w-full" onClick={handleInterest} disabled={isInterestLoading || isInterested}>
                    {isInterested ? <><UserCheck className="mr-2 h-4 w-4" />Interest Expressed</> : <><Hand className="mr-2 h-4 w-4" />I&apos;m interested</>}
                </Button>
            )}
          </div>
        </div>
      </div>
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Briefcase className="h-4 w-4"/> Commitment</CardTitle></CardHeader><CardContent><p className="font-semibold text-lg">{role.commitmentLevel}</p></CardContent></Card>

          <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Handshake className="h-4 w-4"/> Incentives</CardTitle></CardHeader><CardContent><p className="font-semibold text-lg">{role.incentives}</p></CardContent></Card>

          <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4"/> Collaboration Type</CardTitle></CardHeader><CardContent><p className="font-semibold text-lg">{role.collaborationType}</p></CardContent></Card>

          <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Required Experience</CardTitle></CardHeader><CardContent><p className="font-semibold text-lg">{formatExperience(role.requiredYearsOfExperience)}</p></CardContent></Card>

          <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Code className="h-4 w-4"/>Required Tech Stack</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">{role.requiredTechStack?.map((tech) => <Badge key={tech} variant="secondary">{tech}</Badge>)}</CardContent></Card>

          <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><BrainCircuit className="h-4 w-4"/>Required Skills</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">{role.requiredSkills?.map((skill) => <Badge key={skill} variant="outline">{skill}</Badge>)}</CardContent></Card>

          <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4"/>Locations</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">{role.locations?.map((location) => <Badge key={location} variant="default">{location}</Badge>)}</CardContent></Card>
        </div>
    </div>
  );
}
