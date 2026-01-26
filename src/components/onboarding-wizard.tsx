'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
import Image from 'next/image';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/lib/hooks/use-auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage, auth } from '@/lib/firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Loader2, Camera, Save, X, Check, ChevronsUpDown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { professionalSkills, collaborationGoalsOptions, commitmentLevelOptions, countries } from '@/lib/constants';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { cn } from '@/lib/utils';

const urlSchema = z
  .string()
  .url({ message: 'Please enter a valid URL.' })
  .refine((val) => val.startsWith('https://'), { message: 'URL must start with https://' });

const profileWizardSchema = z.object({
    photoURL: z.string().optional(),
    name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
    location: z.string().min(1, { message: 'Please select your country.' }),
    yearsOfExperience: z.coerce.number().min(0, { message: "Years of experience can't be negative." }),
    skills: z.array(z.string()).min(1, { message: 'Please select at least one skill.' }).max(5, { message: 'You can select up to 5 skills.' }),
    collaborationGoals: z.array(z.string()).min(1, { message: 'Please select at least one goal.' }),
    commitmentLevel: z.string().min(1, { message: 'Please select your commitment level.' }),
    versionControlUrl: urlSchema,
    bio: z.string().min(20, { message: 'Bio must be at least 20 characters long.' }),
});

type ProfileWizardFormData = z.infer<typeof profileWizardSchema>;

