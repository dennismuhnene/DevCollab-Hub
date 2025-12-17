'use client';

import { useState, useTransition, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { doc, serverTimestamp, collection, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { Role } from '@/types';
import { Loader2, X, Trash2, Check, ChevronsUpDown } from 'lucide-react';
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
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import { logAnalyticsEvent } from '@/firebase/analytics';
import { professionalSkills, incentiveOptions, commitmentLevelOptions } from '@/lib/constants';


const roleSchema = z.object({
  title: z.string().min(5, { message: 'Title must be at least 5 characters long' }),
  roleDescription: z.string().min(20, { message: 'Description must be at least 20 characters long' }),
  requiredTechStack: z.array(z.string()).min(1, { message: 'At least one technology is required' }),
  requiredSkills: z.array(z.string()).max(5, { message: 'You can select up to 5 skills.' }).min(1, {message: 'At least one skill is required.'}),
  requiredYearsOfExperience: z.coerce.number().min(0, { message: "Years of experience can't be negative."}).optional(),
  incentives: z.string().min(1, { message: 'Please specify the incentives.' }),
  commitmentLevel: z.string().min(1, { message: 'Please select a commitment level.' }),
});

type RoleFormData = z.infer<typeof roleSchema>;

type RoleFormProps = {
  role?: Role;
};

export default function RoleForm({ role }: RoleFormProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [techStackInput, setTechStackInput] = useState('');
  const isEditMode = !!role;

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    getValues,
    formState: { errors },
  } = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      title: role?.title || '',
      roleDescription: role?.roleDescription || '',
      requiredTechStack: role?.requiredTechStack || [],
      requiredSkills: role?.requiredSkills || [],
      requiredYearsOfExperience: role?.requiredYearsOfExperience || 0,
      incentives: role?.incentives || '',
      commitmentLevel: role?.commitmentLevel || '',
    },
  });

  const techStack = watch('requiredTechStack') || [];
  const skills = watch('requiredSkills') || [];

  const handleTechStackAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && techStackInput.trim()) {
      e.preventDefault();
      const currentTechStack = getValues('requiredTechStack') || [];
      if (!currentTechStack.includes(techStackInput.trim())) {
        setValue('requiredTechStack', [...currentTechStack, techStackInput.trim()], { shouldValidate: true, shouldDirty: true });
      }
      setTechStackInput('');
    }
  };
  
  const handleTechStackBlur = () => {
      const newTech = techStackInput.trim();
      if (newTech) {
          const currentTechStack = getValues('requiredTechStack') || [];
          if (!currentTechStack.includes(newTech)) {
              setValue('requiredTechStack', [...currentTechStack, newTech], { shouldValidate: true, shouldDirty: true });
          }
          setTechStackInput('');
      }
  };

  const handleTechStackRemove = (techToRemove: string) => {
    setValue('requiredTechStack', (getValues('requiredTechStack') || []).filter((tech) => tech !== techToRemove), { shouldValidate: true, shouldDirty: true });
  };

  const onSubmit = async (data: RoleFormData) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Not authenticated' });
      return;
    }
    setLoading(true);

    try {
      if (isEditMode) {
        const roleRef = doc(db, 'roles', role.id);
        await updateDoc(roleRef, { ...data, updatedAt: serverTimestamp() });
        toast({ title: 'Role updated successfully!' });
        logAnalyticsEvent('update_role', { role_id: role.id });
        router.push('/roles');
      } else {
        const newRole = { ...data, ownerId: user.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
        const docRef = await addDoc(collection(db, 'roles'), newRole);
        toast({ title: 'Role created successfully!' });
        logAnalyticsEvent('create_role', { role_id: docRef.id });
        router.push('/roles');
      }
    } catch (e) {
      console.error("Error saving role:", e);
      toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save the role.' });
    } finally {
        setLoading(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!role || !user) return;
    setLoading(true);
    try {
      const roleRef = doc(db, 'roles', role.id);
      await deleteDoc(roleRef);
      toast({ title: 'Role deleted successfully' });
      logAnalyticsEvent('delete_role', { role_id: role.id });
      router.push('/roles');
    } catch (error: any) {
      console.error("Role deletion error:", error);
      toast({ variant: 'destructive', title: 'Error deleting role', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title">Role Title</Label>
          <Input id="title" {...register('title')} placeholder="e.g., Senior Frontend Developer for FinTech Startup" />
          <p className="text-sm text-muted-foreground pt-1">Be specific. This is the first thing potential collaborators will see.</p>
          {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="roleDescription">Role Description</Label>
          <Textarea id="roleDescription" {...register('roleDescription')} rows={6} placeholder="Describe the ideal candidate, responsibilities, and what they will work on..." />
          {errors.roleDescription && <p className="text-sm text-destructive">{errors.roleDescription.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="requiredTechStack">Required Tech Stack</Label>
          <div className="flex flex-wrap gap-2 rounded-md border p-2">
            {techStack.map((tech) => (
              <Badge key={tech} variant="secondary" className="flex items-center gap-1 text-base">
                {tech}
                <button type="button" onClick={() => handleTechStackRemove(tech)} className="rounded-full hover:bg-muted-foreground/20">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <Input
              id="requiredTechStack"
              value={techStackInput}
              onChange={(e) => setTechStackInput(e.target.value)}
              onKeyDown={handleTechStackAdd}
              onBlur={handleTechStackBlur} // For mobile tab/next
              placeholder="Type a technology and press Enter"
              className="flex-1 border-none shadow-none focus-visible:ring-0"
            />
          </div>
          {errors.requiredTechStack && <p className="text-sm text-destructive">{errors.requiredTechStack.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Required Professional Skills (Max 5)</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="w-full justify-between">
                <span className="truncate">{skills.length > 0 ? skills.join(', ') : 'Select up to 5 required skills...'}</span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                    <CommandInput placeholder="Search skills..." />
                    <CommandEmpty>No skill found.</CommandEmpty>
                    <CommandList><CommandGroup>{professionalSkills.map((skill) => (
                        <CommandItem key={skill} value={skill} onSelect={() => { const currentSkills = getValues('requiredSkills') || []; if (currentSkills.includes(skill)) { setValue('requiredSkills', currentSkills.filter((s) => s !== skill), { shouldDirty: true, shouldValidate: true }); } else if(currentSkills.length < 5) { setValue('requiredSkills', [...currentSkills, skill], { shouldDirty: true, shouldValidate: true }); } else { toast({ variant: "destructive", title: "Skill limit reached", description: "You can only select up to 5 skills." }) } }}>
                        <Check className={cn('mr-2 h-4 w-4', (getValues('requiredSkills') || []).includes(skill) ? 'opacity-100' : 'opacity-0')} />{skill}</CommandItem>))}
                    </CommandGroup></CommandList>
                </Command>
            </PopoverContent>
          </Popover>
          <div className="flex flex-wrap gap-1 pt-2">
                {skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="flex items-center gap-1">
                    {skill}
                    <button type="button" onClick={() => setValue('requiredSkills', skills.filter((s) => s !== skill), { shouldDirty: true, shouldValidate: true })} className="rounded-full hover:bg-muted-foreground/20">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
          </div>
          {errors.requiredSkills && <p className="text-sm text-destructive">{errors.requiredSkills.message}</p>}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <Label htmlFor="requiredYearsOfExperience">Required Years of Experience</Label>
                <Input id="requiredYearsOfExperience" type="number" step="0.5" {...register('requiredYearsOfExperience')} />
                {errors.requiredYearsOfExperience && <p className="text-sm text-destructive">{errors.requiredYearsOfExperience.message}</p>}
            </div>

            <div className="space-y-2">
                <Label>Incentives</Label>
                <Select onValueChange={(value) => setValue('incentives', value, { shouldValidate: true })} defaultValue={getValues('incentives')}>
                    <SelectTrigger><SelectValue placeholder="What do you offer collaborators?" /></SelectTrigger>
                    <SelectContent>{incentiveOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                </Select>
                {errors.incentives && <p className="text-sm text-destructive">{errors.incentives.message}</p>}
            </div>
        </div>

         <div className="space-y-2">
            <Label>Commitment Level</Label>
            <Select onValueChange={(value) => setValue('commitmentLevel', value, { shouldValidate: true })} defaultValue={getValues('commitmentLevel')}>
                <SelectTrigger><SelectValue placeholder="Select the required commitment level" /></SelectTrigger>
                <SelectContent>{commitmentLevelOptions.map(level => <SelectItem key={level} value={level}>{level}</SelectItem>)}</SelectContent>
            </Select>
            {errors.commitmentLevel && <p className="text-sm text-destructive">{errors.commitmentLevel.message}</p>}
        </div>
      </div>

      <div className="flex justify-between items-center mt-12">
            <Button type="submit" disabled={loading} size="lg">
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : isEditMode ? 'Save Changes' : 'Create Role'}
            </Button>
            {isEditMode && (
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" type="button" disabled={loading}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Role
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete this role posting.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteRole} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Continue</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
      </div>
    </form>
  );
}
