'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/hooks/use-auth';
import type { UserProfile, Project, Role } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Search, Filter } from 'lucide-react';
import { useRouter } from 'next/navigation';
import DeveloperCard from '@/components/developer-card';
import ProjectCard from '@/components/project-card';
import RoleCard from '@/components/role-card';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DiscoverFilters } from '@/components/discover-filters';
import { logAnalyticsEvent } from '@/firebase/analytics';
import { professionalSkills, technologies } from '@/lib/constants';
import { useDrag } from '@use-gesture/react';
import { animated, useSpring } from '@react-spring/web';
import { ItemDialog } from '@/components/discover/item-dialog';

const ITEMS_PER_PAGE = 6;

type ViewMode = 'developers' | 'projects' | 'posts';
type Item = UserProfile | Project | Role;

const isProject = (item: Item): item is Project => 'title' in item && !('roleDescription' in item);
const isRole = (item: Item): item is Role => 'title' in item && 'roleDescription' in item;

const calculateMatchScore = (item: Item, currentUserProfile: UserProfile): number => {
  let score = 0;
  if (!currentUserProfile) return 0;

  const userTech = currentUserProfile.techStack || [];
  const userSkills = currentUserProfile.skills || [];

  if (isProject(item) || isRole(item)) {
    const requiredTech = item.requiredTechStack || [];
    score += userTech.filter(tech => requiredTech.includes(tech)).length * 4;

    const requiredSkills = item.requiredSkills || [];
    score += userSkills.filter(skill => requiredSkills.includes(skill)).length * 4;

    const userExp = currentUserProfile.yearsOfExperience ?? 0;
    const requiredExp = item.requiredYearsOfExperience ?? 0;
    if (userExp >= requiredExp) {
      score += 5;
    }

    if (isProject(item) && item.collaborationOpen) {
      score += 5;
    }

    const seekingPaid = currentUserProfile.collaborationGoals?.includes('Seeking paid contract work');
    const offersPaid = ['Paid Contract', 'Equity Share', 'Revenue Share'].includes(item.incentives || '');
    if (seekingPaid && offersPaid) {
      score += 3;
    }

    if (isRole(item)) {
      if (currentUserProfile.commitmentLevel && item.commitmentLevel === currentUserProfile.commitmentLevel) {
        score += 4;
      }

      if (currentUserProfile.collaborationTypes?.includes(item.collaborationType)) {
        score += 4;
      }

      const userFunctions = currentUserProfile.partnerFunctions || [];
      const roleFunctions = item.partnerFunctions || [];
      score += userFunctions.filter(f => roleFunctions.includes(f)).length * 2;

      const userLocations = currentUserProfile.locations || [];
      const roleLocations = item.locations || [];
      score += userLocations.filter(l => roleLocations.includes(l)).length * 2;
    }
  } else {
    const developer = item as UserProfile;
    const devTech = developer.techStack || [];
    score += userTech.filter(tech => devTech.includes(tech)).length * 3;

    const devSkills = developer.skills || [];
    score += userSkills.filter(skill => devSkills.includes(skill)).length * 3;

    const userExp = currentUserProfile.yearsOfExperience ?? 0;
    const devExp = developer.yearsOfExperience ?? 0;
    if (Math.abs(userExp - devExp) <= 2) {
      score += 5;
    }

    if (developer.openForCollaboration) {
      score += 5;
    }

    if (currentUserProfile.commitmentLevel && developer.commitmentLevel === currentUserProfile.commitmentLevel) {
      score += 4;
    }

    const userGoals = currentUserProfile.collaborationGoals || [];
    const devGoals = developer.collaborationGoals || [];
    score += userGoals.filter(goal => devGoals.includes(goal)).length * 2;
  }
  return score;
};

