'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
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
import { Hand, Undo, Edit } from 'lucide-react';
import Link from 'next/link';
import { PlaceHolderImages } from '@/lib/placeholder-images';

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

    try {
      if (interested && existingInterest) {
        await updateDoc(projectDocRef, {
          interests: arrayRemove(existingInterest)
        });
        setInterests(prev => prev.filter(i => i.userId !== user.uid));
        toast({ title: 'Interest removed' });
      } else if (!interested) {
        await updateDoc(projectDocRef, {
          interests: arrayUnion(userInterest)
        });
        setInterests(prev => [...prev, userInterest]);
        toast({ title: 'Interest expressed!', description: "The project owner has been notified." });
      }
      setInterested(!interested);
    } catch(error) {
      toast({ variant: 'destructive', title: 'Something went wrong', description: 'Could not update your interest.' });
    }
  };
  
  const defaultProjectImage = PlaceHolderImages.find(p => p.id === 'project-1')?.imageUrl || "https://picsum.photos/seed/default/1200/800";

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
                        <Button variant="outline" size="sm">View Profile</Button>
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
          {user && user.uid === project.ownerId ? (
            <Button size="lg" className="w-full" asChild>
                <Link href={`/projects/${project.id}/edit`}>
                    <Edit className="mr-2 h-4 w-4"/>
                    Edit Project
                </Link>
            </Button>
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

          <Card>
            <CardHeader>
              <CardTitle>Required Skills</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {project.requiredSkills?.map((skill) => (
                <Badge key={skill} variant="default">{skill}</Badge>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
