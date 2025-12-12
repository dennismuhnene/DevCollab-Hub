'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/hooks/use-auth';
import type { UserProfile, Project } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Search, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import DeveloperCard from '@/components/developer-card';
import ProjectCard from '@/components/project-card';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { DiscoverFilters } from '@/components/discover-filters';
import { logAnalyticsEvent } from '@/firebase/analytics';

const professionalSkills = [
  'Problem Solving', 'Debugging', 'System Design', 'Communication', 'Team Collaboration',
  'Agile Development', 'API Design', 'Version Control (Git)', 'Project Management', 'Code Review',
  'Testing & QA', 'Algorithmic Thinking', 'Security Best Practices', 'Time Management', 'Documentation Writing',
];

const technologies = [
  'JavaScript', 'TypeScript', 'React', 'Next.js', 'Vue.js', 'Angular', 'Node.js', 'Express', 
  'Python', 'Django', 'Flask', 'Ruby', 'Ruby on Rails', 'Java', 'Spring', 'PHP', 'Laravel', 
  'Go', 'Rust', 'Swift', 'Kotlin', 'Dart', 'Flutter', 'React Native', 'HTML', 'CSS', 'Sass', 
  'Tailwind CSS', 'GraphQL', 'REST', 'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Firebase', 
  'AWS', 'Google Cloud', 'Azure', 'Docker', 'Kubernetes', 'Terraform',
];

type ViewMode = 'developers' | 'projects';
type Item = UserProfile | Project;
const isProject = (item: Item): item is Project => 'title' in item;

const ITEMS_PER_PAGE = 6;

