'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase/config';
import { ref, deleteObject } from 'firebase/storage';
import { useAuth } from '@/lib/hooks/use-auth';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import type { Project, UserProfile, Interest } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Hand, Undo, Edit, Trash2, Code, BrainCircuit, Clock } from 'lucide-react';
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
import { deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export default function ProjectDetailsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [owner, setOwner] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [interested, setInterested] = useState(false);
  const [interests, setInterests] = useState<Interest[]>([]);
  
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!projectId || !user) return;

    const fetchProject = async () => {
      setLoading(true);
      const projectDocRef = doc(db, 'projects', projectId);
      const projectDoc = await getDoc(projectDocRef);

      if (projectDoc.exists()) {
        const projectData = { id: projectDoc.id, ...projectDoc.data() } as Project;
        setProject(projectData);
        
        if (projectData.ownerId) {
          const ownerDocRef = doc(db, 'users', projectData.ownerId);
          const ownerDoc = await getDoc(ownerDocRef);
          if (ownerDoc.exists()) {
            setOwner({ uid: ownerDoc.id, ...ownerDoc.data() } as UserProfile);
          }
        }
        
        const currentInterests: Interest[] = projectDoc.data().interests || [];
        setInterests(currentInterests);
        if (user) {
          setInterested(currentInterests.some(i => i.userId === user.uid));
        }

      }
      setLoading(false);
    };

    fetchProject();
  }, [projectId, user]);

  const handleInterest = async () => {
    if (!user || !project) return;
    
    // Find the existing interest object to remove it correctly
    const existingInterest = project.interests?.find(i => i.userId === user.uid);

    const userInterest: Interest = {
      userId: user.uid,
      name: user.displayName || 'Anonymous',
      photoURL: user.photoURL || '',
    };
    
    const projectDocRef = doc(db, 'projects', projectId);

    if (interested && existingInterest) {
      updateDocumentNonBlocking(projectDocRef, {
        interests: arrayRemove(existingInterest)
      });
      setInterests(prev => prev.filter(i => i.userId !== user.uid));
      toast({ title: 'Interest removed' });
    } else if (!interested) {
      updateDocumentNonBlocking(projectDocRef, {
        interests: arrayUnion(userInterest)
      });
      setInterests(prev => [...prev, userInterest]);
      toast({ title: 'Interest expressed!', description: "The project owner has been notified." });
    }
    setInterested(!interested);
  };

  const handleDeleteProject = async () => {
    if (!project || !user) return;
    setLoading(true);

    try {
      if (project.imageUrl) {
        const imageRef = ref(storage, project.imageUrl);
        await deleteObject(imageRef);
      }
      
      const projectRef = doc(db, 'projects', project.id);
      deleteDocumentNonBlocking(projectRef);

      toast({ title: 'Project deleted successfully' });
      router.push('/projects');

    } catch (error: any) {
      console.error("Project deletion error:", error);
      toast({ variant: 'destructive', title: 'Error deleting project', description: error.message });
      setLoading(false);
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

  if (loading || authLoading || !user) {
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
          
          {user && user.uid === project.ownerId && (
            <Card>
              <CardHeader>
                <CardTitle>Interested Developers</CardTitle>
              </CardHeader>
              <CardContent>
                {interests.length > 0 ? (
                  <ul className="space-y-4">
                    {interests.map(interest => (
                      <li key={interest.userId} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarImage src={interest.photoURL} />
                            <AvatarFallback>{interest.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span>{interest.name}</span>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/developers/${interest.userId}`}>View Profile</Link>
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">No one has expressed interest yet.</p>
                )}
              </CardContent>
            </Card>
          )}

        </div>
        
        <div className="space-y-6">
          <div className="flex flex-col space-y-2">
            {user && user.uid === project.ownerId ? (
              <div className="flex gap-2">
                <Button size="lg" className="w-full" asChild>
                    <Link href={`/projects/${project.id}/edit`}>
                        <Edit className="mr-2 h-4 w-4"/>
                        Edit Project
                    </Link>
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="lg" variant="destructive">
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
            ) : user && (
              <Button size="lg" className="w-full" onClick={handleInterest}>
                {interested ? (
                  <>
                    <Undo className="mr-2 h-4 w-4" />
                    Remove Interest
                  </>
                ) : (
                  <>
                    <Hand className="mr-2 h-4 w-4" />
                    I&apos;m interested
                  </>
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
    </div>
  );
}
