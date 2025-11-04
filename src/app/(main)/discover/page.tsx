'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/hooks/use-auth';
import { getUserRecommendations } from '@/ai/flows/get-user-recommendations';
import type { Project } from '@/types';
import ProjectCard from '@/components/project-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, Frown } from 'lucide-react';
import Link from 'next/link';

export default function DiscoverPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [recommendedProjects, setRecommendedProjects] = useState<Project[]>([]);
  const [otherProjects, setOtherProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjectsAndRecommendations = async () => {
      if (authLoading) return;
      setLoading(true);

      const projectsCol = collection(db, 'projects');
      const q = query(projectsCol);
      const querySnapshot = await getDocs(q);
      const allProjects = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
      setProjects(allProjects);

      if (userProfile && userProfile.skills && userProfile.skills.length > 0) {
        try {
          const projectDescriptions = allProjects.map(p => p.description);
          const recommendedDescriptions = await getUserRecommendations({
            userSkills: userProfile.skills,
            projectDescriptions,
          });

          const recProjects = allProjects.filter(p => recommendedDescriptions.includes(p.description));
          const otherPrjs = allProjects.filter(p => !recommendedDescriptions.includes(p.description));

          setRecommendedProjects(recProjects);
          setOtherProjects(otherPrjs);
        } catch (error) {
          console.error("Failed to get recommendations:", error);
          setRecommendedProjects([]);
          setOtherProjects(allProjects);
        }
      } else {
        setRecommendedProjects([]);
        setOtherProjects(allProjects);
      }
      setLoading(false);
    };

    fetchProjectsAndRecommendations();
  }, [user, userProfile, authLoading]);

  const ProjectListSkeleton = () => (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="space-y-4">
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-12 w-full" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight font-headline">Discover Projects</h1>
        <p className="mt-3 text-lg text-muted-foreground">AI-powered recommendations based on your skills.</p>
      </div>

      {loading || authLoading ? (
        <ProjectListSkeleton />
      ) : (
        <div className="space-y-16">
          {recommendedProjects.length > 0 && (
            <section>
              <div className="flex items-center mb-6">
                <Sparkles className="h-7 w-7 text-accent mr-3" />
                <h2 className="text-3xl font-bold tracking-tight">Recommended For You</h2>
              </div>
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {recommendedProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            </section>
          )}

          {otherProjects.length > 0 && recommendedProjects.length > 0 && (
            <section>
              <h2 className="text-3xl font-bold tracking-tight mb-6">Explore Other Projects</h2>
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {otherProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            </section>
          )}

          {recommendedProjects.length === 0 && otherProjects.length > 0 && (
             <section>
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {otherProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            </section>
          )}
          
          {projects.length > 0 && recommendedProjects.length === 0 && (!userProfile?.skills || userProfile.skills.length === 0) && (
             <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 py-20 text-center">
              <Frown className="h-12 w-12 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold">Add skills to get recommendations!</h2>
              <p className="mt-2 text-muted-foreground max-w-md">Go to your profile to add skills and discover projects that are a perfect match for you.</p>
               <Button asChild className="mt-6">
                <Link href="/profile">Go to Profile</Link>
              </Button>
            </div>
          )}

          {projects.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 py-20 text-center">
              <h2 className="text-xl font-semibold">No projects available</h2>
              <p className="mt-2 text-muted-foreground">Check back later or be the first to create one!</p>
               <Button asChild className="mt-4">
                <Link href="/projects/new">Create a Project</Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
