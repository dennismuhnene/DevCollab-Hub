'use client';

import { useState, useEffect, useTransition } from 'react';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db, auth } from '@/lib/firebase/config';
import { useAuth } from '@/lib/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile, ExternalLink } from '@/types';
import { summarizeUserSkills } from '@/ai/flows/user-skills-summarizer';
import { Sparkles, Loader2, X, Trash2, Check, ChevronsUpDown, PlusCircle, Link as LinkIcon } from 'lucide-react';
import { Switch } from './ui/switch';
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
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { logAnalyticsEvent } from '@/firebase/analytics';
import { professionalSkills, collaborationGoalsOptions, commitmentLevelOptions, countries } from '@/lib/constants';

const urlSchema = z
  .string()
  .url({ message: 'Please enter a valid URL.' })
  .refine((val) => val.startsWith('https://'), { message: 'URL must start with https://' });

const baseProfileSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters long' }),
  location: z.string().optional(),
  bio: z.string().optional(),
  skills: z.array(z.string()).max(5, { message: 'You can select up to 5 skills.' }).optional(),
  yearsOfExperience: z.coerce.number().min(0, { message: "Years of experience can't be negative." }).optional(),
  openForCollaboration: z.boolean().optional(),
  collaborationGoals: z.array(z.string()).optional(),
  commitmentLevel: z.string().optional(),
  portfolioUrl: urlSchema.optional().or(z.literal('')),
  socials: z
    .object({
      type: z.enum(['linkedin', 'twitter', 'tiktok', 'discord']),
      url: urlSchema.or(z.literal('')),
    })
    .optional(),
  extraLinks: z
    .array(
      z.object({
        type: z.string().min(1, { message: 'Link type cannot be empty' }),
        url: urlSchema,
      })
    )
    .max(3, { message: 'You can add a maximum of 3 extra links.' })
    .optional(),
});

const developerProfileSchema = baseProfileSchema.extend({
  techStack: z.array(z.string()).optional(),
  versionControl: z.object({
    type: z.enum(['github', 'gitlab', 'bitbucket']),
    url: urlSchema,
  }),
});

const advisorProfileSchema = baseProfileSchema.extend({
  techStack: z.array(z.string()).optional(),
  versionControl: z
    .object({
      type: z.enum(['github', 'gitlab', 'bitbucket']),
      url: urlSchema.or(z.literal('')),
    })
    .optional(),
});

type ProfileFormData = z.infer<typeof baseProfileSchema> & {
  techStack?: string[];
  versionControl?: {
    type: 'github' | 'gitlab' | 'bitbucket';
    url: string;
  };
};

type ProfileFormProps = {
  userProfile: UserProfile;
  isAdvisor: boolean;
};

function getErrorMessage(err: unknown) {
  return err && typeof err === 'object' && 'message' in err ? (err as any).message : null;
}

