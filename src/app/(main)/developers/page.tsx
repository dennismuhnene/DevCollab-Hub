'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/hooks/use-auth';
import type { UserProfile, Project } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import DeveloperCard from '@/components/developer-card';
import ProjectCard from '@/components/project-card';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { DiscoverFilters } from '@/components/discover-filters';
import { logAnalyticsEvent } from '@/firebase/analytics';
import { professionalSkills, technologies } from '@/lib/constants';

// --- Constants ---
const ITEMS_PER_PAGE = 6;

// --- Type guards and definitions ---
type ViewMode = 'developers' | 'projects';
type Item = UserProfile | Project;
const isProject = (item: Item): item is Project => 'title' in item;

// --- New Weighted Algorithmic Sorting Logic ---
const calculateMatchScore = (item: Item, currentUserProfile: UserProfile): number => {
  let score = 0;
  if (!currentUserProfile) return 0;

  if (isProject(item)) {
    // Scoring projects based on the user's profile
    const project = item;
    const userTech = currentUserProfile.techStack || [];
    const projectTech = project.requiredTechStack || [];
    score += userTech.filter(tech => projectTech.includes(tech)).length * 4; // +4 per matching tech

    const userSkills = currentUserProfile.skills || [];
    const projectSkills = project.requiredSkills || [];
    score += userSkills.filter(skill => projectSkills.includes(skill)).length * 4; // +4 per matching skill

    const userExp = currentUserProfile.yearsOfExperience ?? 0;
    const projectExp = project.requiredYearsOfExperience ?? 0;
    if (userExp >= projectExp) {
      score += 5; // +5 bonus if user meets experience requirement
    }
    if (project.collaborationOpen) {
        score += 5; // +5 bonus for open collaboration
    }
    
    const seekingPaid = currentUserProfile.collaborationGoals?.includes('Seeking paid contract work');
    const projectOffersPaid = ['Paid Contract', 'Equity Share', 'Revenue Share'].includes(project.incentives || '');
    if (seekingPaid && projectOffersPaid) {
        score += 3;
    }

    const seekingFounder = currentUserProfile.collaborationGoals?.includes('Co-founders for a startup');
    const projectIsEarly = ['Idea', 'Wireframing'].includes(project.projectStage || '');
    if(seekingFounder && projectIsEarly){
        score += 2;
    }

  } else {
    // Scoring other developers based on the user's profile
    const developer = item;
    const userTech = currentUserProfile.techStack || [];
    const devTech = developer.techStack || [];
    score += userTech.filter(tech => devTech.includes(tech)).length * 3; // +3 per common tech

    const userSkills = currentUserProfile.skills || [];
    const devSkills = developer.skills || [];
    score += userSkills.filter(skill => devSkills.includes(skill)).length * 3; // +3 per common skill

    const userExp = currentUserProfile.yearsOfExperience ?? 0;
    const devExp = developer.yearsOfExperience ?? 0;
    if (Math.abs(userExp - devExp) <= 2) {
        score += 5; // +5 Experience peer bonus
    }

    if(developer.openForCollaboration){
        score += 5; // +5 collaboration bonus
    }
    
    if(currentUserProfile.commitmentLevel && developer.commitmentLevel === currentUserProfile.commitmentLevel){
        score += 4; // +4 for matching commitment
    }

    const userGoals = currentUserProfile.collaborationGoals || [];
    const devGoals = developer.collaborationGoals || [];
    score += userGoals.filter(goal => devGoals.includes(goal)).length * 2; // +2 per shared goal
  }
  return score;
};


export default function DiscoverPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [allDevelopers, setAllDevelopers] = useState<UserProfile[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('projects');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
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
            .filter(doc => doc.exists() && doc.data() && doc.data().ownerId !== user.uid)
            .map(doc => ({ ...doc.data(), id: doc.id } as Project));
        
        setAllProjects(allProjectsData);

      } catch (error) {
        console.error("Error fetching discovery data:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load discovery data.'});
      }
      setLoading(false);
    };

    fetchData();
  }, [user, toast]);

  // --- Combined Filtering and Sorting Logic ---
  const sortedAndFilteredResults = useMemo(() => {
    if (loading || !userProfile) return [];

    let results: Item[] = viewMode === 'developers' ? [...allDevelopers] : [...allProjects];

    // 1. Filter results based on user selection
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

    // 2. Sort the filtered results based on our new match score algorithm
    const sorted = filtered.sort((a, b) => {
        const scoreA = calculateMatchScore(a, userProfile);
        const scoreB = calculateMatchScore(b, userProfile);
        return scoreB - scoreA; // Sort in descending order of score
    });

    return sorted;
  }, [viewMode, allDevelopers, allProjects, loading, userProfile, searchTerm, selectedTechs, selectedSkills, experienceRange]);

  useEffect(() => {
      setCurrentPage(1);
  }, [searchTerm, selectedTechs, selectedSkills, experienceRange, viewMode]);

  // --- Pagination Logic ---
  const totalPages = Math.ceil(sortedAndFilteredResults.length / ITEMS_PER_PAGE);
  const paginatedResults = sortedAndFilteredResults.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleViewModeChange = (checked: boolean) => {
    setViewMode(checked ? 'projects' : 'developers');
  };

  const resetFilters = () => {
    setSelectedTechs([]);
    setSelectedSkills([]);
    setExperienceRange([0, 20]);
    setSearchTerm('');
  };
  
  // --- Render Functions ---
  const ListSkeleton = () => <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">{[...Array(ITEMS_PER_PAGE)].map((_, i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-48 w-full" /></CardContent></Card>)}</div>;

  const renderResults = () => {
    if (sortedAndFilteredResults.length === 0) {
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
                } else {
                    return <DeveloperCard key={`dev-${(item as UserProfile).uid}`} developer={item as UserProfile} />;
                }
            })}
        </div>
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center items-center gap-4">
            <Button variant="outline" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</Button>
            <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
            <Button variant="outline" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</Button>
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
            <span className={`font-semibold ${viewMode === 'developers' ? 'text-primary' : 'text-muted-foreground'}`}>Developers</span>
            <Switch checked={viewMode === 'projects'} onCheckedChange={handleViewModeChange} aria-label="Toggle between discovering developers and projects"/>
            <span className={`font-semibold ${viewMode === 'projects' ? 'text-primary' : 'text-muted-foreground'}`}>Projects</span>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1">
                <DiscoverFilters allTechs={technologies} allSkills={professionalSkills} experienceRange={experienceRange} setExperienceRange={setExperienceRange} selectedTechs={selectedTechs} setSelectedTechs={setSelectedTechs} selectedSkills={selectedSkills} setSelectedSkills={setSelectedSkills} resetFilters={resetFilters} />
            </div>
            <div className="lg:col-span-3">
                <Card className="mb-8 p-4 sticky top-4 z-10 bg-background/80 backdrop-blur-sm">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input type="search" placeholder={`Search for ${viewMode}...`} className="pl-10 w-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} disabled={loading} />
                    </div>
                </Card>
                {loading || authLoading ? <ListSkeleton /> : renderResults()}
            </div>
        </div>
    </div>
  );
}