export default function DiscoverPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [allDevelopers, setAllDevelopers] = useState<UserProfile[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('projects');
  const [filteredResults, setFilteredResults] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAiSorting, startAiSortTransition] = useTransition();

  const [experienceRange, setExperienceRange] = useState<[number, number]>([0, 20]);
  const [selectedTechs, setSelectedTechs] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;

    logAnalyticsEvent('screen_view', { screen_name: 'Developers' });

    const fetchData = async () => {
      setLoading(true);
      try {
        const usersQuery = query(collection(db, 'users'), where('uid', '!=', user.uid));
        const usersSnapshot = await getDocs(usersQuery);
        const developersData = usersSnapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile));
        setAllDevelopers(developersData);

        const projectsCol = collection(db, 'projects');
        const allProjectsSnapshot = await getDocs(projectsCol);
        const allProjectsData = allProjectsSnapshot.docs
            .filter(doc => doc.exists() && doc.data())
            .map(doc => ({ ...doc.data(), id: doc.id } as Project));
        
        const userOwnedProjects = allProjectsData.filter(p => p.ownerId === user.uid);
        const otherProjects = allProjectsData.filter(p => p.ownerId !== user.uid);

        setAllProjects(otherProjects);
        setUserProjects(userOwnedProjects);

      } catch (error) {
        console.error("Error fetching discovery data:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load discovery data.'});
      }
      setLoading(false);
    };

    fetchData();
  }, [user, toast]);

  const handleAiSort = async () => {
      if (!user) {
        toast({ title: "Authentication Error", description: "You must be logged in to use this feature.", variant: "destructive" });
        return;
      }

      if (filteredResults.length === 0) {
          toast({ title: "No results to sort", description: "Please broaden your filters before sorting.", variant: "destructive" });
          return;
      }

      let context;
      if (viewMode === 'developers') {
        context = userProjects.length > 0 ? userProjects : userProfile;
      } else {
        context = userProfile;
      }

      if (!context) {
          toast({ title: "Profile or project data missing", description: "Please complete your profile or create a project first.", variant: "destructive" });
          return;
      }

      logAnalyticsEvent('ai_sort', { view_mode: viewMode });

      startAiSortTransition(async () => {
          try {
              const token = await user.getIdToken();
              const response = await fetch('/api/ai/sort', {
                  method: 'POST',
                  headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({ context, items: filteredResults, viewMode }),
              });

              if (!response.ok) {
                  const errorData = await response.json();
                  throw new Error(errorData.error || 'AI sorting failed');
              }

              const { sortedIds } = await response.json();
              
              const sorted = [...filteredResults].sort((a, b) => {
                  const idA = isProject(a) ? a.id : a.uid;
                  const idB = isProject(b) ? b.id : b.uid;
                  return sortedIds.indexOf(idA) - sortedIds.indexOf(idB);
              });
              
              setFilteredResults(sorted);
              setCurrentPage(1);
              toast({ title: "Success!", description: "Results have been sorted by AI.", variant: "default" });

          } catch (error) {
              console.error("AI Sort Error:", error);
              const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
              toast({ title: "AI Sort Failed", description: errorMessage, variant: "destructive" });
          }
      });
  };

  useEffect(() => {
    if (loading) return;

    let results: Item[] = viewMode === 'developers' ? [...allDevelopers] : [...allProjects];

    let filtered = results.filter(item => {
        if (selectedTechs.length > 0) {
            const itemTechs = isProject(item) ? item.requiredTechStack : item.techStack;
            if (!selectedTechs.every(t => itemTechs?.includes(t)))
                return false;
        }
        if (selectedSkills.length > 0) {
            const itemSkills = isProject(item) ? item.requiredSkills : item.skills;
            if (!selectedSkills.every(s => itemSkills?.includes(s)))
                return false;
        }
        const exp = (isProject(item) ? item.requiredYearsOfExperience : item.yearsOfExperience) ?? 0;
        if (exp < experienceRange[0] || exp > experienceRange[1]) {
            return false;
        }
        return true;
    });

    if (searchTerm) {
        const lowerTerm = searchTerm.toLowerCase();
        filtered = filtered.filter(item => {
            const name = isProject(item) ? item.title : item.name;
            const description = isProject(item) ? item.description : item.bio;
            return name?.toLowerCase().includes(lowerTerm) || description?.toLowerCase().includes(lowerTerm);
        });
    }

    setFilteredResults(filtered);
    setCurrentPage(1);

  }, [viewMode, allDevelopers, allProjects, loading, searchTerm, selectedTechs, selectedSkills, experienceRange]);

  const handleViewModeChange = (checked: boolean) => {
    setViewMode(checked ? 'projects' : 'developers');
    setFilteredResults([]);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSelectedTechs([]);
    setSelectedSkills([]);
    setExperienceRange([0, 20]);
    setSearchTerm('');
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(filteredResults.length / ITEMS_PER_PAGE);
  const paginatedResults = filteredResults.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const ListSkeleton = () => <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">{[...Array(ITEMS_PER_PAGE)].map((_, i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-48 w-full" /></CardContent></Card>)}</div>;

  const renderResults = () => {
    if (filteredResults.length === 0) {
      return (
        <div className="text-center py-20">
            <h2 className="text-xl font-semibold">No Results Found</h2>
            <p className="mt-2 text-muted-foreground">Try adjusting your filters or search criteria.</p>
        </div>
      );
    }

    return (
      <>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedResults.map((item) => {
                if (isProject(item)) {
                    return <ProjectCard key={`proj-${item.id}`} project={item} />;
                }
                return <DeveloperCard key={`dev-${item.uid}`} developer={item as UserProfile} />;
            })}
        </div>
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button 
              variant="outline" 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="mb-12 text-center">
            <h1 className="text-4xl font-bold tracking-tight font-headline">Discover Your Tribe</h1>
            <p className="mt-3 text-lg text-muted-foreground">Toggle to find projects or connect with developers.</p>
        </div>

        <div className="flex justify-center items-center gap-4 mb-8">
            <span className={`font-semibold ${viewMode === 'developers' ? 'text-primary' : 'text-muted-foreground'}`}>
                Developers
            </span>
            <Switch
                checked={viewMode === 'projects'}
                onCheckedChange={handleViewModeChange}
                aria-label="Toggle between discovering developers and projects"
            />
            <span className={`font-semibold ${viewMode === 'projects' ? 'text-primary' : 'text-muted-foreground'}`}>
                Projects
            </span>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1">
                <DiscoverFilters
                    allTechs={technologies}
                    allSkills={professionalSkills}
                    experienceRange={experienceRange}
                    setExperienceRange={setExperienceRange}
                    selectedTechs={selectedTechs}
                    setSelectedTechs={setSelectedTechs}
                    selectedSkills={selectedSkills}
                    setSelectedSkills={setSelectedSkills}
                    resetFilters={resetFilters}
                />
            </div>
            <div className="lg:col-span-3">
                <Card className="mb-8 p-4 sticky top-4 z-10 bg-background/80 backdrop-blur-sm">
                    <div className="flex items-center gap-4">
                        <div className="relative flex-grow">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder={`Search for ${viewMode}...`}
                                className="pl-10 w-full"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                        <Button onClick={handleAiSort} disabled={isAiSorting || loading}>
                            <Sparkles className={`mr-2 h-4 w-4 ${isAiSorting ? 'animate-spin' : ''}`} />
                            Sort with AI
                        </Button>
                    </div>
                </Card>
                {loading || authLoading ? <ListSkeleton /> : renderResults()}
            </div>
        </div>
    </div>
  );
}