export default function ProfileForm({ userProfile, isAdvisor }: ProfileFormProps) {
  const { user, reloadUserProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [techStackInput, setTechStackInput] = useState('');
  const [isAiPending, startAiTransition] = useTransition();

  const profileSchema = isAdvisor ? advisorProfileSchema : developerProfileSchema;

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
      location: '',
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
    name: 'extraLinks',
  });

  const bioValue = watch('bio');
  const techStack = watch('techStack') || [];
  const skills = watch('skills') || [];
  const collaborationGoals = watch('collaborationGoals') || [];
  const openForCollaboration = watch('openForCollaboration');
  const commitmentLevel = watch('commitmentLevel');
  const versionControlType = watch('versionControl')?.type || '';
  const socialsType = watch('socials')?.type || '';
  const versionControl = watch('versionControl');
  const portfolioUrl = watch('portfolioUrl');
  const socials = watch('socials');
  const extraLinks = watch('extraLinks');
  const location = watch('location');

  const displayLinks = [
    versionControl,
    socials,
    portfolioUrl ? { type: 'portfolio', url: portfolioUrl } : undefined,
    ...(extraLinks || []),
  ].filter((link): link is { type: string; url: string; } => !!link?.url).map(link => ({...link, label: link.type}));

  useEffect(() => {
    if (userProfile) {
      const normalizedVersionControl:
        | { type: 'github' | 'gitlab' | 'bitbucket'; url: string }
        | undefined = userProfile.versionControl &&
        ['github', 'gitlab', 'bitbucket'].includes((userProfile.versionControl as any).type)
          ? (userProfile.versionControl as any)
          : { type: 'github', url: '' };

      const normalizedSocials:
        | { type: 'linkedin' | 'twitter' | 'tiktok' | 'discord'; url: string }
        | undefined = userProfile.socials &&
        ['linkedin', 'twitter', 'tiktok', 'discord'].includes((userProfile.socials as any).type)
          ? (userProfile.socials as any)
          : { type: 'linkedin', url: '' };

      reset({
        name: userProfile.name || '',
        location: (userProfile as any).location || '',
        bio: userProfile.bio || '',
        techStack: userProfile.techStack || [],
        skills: userProfile.skills || [],
        yearsOfExperience: userProfile.yearsOfExperience || 0,
        openForCollaboration: userProfile.openForCollaboration === false ? false : true,
        collaborationGoals: userProfile.collaborationGoals || [],
        commitmentLevel: userProfile.commitmentLevel || '',
        versionControl: normalizedVersionControl,
        portfolioUrl: userProfile.portfolioUrl || '',
        socials: normalizedSocials,
        extraLinks:
        userProfile.extraLinks?.map((link) => ({ ...link, type: link.label || 'custom' })) || []
      });
    }
  }, [userProfile, reset]);

  const addTechStackItem = () => {
    const newTech = techStackInput.trim();
    if (newTech) {
      const currentTechStack = getValues('techStack') || [];
      if (!currentTechStack.includes(newTech)) {
        setValue('techStack', [...currentTechStack, newTech], { shouldValidate: true, shouldDirty: true });
      }
      setTechStackInput('');
    }
  };

  const handleTechStackKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTechStackItem();
    }
  };

  const handleTechStackBlur = () => {
    addTechStackItem();
  };

  const handleTechStackRemove = (techToRemove: string) => {
    const currentTechStack = getValues('techStack') || [];
    setValue(
      'techStack',
      currentTechStack.filter((tech) => tech !== techToRemove),
      { shouldValidate: true, shouldDirty: true }
    );
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
        const result = await summarizeUserSkills({
          profileDescription: bioValue || 'A passionate developer.',
          skills: currentSkills,
        });
        if (result?.summary) {
          setValue('bio', result.summary, { shouldValidate: true, shouldDirty: true });
          toast({
            title: 'Bio Generated!',
            description: 'The AI has generated a new bio for you.',
          });
        }
      } catch (error) {
        console.error('AI Bio generation failed:', error);
        toast({
          variant: 'destructive',
          title: 'AI Generation Failed',
          description: 'Could not generate a bio at this time. Check the console for details.',
        });
      }
    });
  };

  const onSubmit: SubmitHandler<ProfileFormData> = async (data) => {
    if (!user) return;
    setLoading(true);

    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, data);

    if (auth.currentUser) {
      await updateProfile(auth.currentUser, {
        displayName: data.name,
      });
    }
    logAnalyticsEvent('profile_update', {});

    toast({ title: 'Profile updated successfully!' });
    reloadUserProfile();
    setLoading(false);
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Location (Country)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between">
                  <span className="truncate">{location || 'Select your country...'}</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="Search country..." />
                  <CommandEmpty>No country found.</CommandEmpty>
                  <CommandList>
                    <CommandGroup>
                      {countries.map((country) => (
                        <CommandItem
                          key={country}
                          value={country}
                          onSelect={() => setValue('location', country, { shouldDirty: true, shouldValidate: true })}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              location === country ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          {country}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="yearsOfExperience">Years of Experience</Label>
            <Input id="yearsOfExperience" type="number" step="0.5" {...register('yearsOfExperience')} />
            <p className="text-sm text-muted-foreground pt-1">
              Use decimals for half-year increments (e.g., 2.5). For less than a year, use decimals (e.g. 0.5 for 6 months).
            </p>
            {errors.yearsOfExperience && (
              <p className="text-sm text-destructive">{errors.yearsOfExperience.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Skills</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between">
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
                              setValue(
                                'skills',
                                currentSkills.filter((s) => s !== skill),
                                { shouldDirty: true, shouldValidate: true }
                              );
                            } else if (currentSkills.length < 5) {
                              setValue('skills', [...currentSkills, skill], {
                                shouldDirty: true,
                                shouldValidate: true,
                              });
                            } else {
                              toast({
                                variant: 'destructive',
                                title: 'Skill limit reached',
                                description: 'You can only select up to 5 skills.',
                              });
                            }
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              (getValues('skills') || []).includes(skill) ? 'opacity-100' : 'opacity-0'
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
                    onClick={() =>
                      setValue(
                        'skills',
                        skills.filter((s) => s !== skill),
                        { shouldDirty: true }
                      )
                    }
                    className="rounded-full hover:bg-muted-foreground/20"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            {errors.skills && <p className="text-sm text-destructive">{errors.skills.message}</p>}
          </div>

          {!isAdvisor && (
            <div className="space-y-2">
              <Label htmlFor="tech-stack-input">Tech Stack</Label>
              <div className="flex flex-wrap gap-2 rounded-md border p-2">
                {techStack.map((tech) => (
                  <div
                    key={tech}
                    className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary"
                  >
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
                  onKeyDown={handleTechStackKeyDown}
                  onBlur={handleTechStackBlur}
                  placeholder="Type a technology and press Enter"
                  className="flex-1 border-none shadow-none focus-visible:ring-0"
                />
              </div>
            </div>
          )}

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

          <Card>
            <CardHeader>
              <CardTitle><h3 className="text-lg font-medium">Collaboration Settings</h3></CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-3 rounded-md border p-4">
                <Switch
                  id="openForCollaboration"
                  checked={openForCollaboration}
                  onCheckedChange={(checked: boolean) =>
                    setValue('openForCollaboration', checked, { shouldValidate: true, shouldDirty: true })
                  }
                />
                <div className="space-y-0.5">
                  <Label htmlFor="openForCollaboration" className="text-base">
                    Collaboration Status
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {openForCollaboration ? 'Open for Collaboration' : 'Not seeking colabs'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Collaboration Goals</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between">
                      <span className="truncate">
                        {collaborationGoals.length > 0
                          ? collaborationGoals.join(', ')
                          : 'Select your goals...'}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput placeholder="Search goals..." />
                      <CommandEmpty>No goal found.</CommandEmpty>
                      <CommandList>
                        <CommandGroup>
                          {collaborationGoalsOptions.map((goal) => (
                            <CommandItem
                              key={goal}
                              value={goal}
                              onSelect={() => {
                                const currentGoals = getValues('collaborationGoals') || [];
                                if (currentGoals.includes(goal)) {
                                  setValue(
                                    'collaborationGoals',
                                    currentGoals.filter((g) => g !== goal),
                                    { shouldDirty: true, shouldValidate: true }
                                  );
                                } else {
                                  setValue('collaborationGoals', [...currentGoals, goal], {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                  });
                                }
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  collaborationGoals.includes(goal) ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              {goal}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <div className="flex flex-wrap gap-1 pt-2">
                  {collaborationGoals.map((goal) => (
                    <Badge key={goal} variant="secondary" className="flex items-center gap-1">
                      {goal}
                      <button
                        type="button"
                        onClick={() =>
                          setValue(
                            'collaborationGoals',
                            collaborationGoals.filter((g) => g !== goal),
                            { shouldDirty: true, shouldValidate: true }
                          )
                        }
                        className="rounded-full hover:bg-muted-foreground/20"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Commitment Level</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between">
                      <span className="truncate">
                        {commitmentLevel ? commitmentLevel : 'Select your commitment...'}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput placeholder="Search commitment levels..." />
                      <CommandEmpty>No commitment level found.</CommandEmpty>
                      <CommandList>
                        <CommandGroup>
                          {commitmentLevelOptions.map((level) => (
                            <CommandItem
                              key={level}
                              value={level}
                              onSelect={() => {
                                const currentLevel = getValues('commitmentLevel');
                                if (currentLevel === level) {
                                  setValue('commitmentLevel', '', { shouldDirty: true, shouldValidate: true });
                                } else {
                                  setValue('commitmentLevel', level, {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                  });
                                }
                              }}
                            >
                              <Check
                                className={cn('mr-2 h-4 w-4', commitmentLevel === level ? 'opacity-100' : 'opacity-0')}
                              />
                              {level}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <div className="flex flex-wrap gap-1 pt-2">
                  {commitmentLevel && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      {commitmentLevel}
                      <button
                        type="button"
                        onClick={() => setValue('commitmentLevel', '', { shouldDirty: true, shouldValidate: true })}
                        className="rounded-full hover:bg-muted-foreground/20"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle><h3 className="text-lg font-medium">External Links</h3></CardTitle>
              <CardDescription>Add links to your portfolio, socials, and more.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {displayLinks.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {displayLinks.map((link, index) => {
                    const isValid = urlSchema.safeParse(link.url).success;
                    return(
                      <Button key={index} variant="outline" asChild>
                        {isValid ? (
                          <Link href={link.url} target="_blank" className="break-all">
                            <LinkIcon className="mr-2 h-4 w-4" />
                            {link.label}
                          </Link>
                        ) : (
                          <span className="break-all">
                            <LinkIcon className="mr-2 h-4 w-4" />
                            {link.label}
                          </span>
                        )}
                      </Button>
                    )
                  })}
                </div>
              )}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="version-control-url">Version Control {isAdvisor ? '(Optional)' : '(Required)'}</Label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Select
                      value={versionControlType || 'github'}
                      onValueChange={(value: 'github' | 'gitlab' | 'bitbucket') =>
                        setValue('versionControl.type', value, { shouldValidate: true, shouldDirty: true })
                      }
                    >
                      <SelectTrigger className="w-full sm:w-[120px]">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="github">GitHub</SelectItem>
                        <SelectItem value="gitlab">GitLab</SelectItem>
                        <SelectItem value="bitbucket">Bitbucket</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      id="version-control-url"
                      placeholder="https://github.com/username"
                      {...register('versionControl.url')}
                      className="flex-1"
                    />
                  </div>
                  {errors.versionControl?.url && (
                    <p className="text-sm text-destructive">{errors.versionControl.url.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="portfolio-url">Portfolio Website</Label>
                  <Input id="portfolio-url" placeholder="https://your-portfolio.com" {...register('portfolioUrl')} />
                  {errors.portfolioUrl && (
                    <p className="text-sm text-destructive">{errors.portfolioUrl.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="socials-url">Socials</Label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Select
                      value={socialsType || 'linkedin'}
                      onValueChange={(value: 'linkedin' | 'twitter' | 'tiktok' | 'discord') =>
                        setValue('socials.type', value, { shouldValidate: true, shouldDirty: true })
                      }
                    >
                      <SelectTrigger className="w-full sm:w-[120px]">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                        <SelectItem value="twitter">Twitter</SelectItem>
                        <SelectItem value="tiktok">TikTok</SelectItem>
                        <SelectItem value="discord">Discord</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      id="socials-url"
                      placeholder="https://linkedin.com/in/username"
                      {...register('socials.url')}
                      className="flex-1"
                    />
                  </div>
                  {errors.socials?.url && (
                    <p className="text-sm text-destructive">{errors.socials.url.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Extra Links</Label>
                  <div className="space-y-2">
                    {fields.map((field, index) => (
                      <div key={field.id} className="flex flex-col sm:flex-row gap-2 items-start">
                        <Input
                          placeholder="Link Title (e.g. My Blog)"
                          {...register(`extraLinks.${index}.type` as const)}
                          className="flex-1"
                        />
                        <Input
                          placeholder="https://..."
                          {...register(`extraLinks.${index}.url` as const)}
                          className="flex-1"
                        />
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  {errors.extraLinks?.[fields.length - 1] && (
                    <p className="text-sm text-destructive">
                      {getErrorMessage(errors.extraLinks[fields.length - 1]?.url) ||
                        getErrorMessage(errors.extraLinks[fields.length - 1]?.type) ||
                        getErrorMessage(errors.extraLinks[fields.length - 1])}
                    </p>
                  )}
                  {fields.length < 3 && (
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ type: '', url: '' })}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Link
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <Button type="submit" disabled={loading} className="w-full md:w-auto">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
            </>
          ) : (
            'Save All Changes'
          )}
        </Button>
      </form>
    </>
  );
}
