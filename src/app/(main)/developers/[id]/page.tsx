'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/hooks/use-auth';
import type { UserProfile, Project } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ProjectCard from '@/components/project-card';
import { Briefcase } from 'lucide-react';

export default function DeveloperProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const developerId = params.id as string;

  const [developer, setDeveloper] = useState<UserProfile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!developerId) return;

    const fetchDeveloperData = async () => {
      setLoading(true);

      // Fetch developer profile
      const developerDocRef = doc(db, 'users', developerId);
      const developerDoc = await getDoc(developerDocRef);

      if (developerDoc.exists()) {
        setDeveloper({ uid: developerDoc.id, ...developerDoc.data() } as UserProfile);
      } else {
        // Handle developer not found
        router.push('/developers');
        return;
      }

      // Fetch developer's projects
      const projectsCol = collection(db, 'projects');
      const q = query(projectsCol, where('ownerId', '==', developerId));
      const querySnapshot = await getDocs(q);
      const devProjects = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
      setProjects(devProjects);

      setLoading(false);
    };

    fetchDeveloperData();
  }, [developerId, router]);
  
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0]).join('');
  };

  if (loading || authLoading) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-6 mb-8">
          <Skeleton className="h-32 w-32 rounded-full" />
          <div className="space-y-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <div className="space-y-8">
            <Card>
                <CardHeader><Skeleton className="h-8 w-32" /></CardHeader>
                <CardContent><Skeleton className="h-20 w-full" /></CardContent>
            </Card>
            <Card>
                <CardHeader><Skeleton className="h-8 w-48" /></CardHeader>
                <CardContent className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                  <Skeleton className="h-64 w-full" />
                  <Skeleton className="h-64 w-full" />
                </CardContent>
            </Card>
        </div>
      </div>
    );
  }

  if (!developer) {
    return <div className="text-center py-20">Developer not found.</div>;
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row items-start space-y-6 md:space-y-0 md:space-x-8 mb-12">
        <Avatar className="h-36 w-36 border-4 border-background shadow-lg">
          <AvatarImage src={developer.photoURL} alt={developer.name} />
          <AvatarFallback className="text-5xl">{getInitials(developer.name)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 pt-4">
          <h1 className="text-4xl font-bold">{developer.name}</h1>
          <p className="text-muted-foreground text-lg">{developer.email}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {developer.skills?.map((skill) => (
              <Badge key={skill} variant="secondary" className="text-sm">{skill}</Badge>
            ))}
          </div>
        </div>
      </div>
      
      <div className="space-y-12">
        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground/80 leading-relaxed text-lg">
              {developer.bio || 'No bio provided yet.'}
            </p>
          </CardContent>
        </Card>

        <section>
          <div className="flex items-center mb-6">
              <Briefcase className="h-7 w-7 text-primary mr-3" />
              <h2 className="text-3xl font-bold tracking-tight">Projects</h2>
          </div>
          {projects.length > 0 ? (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground">This developer hasn't created any projects yet.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
