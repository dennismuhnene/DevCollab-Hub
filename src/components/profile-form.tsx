'use client';

import { useState, useEffect, useTransition } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { doc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
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
import { Sparkles, Loader2, X, Trash2, Check, ChevronsUpDown, PlusCircle } from 'lucide-react';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const professionalSkills = [
  'Problem Solving', 'Debugging', 'System Design', 'Communication', 'Team Collaboration',
  'Agile Development', 'API Design', 'Version Control (Git)', 'Project Management', 'Code Review',
  'Testing & QA', 'Algorithmic Thinking', 'Security Best Practices', 'Time Management', 'Documentation Writing',
];

const collaborationGoalsOptions = [
  'Seeking paid contract work', 'Learning partners', 'Hobby/fun projects', 'Co-founders for a startup',
];

const commitmentLevelOptions = [
  'Part-time', 'Full-time', 'Hobbyist', 'Formal student', 'Self-taught',
];

const urlSchema = z.string().url({ message: 'Please enter a valid URL.' }).refine(val => val.startsWith('https://'), { message: 'URL must start with https://' });

const profileSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters long' }),
  bio: z.string().optional(),
  techStack: z.array(z.string()).optional(),
  skills: z.array(z.string()).max(5, { message: 'You can select up to 5 skills.' }).optional(),
  yearsOfExperience: z.coerce.number().min(0, { message: "Years of experience can't be negative."}).optional(),
  openForCollaboration: z.boolean().optional(),
  collaborationGoals: z.array(z.string()).optional(),
  commitmentLevel: z.string().optional(),
  versionControl: z.object({
      type: z.enum(['github', 'gitlab', 'bitbucket']),
      url: urlSchema,
  }),
  portfolioUrl: urlSchema.optional().or(z.literal('')),
  socials: z.object({
      type: z.enum(['linkedin', 'twitter', 'tiktok', 'discord']),
      url: urlSchema,
  }).optional(),
  extraLinks: z.array(z.object({
      type: z.string().min(1, { message: "Link type cannot be empty"}),
      url: urlSchema,
  })).max(3, { message: 'You can add a maximum of 3 extra links.' }).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

type ProfileFormProps = {
  userProfile: UserProfile;
};

// Helper for safe error messages
function getErrorMessage(err: any) {
  return err && typeof err === "object" && "message" in err ? err.message : null;
}

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
    control,
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
      collaborationGoals: [],
      commitmentLevel: '',
      versionControl: { type: 'github', url: '' },
      portfolioUrl: '',
      socials: { type: 'linkedin', url: '' },
      extraLinks: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
      control,
      name: "extraLinks",
  });

  const bioValue = watch('bio');
  const techStack = watch('techStack') || [];
  const skills = watch('skills') || [];
  const collaborationGoals = watch('collaborationGoals') || [];
  const openForCollaboration = watch('openForCollaboration');

  const commitmentLevel = watch('commitmentLevel') || '';
  const versionControlType = watch('versionControl')?.type || '';
  const socialsType = watch('socials')?.type || '';
  
  useEffect(() => {
    if (userProfile) {
      reset({
        name: userProfile.name || '',
        bio: userProfile.bio || '',
        techStack: userProfile.techStack || [],
        skills: userProfile.skills || [],
        yearsOfExperience: userProfile.yearsOfExperience || 0,
        openForCollaboration: userProfile.openForCollaboration === false ? false : true,
        collaborationGoals: userProfile.collaborationGoals || [],
        commitmentLevel: userProfile.commitmentLevel || '',
        versionControl: userProfile.versionControl && ['github','gitlab','bitbucket'].includes(userProfile.versionControl.type)
          ? userProfile.versionControl
          : { type: 'github', url: '' },
        portfolioUrl: userProfile.portfolioUrl || '',
        socials: userProfile.socials && ['linkedin','twitter','tiktok','discord'].includes(userProfile.socials.type)
          ? userProfile.socials
          : { type: 'linkedin', url: '' },
        extraLinks: userProfile.extraLinks || [],
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
    setLoading(true);
    try {
      const functions = getFunctions(auth.app);
      const deleteUserCallable = httpsCallable(functions, 'deleteUserAccount');
      
      await deleteUserCallable();
      
      toast({ title: 'Account deleted successfully' });
      
      await auth.signOut();
      router.push('/');

    } catch (error: any) {
      console.error("Account deletion error:", error);
      toast({
        variant: 'destructive',
        title: 'Error deleting account',
        description: error.message || 'An unknown error occurred.',
      });
    } finally {
        setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-6">
          {/* Name, Experience, Skills, Tech Stack, Bio, Collaboration Settings... */}
          {/* Keep all your existing JSX here unchanged */}
          {/* Just replace all error usages with getErrorMessage() */}
          
          {errors.name && <p className="text-sm text-destructive">{getErrorMessage(errors.name)}</p>}
          {errors.yearsOfExperience && <p className="text-sm text-destructive">{getErrorMessage(errors.yearsOfExperience)}</p>}
          {errors.skills && <p className="text-sm text-destructive">{getErrorMessage(errors.skills)}</p>}
          {errors.versionControl?.url && <p className="text-sm text-destructive">{getErrorMessage(errors.versionControl?.url)}</p>}
          {errors.portfolioUrl && <p className="text-sm text-destructive">{getErrorMessage(errors.portfolioUrl)}</p>}
          {errors.socials?.url && <p className="text-sm text-destructive">{getErrorMessage(errors.socials?.url)}</p>}
          {errors.extraLinks?.[fields.length -1] && <p className="text-sm text-destructive">{getErrorMessage(errors.extraLinks[fields.length - 1]?.url) || getErrorMessage(errors.extraLinks[fields.length - 1]?.type)}</p>}
          
        </div>
      </form>
    </>
  );
}