export default function OnboardingWizard() {
    const { user, reloadUserProfile } = useAuth();
    const { toast } = useToast();
    
    const [isOpen, setIsOpen] = useState(true);
    const [currentStep, setCurrentStep] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [newImageFile, setNewImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [skillInput, setSkillInput] = useState('');

    const STEPS = [
        { title: 'Welcome to DevCollab!', description: 'First, let\'s set up your profile picture.', fields: ['photoURL'] },
        { title: 'Your Identity', description: 'Tell us a bit about yourself.', fields: ['name', 'location', 'yearsOfExperience'] },
        { title: 'Your Expertise', description: 'Showcase your top skills (up to 5).', fields: ['skills'] },
        { title: 'Your Collaboration Style', description: 'How do you like to work?', fields: ['collaborationGoals', 'commitmentLevel'] },
        { title: 'Show Your Work', description: 'Link your primary code repository.', fields: ['versionControlUrl'] },
        { title: 'Introduce Yourself', description: 'Write a brief bio about your interests and what you\'re looking for.', fields: ['bio'] },
    ];

    const totalSteps = STEPS.length;
    const progress = (currentStep / (totalSteps - 1)) * 100;

    const {
        register,
        handleSubmit,
        trigger,
        setValue,
        watch,
        formState: { errors },
    } = useForm<ProfileWizardFormData>({
        resolver: zodResolver(profileWizardSchema),
        mode: 'onChange',
    });

    const name = watch('name');
    const location = watch('location');
    const skills = watch('skills') || [];
    const collaborationGoals = watch('collaborationGoals') || [];
    const commitmentLevel = watch('commitmentLevel');

    const handleAvatarClick = () => {
        if (uploading || newImageFile) return;
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setNewImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveImage = async () => {
        if (!newImageFile || !user) return;
        setUploading(true);
        const storageRef = ref(storage, `profile-images/${user.uid}/profile-picture`);
        try {
            const snapshot = await uploadBytes(storageRef, newImageFile);
            const downloadURL = await getDownloadURL(snapshot.ref);
            setValue('photoURL', downloadURL, { shouldValidate: true, shouldDirty: true });
            toast({ title: 'Image uploaded!' });
            return downloadURL;
        } catch (error) {
            console.error("Image upload failed", error);
            toast({ variant: 'destructive', title: 'Upload failed', description: 'Could not upload your image.' });
            return null;
        } finally {
            setUploading(false);
        }
      };

    const handleNext = async () => {
        const fieldsToValidate = STEPS[currentStep].fields as (keyof ProfileWizardFormData)[];
        
        // Special handling for the image step
        if (currentStep === 0) {
            if (newImageFile && !watch('photoURL')) {
                const uploadedUrl = await handleSaveImage();
                if (!uploadedUrl) return; // Stop if upload fails
            } else if (!watch('photoURL')) {
                toast({ variant: 'destructive', title: 'Image Required', description: 'Please upload a profile picture to continue.' });
                return;
            }
        }

        const isValid = await trigger(fieldsToValidate);
        if (isValid) {
            setCurrentStep(prev => Math.min(prev + 1, totalSteps - 1));
        }
    };

    const handlePrevious = () => {
        setCurrentStep(prev => Math.max(prev - 1, 0));
    };

    const onSubmit: SubmitHandler<ProfileWizardFormData> = async (data) => {
        setIsSubmitting(true);
        const finalData = {
            ...data,
            versionControl: { type: 'github', url: data.versionControlUrl },
            onboardingComplete: true,
            createdAt: serverTimestamp(), // Set initial creation timestamp
            updatedAt: serverTimestamp(),
        };
        // @ts-ignore
        delete finalData.versionControlUrl;

        try {
            const userRef = doc(db, 'users', user!.uid);
            await updateDoc(userRef, finalData);
            if (auth.currentUser) {
                await updateProfile(auth.currentUser, { displayName: data.name, photoURL: data.photoURL });
            }
            toast({ title: 'Profile Created!', description: 'Welcome to the community!' });
            await reloadUserProfile();
            setIsOpen(false);
        } catch (error) {
            console.error('Onboarding submission failed:', error);
            toast({ variant: 'destructive', title: 'Submission Failed', description: 'Could not save your profile. Please try again.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const getInitials = (name?: string) => {
        if (!name) return 'U';
        return name.split(' ').map((n) => n[0]).join('');
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 0:
                return (
                    <div className="flex flex-col items-center justify-center text-center space-y-4">
                        <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                            <Avatar className="h-40 w-40 border-4 border-background shadow-lg">
                                {imagePreview ? (
                                    <Image src={imagePreview} alt={name || 'User'} width={160} height={160} className="object-cover" />
                                ) : (
                                    <AvatarFallback className="text-5xl">{getInitials(name)}</AvatarFallback>
                                )}
                             </Avatar>
                            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="h-10 w-10 text-white" />
                            </div>
                            {uploading && (
                                <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/70">
                                    <Loader2 className="h-12 w-12 text-white animate-spin" />
                                </div>
                            )}
                        </div>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" disabled={uploading}/>
                        <p className="text-sm text-muted-foreground">Click the avatar to upload an image.</p>
                        {errors.photoURL && <p className="text-sm text-destructive">{errors.photoURL.message}</p>}
                    </div>
                );
            case 1:
                return (
                    <div className="space-y-6">
                         <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input id="name" {...register('name')} placeholder="e.g. Jane Doe" />
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
                                                <CommandItem key={country} value={country} onSelect={() => setValue('location', country, { shouldDirty: true, shouldValidate: true })}>
                                                    <Check className={cn('mr-2 h-4 w-4', location === country ? 'opacity-100' : 'opacity-0')} />
                                                    {country}
                                                </CommandItem>
                                            ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            {errors.location && <p className="text-sm text-destructive">{errors.location.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="yearsOfExperience">Years of Professional Experience</Label>
                            <Input id="yearsOfExperience" type="number" step="0.5" {...register('yearsOfExperience')} placeholder="e.g. 3.5" />
                            {errors.yearsOfExperience && <p className="text-sm text-destructive">{errors.yearsOfExperience.message}</p>}
                        </div>
                    </div>
                );
            case 2:
                 return (
                    <div className="space-y-2">
                        <Label>Skills</Label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {skills.map((skill) => (
                                <Badge key={skill} variant="secondary" className="flex items-center gap-1 text-sm">
                                {skill}
                                <button type="button" onClick={() => setValue('skills', skills.filter((s) => s !== skill),{ shouldDirty: true })} className="rounded-full hover:bg-muted-foreground/20">
                                    <X className="h-3 w-3" />
                                </button>
                                </Badge>
                            ))}
                        </div>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" className="w-full justify-between">
                                    <span className="truncate">{skills.length > 0 ? `${skills.length} skills selected` : 'Select up to 5 skills...'}</span>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command>
                                <CommandInput placeholder="Search skills..." value={skillInput} onValueChange={setSkillInput} />
                                <CommandEmpty>No skill found.</CommandEmpty>
                                <CommandList>
                                    <CommandGroup>
                                    {professionalSkills.map((skill) => (
                                        <CommandItem key={skill} value={skill} onSelect={() => {
                                            if (!skills.includes(skill) && skills.length < 5) {
                                                setValue('skills', [...skills, skill], { shouldDirty: true, shouldValidate: true });
                                            }
                                            setSkillInput('');
                                        }}>
                                            <Check className={cn('mr-2 h-4 w-4', skills.includes(skill) ? 'opacity-100' : 'opacity-0')} />
                                            {skill}
                                        </CommandItem>
                                    ))}
                                    </CommandGroup>
                                </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        {errors.skills && <p className="text-sm text-destructive">{errors.skills.message}</p>}
                    </div>
                 );
            case 3:
                return (
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <Label>What are your collaboration goals?</Label>
                            <div className="space-y-2">
                            {collaborationGoalsOptions.map((goal) => (
                                <div key={goal} className="flex items-center space-x-3 p-3 rounded-md border hover:bg-accent" onClick={() => {
                                    const currentGoals = collaborationGoals;
                                    if (currentGoals.includes(goal)) {
                                        setValue('collaborationGoals', currentGoals.filter((g) => g !== goal), { shouldDirty: true, shouldValidate: true });
                                    } else {
                                        setValue('collaborationGoals', [...currentGoals, goal], { shouldDirty: true, shouldValidate: true });
                                    }
                                }}>
                                    <Check className={cn('h-5 w-5', collaborationGoals.includes(goal) ? 'text-primary' : 'text-muted-foreground')} />
                                    <span className="font-medium">{goal}</span>
                                </div>
                            ))}
                            </div>
                           {errors.collaborationGoals && <p className="text-sm text-destructive">{errors.collaborationGoals.message}</p>}
                        </div>
                        <div className="space-y-3">
                            <Label>What is your typical commitment level?</Label>
                             <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" role="combobox" className="w-full justify-between">
                                    <span className="truncate">{commitmentLevel || 'Select your commitment...'}</span>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                    <Command>
                                        <CommandList>
                                            <CommandGroup>
                                            {commitmentLevelOptions.map((level) => (
                                                <CommandItem key={level} value={level} onSelect={() => setValue('commitmentLevel', level, { shouldDirty: true, shouldValidate: true })}>
                                                    <Check className={cn('mr-2 h-4 w-4', commitmentLevel === level ? 'opacity-100' : 'opacity-0')} />
                                                    {level}
                                                </CommandItem>
                                            ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            {errors.commitmentLevel && <p className="text-sm text-destructive">{errors.commitmentLevel.message}</p>}
                        </div>
                    </div>
                );
            case 4:
                return (
                    <div className="space-y-2">
                        <Label htmlFor="versionControlUrl">GitHub Profile URL</Label>
                        <Input id="versionControlUrl" {...register('versionControlUrl')} placeholder="https://github.com/username" />
                        <p className="text-sm text-muted-foreground">Your GitHub is a key way for others to see your work.</p>
                        {errors.versionControlUrl && <p className="text-sm text-destructive">{errors.versionControlUrl.message}</p>}
                    </div>
                );
            case 5:
                return (
                    <div className="space-y-2">
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea id="bio" {...register('bio')} rows={10} placeholder="Tell us about your passions, what you\'re learning, and the kind of projects you\'d love to build..." />
                        {errors.bio && <p className="text-sm text-destructive">{errors.bio.message}</p>}
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={() => {}}>
            <DialogContent className="sm:max-w-2xl p-0" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
                 <div className='min-h-[550px] flex flex-col'>
                    <DialogHeader className="p-6 border-b">
                        <DialogTitle>{STEPS[currentStep].title}</DialogTitle>
                        <DialogDescription>{STEPS[currentStep].description}</DialogDescription>
                    </DialogHeader>
                    
                    <form onSubmit={handleSubmit(onSubmit)} className="flex-grow flex flex-col">
                        <div className="p-6 flex-grow overflow-auto">
                           {renderStepContent()}
                        </div>

                        <div className="p-6 border-t mt-auto bg-slate-50 dark:bg-slate-900/50">
                            <Progress value={progress} className="mb-4" />
                            <div className="flex justify-between items-center">
                            {currentStep > 0 ? (
                                <Button variant="outline" type="button" onClick={handlePrevious}>
                                Previous
                                </Button>
                            ) : <div />}
                            
                            {currentStep < totalSteps - 1 ? (
                                <Button type="button" onClick={handleNext}>Next</Button>
                            ) : (
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {isSubmitting ? 'Saving Profile...' : 'Finish & Join'}
                                </Button>
                            )}
                            </div>
                        </div>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
}