export default function DiscoverPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [allDevelopers, setAllDevelopers] = useState<UserProfile[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [allPosts, setAllPosts] = useState<Role[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('projects');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtersVisible, setFiltersVisible] = useState(true);

  const [experienceRange, setExperienceRange] = useState<[number, number]>([0, 20]);
  const [selectedTechs, setSelectedTechs] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedItemIndex, setSelectedItemIndex] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [{ y }, api] = useSpring(() => ({ y: 0 }));
  const [bounds, setBounds] = useState({ top: 0, bottom: 500 });

  useEffect(() => {
    setBounds({ top: 0, bottom: window.innerHeight - 100 });
  }, []);

  const bind = useDrag(
    ({ down, movement: [, my] }) => {
      api.start({ y: my });
    },
    { bounds }
  );

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;

    logAnalyticsEvent('screen_view', { screen_name: 'Discover' });

    const fetchData = async () => {
      setLoading(true);
      try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const developersData = usersSnapshot.docs
          .map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile))
          .filter(developer => developer.uid !== user.uid);
        setAllDevelopers(developersData);

        const projectsSnapshot = await getDocs(collection(db, 'projects'));
        const projectsData = projectsSnapshot.docs
          .filter(doc => doc.exists() && doc.data() && doc.data().ownerId !== user.uid)
          .map(doc => ({ ...doc.data(), id: doc.id } as Project));
        setAllProjects(projectsData);

        const rolesSnapshot = await getDocs(collection(db, 'roles'));
        const rolesData = rolesSnapshot.docs
          .map(doc => ({ ...doc.data(), id: doc.id } as Role))
          .filter(role => role.ownerId !== user.uid);
        setAllPosts(rolesData);
      } catch (error) {
        console.error('Error fetching discovery data:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load discovery data.' });
      }
      setLoading(false);
    };

    fetchData();
  }, [user, toast]);

  const sortedAndFilteredResults = useMemo(() => {
    if (loading || !userProfile) return [];

    let results: Item[];
    if (viewMode === 'developers') results = [...allDevelopers];
    else if (viewMode === 'projects') results = [...allProjects];
    else results = [...allPosts];

    let filtered = results.filter(item => {
      const itemIsProject = isProject(item);
      const itemIsRole = isRole(item);
      const itemIsDeveloper = !itemIsProject && !itemIsRole;

      if (selectedTechs.length > 0) {
        const itemTechs = itemIsDeveloper ? item.techStack : item.requiredTechStack;
        if (!selectedTechs.every(t => itemTechs?.includes(t))) return false;
      }
      if (selectedSkills.length > 0) {
        const itemSkills = itemIsDeveloper ? item.skills : item.requiredSkills;
        if (!selectedSkills.every(s => itemSkills?.includes(s))) return false;
      }
      const exp = (itemIsDeveloper ? item.yearsOfExperience : item.requiredYearsOfExperience) ?? 0;
      if (exp < experienceRange[0] || exp > experienceRange[1]) {
        return false;
      }
      return true;
    });

    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(item => {
        const name = isRole(item) || isProject(item) ? item.title : (item as UserProfile).name;
        const description = isRole(item)
          ? item.roleDescription
          : isProject(item)
          ? item.description
          : (item as UserProfile).bio;
        return name?.toLowerCase().includes(lowerTerm) || description?.toLowerCase().includes(lowerTerm);
      });
    }

    const sorted = filtered.sort((a, b) => {
      const scoreA = calculateMatchScore(a, userProfile);
      const scoreB = calculateMatchScore(b, userProfile);
      return scoreB - scoreA;
    });

    return sorted;
  }, [viewMode, allDevelopers, allProjects, allPosts, loading, userProfile, searchTerm, selectedTechs, selectedSkills, experienceRange]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedTechs, selectedSkills, experienceRange, viewMode]);

  const totalPages = Math.ceil(sortedAndFilteredResults.length / ITEMS_PER_PAGE);
  const paginatedResults = sortedAndFilteredResults.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleCardClick = (item: Item, index: number) => {
    setSelectedItemIndex(index);
    setIsDialogOpen(true);
  };

  const resetFilters = () => {
    setSelectedTechs([]);
    setSelectedSkills([]);
    setExperienceRange([0, 20]);
    setSearchTerm('');
  };

  const ListSkeleton = () => (
    <div className={`grid grid-cols-1 gap-8 sm:grid-cols-2 ${filtersVisible ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}>
      {[...Array(ITEMS_PER_PAGE)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderResults = () => {
    if (sortedAndFilteredResults.length === 0) {
      return (
        <div className="text-center py-20">
          <h2 className="text-lg font-semibold">No Results Found</h2>
          <p className="mt-2 text-muted-foreground">Try adjusting your filters or search criteria.</p>
        </div>
      );
    }

    return (
      <>
        <div className={`grid grid-cols-1 gap-8 sm:grid-cols-2 ${filtersVisible ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}>
          {paginatedResults.map((item, index) => {
            const itemIndex = ((currentPage - 1) * ITEMS_PER_PAGE) + index;
            if (isProject(item)) return <div key={`proj-${item.id}`} onClick={() => handleCardClick(item, itemIndex)}><ProjectCard project={item} /></div>;
            if (isRole(item)) return <div key={`role-${item.id}`} onClick={() => handleCardClick(item, itemIndex)}><RoleCard role={item} isDiscoverMode={true} /></div>;
            return <div key={`dev-${(item as UserProfile).uid}`} onClick={() => handleCardClick(item, itemIndex)}><DeveloperCard developer={item as UserProfile} /></div>;
          })}
        </div>
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center items-center gap-4">
            <Button variant="outline" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button variant="outline" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
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
        <h1 className="text-2xl font-semibold leading-none tracking-tight">Discover Your Tribe</h1>
        <p className="mt-3 text-sm text-muted-foreground">Find projects, connect with developers, or explore open posts.</p>
      </div>

      <div className="flex justify-center items-center gap-2 mb-8 rounded-full bg-muted p-1">
        <Button variant={viewMode === 'developers' ? 'default' : 'ghost'} onClick={() => setViewMode('developers')} className="rounded-full">
          Developers
        </Button>
        <Button variant={viewMode === 'projects' ? 'default' : 'ghost'} onClick={() => setViewMode('projects')} className="rounded-full">
          Projects
        </Button>
        <Button variant={viewMode === 'posts' ? 'default' : 'ghost'} onClick={() => setViewMode('posts')} className="rounded-full">
          Posts
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {filtersVisible ? (
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
              onHide={() => setFiltersVisible(false)}
            />
          </div>
        ) : (
          <animated.div
            {...bind()}
            style={{ y, touchAction: 'none' }}
            className="fixed top-1/2 left-0 z-20"
          >
            <Button onClick={() => setFiltersVisible(true)} className="pl-2 pr-3 py-6 rounded-r-full">
              <Filter className="h-5 w-5" />
            </Button>
          </animated.div>
        )}
        <div className={filtersVisible ? "lg:col-span-3" : "lg:col-span-4"}>
          <Card className="mb-8 p-4 sticky top-4 z-10 bg-background/80 backdrop-blur-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder={`Search for ${viewMode}...`}
                className="pl-10 w-full"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                disabled={loading}
              />
            </div>
          </Card>
          {loading || authLoading ? <ListSkeleton /> : renderResults()}
        </div>
      </div>
      {isDialogOpen && (
        <ItemDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          items={sortedAndFilteredResults}
          initialIndex={selectedItemIndex}
          viewMode={viewMode}
        />
      )}
    </div>
  );
}
