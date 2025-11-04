'use client';

import { useState, useEffect, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile, deleteUser } from 'firebase/auth';
import { db, auth } from '@/lib/firebase/config';
import { useAuth } from '@/lib/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import ImageUploader from './image-uploader';
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
import { Sparkles, Loader2, X, Trash2 } from 'lucide-react';

const profileSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters long' }),
  bio: z.string().optional(),
  skills: z.array(z.string()).optional(),
  photoURL: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

type ProfileFormProps = {
  userProfile: UserProfile;
};

export default function ProfileForm({ userProfile }: ProfileFormProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [isAiPending, startAiTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      bio: '',
      skills: [],
      photoURL: '',
    },
  });

  useEffect(() => {
    if (userProfile) {
      reset({
        name: userProfile.name || '',
        bio: userProfile.bio || '',
        skills: userProfile.skills || [],
        photoURL: userProfile.photoURL || '',
      });
      setSkills(userProfile.skills || []);
    }
  }, [userProfile, reset]);
  
  const bioValue = watch('bio');

  useEffect(() => {
    setValue('skills', skills);
  }, [skills, setValue]);

  const handleSkillAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && skillInput.trim()) {
      e.preventDefault();
      if (!skills.includes(skillInput.trim())) {
        setSkills([...skills, skillInput.trim()]);
      }
      setSkillInput('');
    }
  };

  const handleSkillRemove = (skillToRemove: string) => {
    setSkills(skills.filter((skill) => skill !== skillToRemove));
  };
  
  const handleGenerateBio = async () => {
    if (skills.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Skills Required',
        description: 'Please add at least one skill to generate a bio.',
      });
      return;
    }
    
    startAiTransition(async () => {
      try {
        const result = await summarizeUserSkills({ profileDescription: bioValue || 'A passionate developer.', skills: skills });
        if (result?.summary) {
          setValue('bio', result.summary);
          toast({
            title: 'Bio Generated!',
            description: 'The AI has generated a new bio for you.',
          });
        }
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'AI Generation Failed',
          description: 'Could not generate a bio at this time.',
        });
      }
    });
  };

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;
    setLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, data);
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: data.name,
          photoURL: data.photoURL,
        });
      }
      toast({ title: 'Profile updated successfully!' });
      // We don't router.push because this form is part of the profile page
      router.refresh(); // Use router.refresh() to re-fetch server components
    } catch (error) {
      toast({ variant: 'destructive', title: 'An error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // NOTE: This only deletes the user from Auth.
      // Firestore data deletion would be handled by a Cloud Function trigger.
      await deleteUser(user);
      toast({ title: 'Account deleted successfully' });
      router.push('/');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error deleting account', description: error.message });
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" {...register('name')} />
                    {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="skills">Skills</Label>
                    <div className="flex flex-wrap gap-2 rounded-md border p-2">
                    {skills.map((skill) => (
                        <div key={skill} className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
                        {skill}
                        <button type="button" onClick={() => handleSkillRemove(skill)}>
                            <X className="h-4 w-4" />
                        </button>
                        </div>
                    ))}
                    <Input
                        id="skills"
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={handleSkillAdd}
                        placeholder="Type a skill and press Enter"
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
            </div>
            <div className="space-y-2">
                <Label>Profile Picture</Label>
                <ImageUploader
                    onUpload={(url) => setValue('photoURL', url)}
                    initialUrl={userProfile.photoURL}
                    folderPath={`profile-images/${user?.uid}`}
                />
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
