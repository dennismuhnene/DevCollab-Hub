'use client';

import { useState, useEffect, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { doc } from 'firebase/firestore';
import { updateProfile, deleteUser } from 'firebase/auth';
import { db, auth } from '@/lib/firebase/config';
import { useAuth } from '@/lib/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/types';
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
import { summarizeUserSkills } from '@/ai/flows/user-skills-summarizer';
import { Sparkles, Loader2, X, Trash2, Check, ChevronsUpDown } from 'lucide-react';
import { Switch } from './ui/switch';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const professionalSkills = [
  'Problem Solving',
  'Debugging',
  'System Design',
  'Communication',
  'Team Collaboration',
  'Agile Development',
  'API Design',
  'Version Control (Git)',
  'Project Management',
  'Code Review',
  'Testing & QA',
  'Algorithmic Thinking',
  'Security Best Practices',
  'Time Management',
  'Documentation Writing',
];

const profileSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters long' }),
  bio: z.string().optional(),
  techStack: z.array(z.string()).optional(),
  skills: z.array(z.string()).max(5, { message: 'You can select up to 5 skills.' }).optional(),
  yearsOfExperience: z.coerce.number().min(0, { message: "Years of experience can't be negative."}).optional(),
  openForCollaboration: z.boolean().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

type ProfileFormProps = {
  userProfile: UserProfile;
};

export default function ProfileForm({ userProfile }: ProfileFormProps) {
  const { user, reloadUserProfile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [techStackInput, setTechStackInput] = useState('');
  const [isAiPending, startAiTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    getValues,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      bio: '',
      techStack: [],
      skills: [],
      yearsOfExperience: 0,
      openForCollaboration: true,
    },
  });

  const bioValue = watch('bio');
  const techStack = watch('techStack') || [];
  const skills = watch('skills') || [];
  const openForCollaboration = watch('openForCollaboration');
  
  useEffect(() => {
    if (userProfile) {
      reset({
        name: userProfile.name || '',
        bio: userProfile.bio || '',
        techStack: userProfile.techStack || [],
        skills: userProfile.skills || [],
        yearsOfExperience: userProfile.yearsOfExperience || 0,
        openForCollaboration: userProfile.openForCollaboration === false ? false : true,
      });
    }
  }, [userProfile, reset]);

  const handleTechStackAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && techStackInput.trim()) {
      e.preventDefault();
      const currentTechStack = getValues('techStack') || [];
      const newTech = techStackInput.trim();
      if (!currentTechStack.includes(newTech)) {
        setValue('techStack', [...currentTechStack, newTech], { shouldValidate: true, shouldDirty: true });
      }
      setTechStackInput('');
    }
  };

  const handleTechStackRemove = (techToRemove: string) => {
    const currentTechStack = getValues('techStack') || [];
    setValue('techStack', currentTechStack.filter((tech) => tech !== techToRemove), { shouldValidate: true, shouldDirty: true });
  };
  
  const handleGenerateBio = async () => {
    const currentSkills = getValues('skills');
    if (!currentSkills || currentSkills.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Skills Required',
        description: 'Please add at least one skill to generate a bio.',
      });
      return;
    }
    
    startAiTransition(async () => {
      try {
        const result = await summarizeUserSkills({ profileDescription: bioValue || 'A passionate developer.', skills: currentSkills });
        if (result?.summary) {
          setValue('bio', result.summary, { shouldValidate: true, shouldDirty: true });
          toast({
            title: 'Bio Generated!',
            description: 'The AI has generated a new bio for you.',
          });
        }
      } catch (error) {
        console.error("AI Bio generation failed:", error);
        toast({
          variant: 'destructive',
          title: 'AI Generation Failed',
          description: 'Could not generate a bio at this time. Check the console for details.',
        });
      }
    });
  };

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;
    setLoading(true);

    const userRef = doc(db, 'users', user.uid);
    updateDocumentNonBlocking(userRef, data);
    
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, {
        displayName: data.name,
      });
    }

    toast({ title: 'Profile updated successfully!' });
    reloadUserProfile();
    setLoading(false);
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await deleteUser(user);
      toast({ title: 'Account deleted successfully' });
      router.push('/');
    } catch (error: any) {
      console.error("Account deletion error:", error);
      toast({ variant: 'destructive', title: 'Error deleting account', description: error.message });
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" {...register('name')} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
                <Label htmlFor="yearsOfExperience">Years of Experience</Label>
                <Input id="yearsOfExperience" type="number" step="0.5" {...register('yearsOfExperience')} />
                <p className="text-sm text-muted-foreground pt-1">
                    Use decimals for half-year increments (e.g., 2.5). For less than a year, use decimals (e.g. 0.5 for 6 months).
                </p>
                {errors.yearsOfExperience && <p className="text-sm text-destructive">{errors.yearsOfExperience.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Skills</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                  >
                    <span className="truncate">
                      {skills.length > 0 ? skills.join(', ') : 'Select up to 5 skills...'}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Search skills..." />
                    <CommandEmpty>No skill found.</CommandEmpty>
                    <CommandList>
                      <CommandGroup>
                        {professionalSkills.map((skill) => (
                          <CommandItem
                            key={skill}
                            value={skill}
                            onSelect={() => {
                              const currentSkills = getValues('skills') || [];
                              if (currentSkills.includes(skill)) {
                                setValue('skills', currentSkills.filter((s) => s !== skill), { shouldDirty: true, shouldValidate: true });
                              } else if(currentSkills.length < 5) {
                                setValue('skills', [...currentSkills, skill], { shouldDirty: true, shouldValidate: true });
                              } else {
                                toast({
                                  variant: "destructive",
                                  title: "Skill limit reached",
                                  description: "You can only select up to 5 skills."
                                })
                              }
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                (getValues('skills') || []).includes(skill)
                                  ? 'opacity-100'
                                  : 'opacity-0'
                              )}
                            />
                            {skill}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <div className="flex flex-wrap gap-1 pt-2">
                {skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="flex items-center gap-1">
                    {skill}
                    <button
                      type="button"
                      onClick={() => setValue('skills', skills.filter((s) => s !== skill), { shouldDirty: true })}
                      className="rounded-full hover:bg-muted-foreground/20"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              {errors.skills && <p className="text-sm text-destructive">{errors.skills.message}</p>}
            </div>

            <div className="space-y-2">
                <Label htmlFor="tech-stack-input">Tech Stack</Label>
                <div className="flex flex-wrap gap-2 rounded-md border p-2">
                {techStack.map((tech) => (
                    <div key={tech} className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
                    {tech}
                    <button type="button" onClick={() => handleTechStackRemove(tech)}>
                        <X className="h-4 w-4" />
                    </button>
                    </div>
                ))}
                <Input
                    id="tech-stack-input"
                    value={techStackInput}
                    onChange={(e) => setTechStackInput(e.target.value)}
                    onKeyDown={handleTechStackAdd}
                    placeholder="Type a technology and press Enter"
                    className="flex-1 border-none shadow-none focus-visible:ring-0"
                />
                </div>
            </div>
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <Label htmlFor="bio">Bio</Label>
                    <Button type="button" variant="outline" size="sm" onClick={handleGenerateBio} disabled={isAiPending}>
                    {isAiPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Sparkles className="mr-2 h-4 w-4 text-yellow-500" />
                    )}
                    Generate with AI
                    </Button>
                </div>
                <Textarea id="bio" {...register('bio')} rows={5} />
            </div>

            <div className="flex items-center space-x-3 rounded-md border p-4">
              <Switch 
                id="openForCollaboration"
                checked={openForCollaboration}
                onCheckedChange={(checked) => setValue('openForCollaboration', checked, { shouldValidate: true, shouldDirty: true })}
              />
              <div className="space-y-0.5">
                <Label htmlFor="openForCollaboration" className="text-base">
                  Collaboration Status
                </Label>
                <p className="text-sm text-muted-foreground">
                  {openForCollaboration ? "Open for Collaboration" : "Not seeking colabs"}
                </p>
              </div>
            </div>
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </form>

      <div className="mt-12 border-t border-destructive/20 pt-6">
        <h3 className="text-lg font-semibold text-destructive">Danger Zone</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Deleting your account is a permanent action and cannot be undone.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete My Account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your account and remove your data from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}
