
'use client';

import { useState, useEffect, useTransition, useMemo } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/hooks/use-auth';
import type { UserProfile } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Search, Sparkles, Filter, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import DeveloperCard from '@/components/developer-card';
import { getUserRecommendations } from '@/ai/flows/get-user-recommendations';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Check, ChevronsUpDown } from 'lucide-react';


const professionalSkills = [
  'Problem Solving', 'Debugging', 'System Design', 'Communication', 'Team Collaboration', 'Agile Development', 
  'API Design', 'Version Control (Git)', 'Project Management', 'Code Review', 'Testing & QA', 
  'Algorithmic Thinking', 'Security Best Practices', 'Time Management', 'Documentation Writing',
];

export default function DiscoverDevelopersPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const [allDevelopers, setAllDevelopers] = useState<UserProfile[]>([]);
  const [filteredDevelopers, setFilteredDevelopers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAiSorting, startAiSortTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedTechs, setSelectedTechs] = useState<string[]>([]);
  const [experienceRange, setExperienceRange] = useState([0, 20]);

  // Dynamic lists for filters
  const allTechStacks = useMemo(() => {
    const techs = new Set<string>();
    allDevelopers.forEach(dev => dev.techStack?.forEach(t => techs.add(t)));
    return Array.from(techs).sort();
  }, [allDevelopers]);


  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;

    const fetchDevelopers = async () => {
      setLoading(true);
      
      const usersCol = collection(db, 'users');
      const usersQuery = query(usersCol, where('uid', '!=', user.uid));
      const usersSnapshot = await getDocs(usersQuery);
      const developersData = usersSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          uid: doc.id,
          name: data.name || 'Unnamed User',
          email: data.email,
          displayName: data.displayName || 'Unnamed User',
          bio: data.bio || '',
          skills: data.skills || [],
          techStack: data.techStack || [],
          photoURL: data.photoURL || '',
          openForCollaboration: data.openForCollaboration === false ? false : true,
          ...data,
        } as UserProfile;
      });
      
      setAllDevelopers(developersData);
      setFilteredDevelopers(developersData);
      setLoading(false);
    };

    fetchDevelopers();
  }, [user]);

  useEffect(() => {
    const applyFilters = () => {
      let results = allDevelopers;

      // Search term filter
      if (searchTerm) {
        const lowercasedTerm = searchTerm.toLowerCase();
        results = results.filter(dev => 
          dev.name?.toLowerCase().includes(lowercasedTerm) ||
          (dev.bio || '').toLowerCase().includes(lowercasedTerm)
        );
      }

      // Tech stack filter
      if (selectedTechs.length > 0) {
        results = results.filter(dev => 
          selectedTechs.every(tech => dev.techStack?.includes(tech))
        );
      }

      // Skills filter
      if (selectedSkills.length > 0) {
        results = results.filter(dev =>
          selectedSkills.every(skill => dev.skills?.includes(skill))
        );
      }
      
      // Experience filter
      results = results.filter(dev => {
        const devExp = dev.yearsOfExperience ?? 0;
        return devExp >= experienceRange[0] && devExp <= experienceRange[1];
      });

      setFilteredDevelopers(results);
    };
    applyFilters();
  }, [searchTerm, selectedSkills, selectedTechs, experienceRange, allDevelopers]);
  
  const resetFilters = () => {
    setSearchTerm('');
    setSelectedSkills([]);
    setSelectedTechs([]);
    setExperienceRange([0, 20]);
  };

  const handleAiSort = () => {
    if (!userProfile?.skills || userProfile.skills.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Add Skills to Your Profile',
        description: 'AI recommendations require skills. Please edit your profile to add some.',
      });
      return;
    }
  
    const performAiSort = async () => {
      try {
        const developerDescriptions = allDevelopers.map(dev =>
          `Name: ${dev.name}, Bio: ${dev.bio || 'Not provided'}, Skills: ${(dev.skills || []).join(', ') || 'None'}, Tech Stack: ${(dev.techStack || []).join(', ')}, Experience: ${dev.yearsOfExperience || 0} years`
        );
  
        const recommendedOrder = await getUserRecommendations({
          userSkills: userProfile.skills || [],
          projectDescriptions: developerDescriptions,
        });
  
        const sortedDevelopers = recommendedOrder.map(rec => {
          return allDevelopers.find(dev => {
            const devDescription = `Name: ${dev.name}, Bio: ${dev.bio || 'Not provided'}, Skills: ${(dev.skills || []).join(', ') || 'None'}, Tech Stack: ${(dev.techStack || []).join(', ')}, Experience: ${dev.yearsOfExperience || 0} years`;
            return devDescription === rec;
          });
        }).filter((dev): dev is UserProfile => dev !== undefined);
  
        const recommendedIds = new Set(sortedDevelopers.map(d => d.uid));
        const otherDevelopers = allDevelopers.filter(dev => !recommendedIds.has(dev.uid));
  
        const finalSortedList = [...sortedDevelopers, ...otherDevelopers];
  
        startAiSortTransition(() => {
          setAllDevelopers(finalSortedList);
          resetFilters();
        });
  
        toast({
          title: 'Developers Sorted!',
          description: 'Developers have been sorted by relevance to your profile.',
        });
      } catch (error) {
        console.error('AI sorting failed:', error);
        toast({
          variant: 'destructive',
          title: 'AI Sorting Failed',
          description: 'Could not sort developers at this time. Please try again later.',
        });
      }
    };
  
    performAiSort();
  };

  const DeveloperListSkeleton = () => (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
         <div key={i} className="space-y-4 rounded-lg border p-4">
            <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-40" />
                </div>
            </div>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
      ))}
    </div>
  );

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight font-headline">Discover your Tribe</h1>
        <p className="mt-3 text-lg text-muted-foreground">Find and connect with talented developers from across the platform.</p>
      </div>

      <Card className="mb-8 p-4 md:p-6">
        <CardContent className="p-0">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by name or bio..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={loading}
                />
              </div>
              <Button onClick={handleAiSort} disabled={isAiSorting || loading} variant="outline" className="w-full md:w-auto flex-shrink-0">
                <Sparkles className={`mr-2 h-4 w-4 text-yellow-500 ${isAiSorting ? 'animate-spin' : ''}`} />
                Sort by AI
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Tech Stack Filter */}
              <div className="space-y-2">
                <Label>Tech Stack</Label>
                <MultiSelectPopover title="Tech Stack" options={allTechStacks} selected={selectedTechs} setSelected={setSelectedTechs} />
              </div>
              
              {/* Skills Filter */}
              <div className="space-y-2">
                <Label>Skills</Label>
                <MultiSelectPopover title="Skills" options={professionalSkills} selected={selectedSkills} setSelected={setSelectedSkills} />
              </div>

              {/* Experience Filter */}
              <div className="space-y-2">
                <Label>Years of Experience: {experienceRange[0]} - {experienceRange[1]}</Label>
                 <Slider
                  value={experienceRange}
                  onValueChange={setExperienceRange}
                  max={20}
                  step={1}
                  disabled={loading}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="ghost" onClick={resetFilters} disabled={loading}>
                <X className="mr-2 h-4 w-4" />
                Reset Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>


      {loading || authLoading ? (
        <DeveloperListSkeleton />
      ) : (
        <div>
            {filteredDevelopers.length > 0 ? (
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {filteredDevelopers.map((dev) => (
                    <DeveloperCard key={dev.uid} developer={dev} />
                ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 py-20 text-center">
                    <h2 className="text-xl font-semibold">No Developers Found</h2>
                    <p className="mt-2 text-muted-foreground">
                      Your search and filter combination did not return any results. Try broadening your criteria.
                    </p>
                </div>
            )}
        </div>
      )}
    </div>
  );
}


// MultiSelectPopover Component
function MultiSelectPopover({ title, options, selected, setSelected }: { title: string; options: string[]; selected: string[]; setSelected: (value: string[]) => void; }) {
  const [open, setOpen] = useState(false);

  const handleSelect = (option: string) => {
    const newSelected = selected.includes(option)
      ? selected.filter(item => item !== option)
      : [...selected, option];
    setSelected(newSelected);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <span className="truncate">
            {selected.length > 0 ? `${selected.length} selected` : `Select ${title}...`}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder={`Search ${title}...`} />
          <CommandList>
            <CommandEmpty>No {title.toLowerCase()} found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => handleSelect(option)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selected.includes(option) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
        {selected.length > 0 && (
          <div className="p-2 border-t">
            <Button variant="ghost" size="sm" className="w-full" onClick={() => setSelected([])}>Clear selected</Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
