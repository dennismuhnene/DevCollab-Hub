'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useParams, useRouter } from 'next/navigation';
import type { Project } from '@/types';
import ProjectForm from '@/components/project-form';
import { useAuth } from '@/lib/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';

export default function EditProjectPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchProject = async () => {
      const docRef = doc(db, 'projects', projectId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const projectData = { id: docSnap.id, ...docSnap.data() } as Project;
        if (projectData.ownerId === user.uid) {
          setProject(projectData);
        } else {
          toast({ variant: 'destructive', title: 'Permission Denied' });
          router.push('/projects'); // Not the owner
        }
      } else {
        toast({ variant: 'destructive', title: 'Project not found' });
        router.push('/projects'); // Not found
      }
      setLoading(false);
    };

    if (projectId && user) {
      fetchProject();
    }
  }, [projectId, user, authLoading, router]);

  if (loading || authLoading) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
         <Skeleton className="h-10 w-1/2" />
         <div className="space-y-4">
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-10 w-full" />
         </div>
         <div className="space-y-4">
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-40 w-full" />
         </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-4 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Edit Project</h1>
        <p className="text-muted-foreground">Update the details for your project.</p>
      </div>
      {project ? <ProjectForm project={project} /> : <p>Project not found or you do not have permission to edit it.</p>}
    </div>
  );
}
