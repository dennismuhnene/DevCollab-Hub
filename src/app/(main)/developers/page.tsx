'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/hooks/use-auth';
import type { UserProfile, Project } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Search, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getUserRecommendations } from '@/ai/flows/get-user-recommendations';
import ProjectCard from '@/components/project-card';
import { get } from 'http';

type ProjectWithOwner = Project & { owner: UserProfile | null };

export default function DiscoverCollaboratorsPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const [allProjects, setAllProjects] = useState<ProjectWithOwner[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<ProjectWithOwner[]>([]);
  const [recommendedProjects, setRecommendedProjects] = useState<ProjectWithOwner[]>([]);
  const [otherProjects, setOtherProjects] = useState<ProjectWithOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;

    const fetchProjectsAndOwners = async () => {
      setLoading(true);
      
      const projectsCol = collection(db, 'projects');
      const projectsSnapshot = await getDocs(query(projectsCol, where('ownerId', '!=', user.uid)));
      const projectsData = projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));

      const ownerIds = [...new Set(projectsData.map(p => p.ownerId))];
      const owners: Record<string, UserProfile> = {};

      if (ownerIds.length > 0) {
        const usersCol = collection(db, 'users');
        // Firestore 'in' query can take up to 30 elements
        const ownerChunks = [];
        for (let i = 0; i < ownerIds.length; i += 30) {
            ownerChunks.push(ownerIds.slice(i, i + 30));
        }
        for (const chunk of ownerChunks) {
            const ownersQuery = query(usersCol, where('uid', 'in', chunk));
            const ownersSnapshot = await getDocs(ownersQuery);
            ownersSnapshot.forEach(doc => {
                owners[doc.id] = { uid: doc.id, ...doc.data() } as UserProfile;
            });
        }
      }

      const projectsWithOwners: ProjectWithOwner[] = projectsData.map(project => ({
        ...project,
        owner: owners[project.ownerId] || null,
      }));

      setAllProjects(projectsWithOwners);

      if (userProfile?.skills && userProfile.skills.length > 0) {
        try {
          const projectDescriptions = projectsWithOwners.map(p => p.description);
          const recommendedDescriptions = await getUserRecommendations({
            userSkills: userProfile.skills,
            projectDescriptions,
          });
          
          const recs = projectsWithOwners.filter(p => recommendedDescriptions.includes(p.description));
          const others = projectsWithOwners.filter(p => !recommendedDescriptions.includes(p.description));
          setRecommendedProjects(recs);
          setOtherProjects(others);
          setFilteredProjects(projectsWithOwners);

        } catch (error) {
          console.error("AI recommendation failed:", error);
          setRecommendedProjects([]);
          setOtherProjects(projectsWithOwners);
          setFilteredProjects(projectsWithOwners);
        }
      } else {
        setRecommendedProjects([]);
        setOtherProjects(projectsWithOwners);
        setFilteredProjects(projectsWithOwners);
      }

      setLoading(false);
    };

    fetchProjectsAndOwners();
  }, [user, userProfile]);

  useEffect(() => {
    let combinedProjects = [...recommendedProjects, ...otherProjects];
    
    if (!searchTerm) {
        setFilteredProjects(combinedProjects);
        return;
    }

    const results = combinedProjects.filter(p => 
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.requiredSkills?.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase())) ||
      p.owner?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProjects(results);
  }, [searchTerm, recommendedProjects, otherProjects]);

  const ProjectListSkeleton = () => (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
         <div key={i} className="space-y-4 rounded-lg border p-4">
            <Skeleton className="h-40 w-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
      ))}
    </div>
  );

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight font-headline">Discover Collaborators</h1>
        <p className="mt-3 text-lg text-muted-foreground">Find interesting projects and the talented developers behind them.</p>
      </div>

      <div className="mb-8 max-w-lg mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search projects by title, skill, or developer..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading || authLoading ? (
        <ProjectListSkeleton />
      ) : (
        <div className="space-y-12">
            {searchTerm === '' && recommendedProjects.length > 0 && (
                <section>
                    <div className="flex items-center mb-6">
                        <Sparkles className="h-7 w-7 text-accent mr-3" />
                        <h2 className="text-3xl font-bold tracking-tight">Recommended For You</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                        {recommendedProjects.map((project) => (
                            <ProjectCard key={project.id} project={project} owner={project.owner} />
                        ))}
                    </div>
                </section>
            )}
            
            <section>
                 {searchTerm === '' && recommendedProjects.length > 0 && (
                     <h2 className="text-3xl font-bold tracking-tight mb-6">All Projects</h2>
                 )}
                {filteredProjects.length > 0 ? (
                    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                    {(searchTerm ? filteredProjects : otherProjects).map((project) => (
                        <ProjectCard key={project.id} project={project} owner={project.owner} />
                    ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 py-20 text-center">
                        <h2 className="text-xl font-semibold">No Projects Found</h2>
                        <p className="mt-2 text-muted-foreground">Your search for "{searchTerm}" did not return any results.</p>
                    </div>
                )}
            </section>
        </div>
      )}
    </div>
  );
}
