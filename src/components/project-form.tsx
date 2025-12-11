'use client';

import { useState, useTransition, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { doc, serverTimestamp, collection, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase/config';
import { ref, deleteObject, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/lib/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import ImageUploader from './image-uploader';
import { useToast } from '@/hooks/use-toast';
import type { Project } from '@/types';
import { generateProjectDescription } from '@/ai/flows/project-description-generator';
import { Sparkles, Loader2, X, Trash2, Check, ChevronsUpDown, PlusCircle, Link as LinkIcon } from 'lucide-react';
import { Switch } from './ui/switch';
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
import { logProjectCreated, logProjectDeleted } from '@/firebase/analytics';


const professionalSkills = [
  'Problem Solving', 'Debugging', 'System Design', 'Communication', 'Team Collaboration', 'Agile Development', 'API Design', 'Version Control (Git)', 'Project Management', 'Code Review', 'Testing & QA', 'Algorithmic Thinking', 'Security Best Practices', 'Time Management', 'Documentation Writing',
];

const projectStages = ['Idea', 'Wireframing', 'MVP in Development', 'Live & Scaling', 'On Hold', 'Completed'];
const incentiveOptions = ['Equity Share', 'Paid Contract', 'Revenue Share', 'Hobby/Volunteer', 'Learner/School Project'];
const linkTypes = ['GitHub', 'GitLab', 'Bitbucket', 'Live Demo', 'Figma', 'Other'];

const projectSchema = z.object({
  title: z.string().min(5, { message: 'Title must be at least 5 characters long' }),
  description: z.string().min(20, { message: 'Description must be at least 20 characters long' }),
  requiredTechStack: z.array(z.string()).min(1, { message: 'At least one technology is required' }),
  requiredSkills: z.array(z.string()).max(3, { message: 'You can select up to 3 skills.' }).min(1, {message: 'At least one skill is required.'}),
  requiredYearsOfExperience: z.coerce.number().min(0, { message: "Years of experience can't be negative."}).optional(),
  imageUrl: z.string().optional(),
  collaborationOpen: z.boolean().default(true),
  projectStage: z.string().min(1, { message: 'Please select a project stage.' }),
  roleRequirements: z.string().min(10, { message: 'Role description must be at least 10 characters.' }),
  incentives: z.string().min(1, { message: 'Please specify the incentives.' }),
  projectLinks: z.array(z.object({
    type: z.string(),
    url: z.string().url({ message: 'Please enter a valid URL (must include https://)' })
  })).max(2, { message: 'You can add a maximum of two links.' }).optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

type ProjectFormProps = {
  project?: Project;
};

export default function ProjectForm({ project }: ProjectFormProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [techStackInput, setTechStackInput] = useState('');
  const [isAiPending, startAiTransition] = useTransition();
  const [imageFile, setImageFile] = useState<File | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    getValues,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      title: project?.title || '',
      description: project?.description || '',
      requiredTechStack: project?.requiredTechStack || [],
      requiredSkills: project?.requiredSkills || [],
      requiredYearsOfExperience: project?.requiredYearsOfExperience || 0,
      imageUrl: project?.imageUrl || '',
      collaborationOpen: project?.collaborationOpen === false ? false : true,
      projectStage: project?.projectStage || '',
      roleRequirements: project?.roleRequirements || '',
      incentives: project?.incentives || '',
      projectLinks: project?.projectLinks || [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "projectLinks" });

  const titleValue = watch('title');
  const techStack = watch('requiredTechStack') || [];
  const skills = watch('requiredSkills') || [];
  const collaborationOpenValue = watch('collaborationOpen');
  const imageUrlValue = watch('imageUrl');

  useEffect(() => {
    if (project?.imageUrl) setValue('imageUrl', project.imageUrl);
  }, [project, setValue]);


  const handleTechStackAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && techStackInput.trim()) {
      e.preventDefault();
      const currentTechStack = getValues('requiredTechStack') || [];
      if (!currentTechStack.includes(techStackInput.trim())) {
        setValue('requiredTechStack', [...currentTechStack, techStackInput.trim()]);
      }
      setTechStackInput('');
    }
  };

  const handleTechStackRemove = (techToRemove: string) => {
    setValue('requiredTechStack', (getValues('requiredTechStack') || []).filter((tech) => tech !== techToRemove));
  };

  const handleGenerateDescription = async () => {
    if (!titleValue || (getValues('requiredTechStack') || []).length === 0) {
      toast({ variant: 'destructive', title: 'Title and Tech Stack Required', description: 'Please provide a project title and at least one technology to generate a description.' });
      return;
    }
    
    startAiTransition(async () => {
      try {
        const result = await generateProjectDescription({ title: titleValue, keywords: getValues('requiredTechStack') });
        if (result?.description) {
          setValue('description', result.description);
          toast({ title: 'Description Generated!', description: 'The AI has generated a project description for you.' });
        }
      } catch (error) {
        toast({ variant: 'destructive', title: 'AI Generation Failed', description: 'Could not generate a description at this time.' });
      }
    });
  };

  const onSubmit = async (data: ProjectFormData) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Not authenticated' });
      return;
    }
    setLoading(true);

    let finalImageUrl = project?.imageUrl || '';
    const oldImageUrl = project?.imageUrl;

    if (imageFile) {
        toast({ title: 'Uploading image...' });
        const storageRef = ref(storage, `project-images/${user.uid}/${Date.now()}_${imageFile.name}`);
        try {
            const snapshot = await uploadBytes(storageRef, imageFile);
            finalImageUrl = await getDownloadURL(snapshot.ref);
            toast({ title: 'Image uploaded!' });
        } catch (error) {
            console.error("Image upload failed", error);
            toast({ variant: 'destructive', title: 'Image Upload Failed', description: 'Could not upload the new image.' });
            setLoading(false);
            return;
        }
    }
    
    const projectData = { ...data, imageUrl: finalImageUrl };

    try {
      if (project) {
        const projectRef = doc(db, 'projects', project.id);
        await updateDoc(projectRef, { ...projectData, updatedAt: serverTimestamp() });

        if (imageFile && oldImageUrl && oldImageUrl.startsWith('https://firebasestorage.googleapis.com')) {
           try {
              const oldImageRef = ref(storage, oldImageUrl);
              await deleteObject(oldImageRef);
           } catch (deleteError: any) {
              if (deleteError.code !== 'storage/object-not-found') console.warn("Could not delete old image:", deleteError);
           }
        }

        toast({ title: 'Project updated successfully!' });
        router.push(`/projects/${project.id}`);
      } else {
        const newProject = {
          ...projectData,
          ownerId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          interestedUsers: [],
          matchedUsers: [],
        };
        const docRef = await addDoc(collection(db, 'projects'), newProject);
        logProjectCreated(user.uid, docRef.id);
        toast({ title: 'Project created successfully!' });
        router.push(`/projects/${docRef.id}`);
      }
    } catch (e) {
      console.error("Error saving project:", e);
      toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save the project.' });
      setLoading(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!project || !user) return;
    setLoading(true);
    try {
      if (project.imageUrl && project.imageUrl.startsWith('https://firebasestorage.googleapis.com')) {
        const imageRef = ref(storage, project.imageUrl);
        await deleteObject(imageRef).catch(err => console.warn("Image deletion failed, may not exist", err));
      }
      const projectRef = doc(db, 'projects', project.id);
      await deleteDoc(projectRef);
      logProjectDeleted(user.uid, project.id);
      toast({ title: 'Project deleted successfully' });
      router.push('/projects');
    } catch (error: any) {
      console.error("Project deletion error:", error);
      toast({ variant: 'destructive', title: 'Error deleting project', description: error.message });
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader><CardTitle>{project ? 'Edit Project Details' : 'New Project Details'}</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Project Title</Label>
              <Input id="title" {...register('title')} placeholder="e.g., AI-Powered Note Taking App" />
              <p className="text-sm text-muted-foreground pt-1">If your project is confidential, consider a more generic title like "Stealth Startup in FinTech".</p>
              {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
            </div>

             <div className="space-y-2">
                <Label>Project Stage</Label>
                <Select onValueChange={(value) => setValue('projectStage', value, { shouldValidate: true })} defaultValue={getValues('projectStage')}>
                    <SelectTrigger><SelectValue placeholder="Select the current stage of your project" /></SelectTrigger>
                    <SelectContent>{projectStages.map(stage => <SelectItem key={stage} value={stage}>{stage}</SelectItem>)}</SelectContent>
                </Select>
                {errors.projectStage && <p className="text-sm text-destructive">{errors.projectStage.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="requiredTechStack">Required Tech Stack</Label>
              <div className="flex flex-wrap gap-2 rounded-md border p-2">
                {techStack.map((tech) => (
                  <div key={tech} className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
                    {tech}
                    <button type="button" onClick={() => handleTechStackRemove(tech)}><X className="h-4 w-4" /></button>
                  </div>
                ))}
                <Input id="requiredTechStack" value={techStackInput} onChange={(e) => setTechStackInput(e.target.value)} onKeyDown={handleTechStackAdd} placeholder="Type a technology and press Enter" className="flex-1 border-none shadow-none focus-visible:ring-0" />
              </div>
              {errors.requiredTechStack && <p className="text-sm text-destructive">{errors.requiredTechStack.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Required Skills</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between">
                    <span className="truncate">{skills.length > 0 ? skills.join(', ') : 'Select up to 3 skills...'}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command><CommandInput placeholder="Search skills..." /><CommandEmpty>No skill found.</CommandEmpty><CommandList><CommandGroup>{professionalSkills.map((skill) => <CommandItem key={skill} value={skill} onSelect={() => { const currentSkills = getValues('requiredSkills') || []; if (currentSkills.includes(skill)) { setValue('requiredSkills', currentSkills.filter((s) => s !== skill), { shouldDirty: true, shouldValidate: true }); } else if(currentSkills.length < 3) { setValue('requiredSkills', [...currentSkills, skill], { shouldDirty: true, shouldValidate: true }); } else { toast({ variant: "destructive", title: "Skill limit reached", description: "You can only select up to 3 skills." }) } }}>
                            <Check className={cn('mr-2 h-4 w-4', (getValues('requiredSkills') || []).includes(skill) ? 'opacity-100' : 'opacity-0')} />{skill}</CommandItem>)}</CommandGroup></CommandList></Command></PopoverContent>
              </Popover>
               <div className="flex flex-wrap gap-1 pt-2">{skills.map((skill) => <Badge key={skill} variant="secondary" className="flex items-center gap-1">{skill}<button type="button" onClick={() => setValue('requiredSkills', skills.filter((s) => s !== skill), { shouldDirty: true })} className="rounded-full hover:bg-muted-foreground/20"><X className="h-3 w-3" /></button></Badge>)}</div>
              {errors.requiredSkills && <p className="text-sm text-destructive">{errors.requiredSkills.message}</p>}
            </div>

            <div className="space-y-2">
                <Label htmlFor="requiredYearsOfExperience">Required Years of Experience</Label>
                <Input id="requiredYearsOfExperience" type="number" step="0.5" {...register('requiredYearsOfExperience')} />
                <p className="text-sm text-muted-foreground pt-1">Use decimals for half-year increments (e.g., 2.5). For less than a year, use decimals (e.g. 0.5 for 6 months).</p>
                {errors.requiredYearsOfExperience && <p className="text-sm text-destructive">{errors.requiredYearsOfExperience.message}</p>}
            </div>

            <div className="space-y-2">
                <Label htmlFor="roleRequirements">Role Requirements</Label>
                <Textarea id="roleRequirements" {...register('roleRequirements')} rows={4} placeholder="e.g., Seeking a UI/UX designer to create high-fidelity mockups and prototypes in Figma..." />
                {errors.roleRequirements && <p className="text-sm text-destructive">{errors.roleRequirements.message}</p>}
            </div>

             <div className="space-y-2">
                <Label>Incentives</Label>
                <Select onValueChange={(value) => setValue('incentives', value, { shouldValidate: true })} defaultValue={getValues('incentives')}>
                    <SelectTrigger><SelectValue placeholder="What do you offer collaborators?" /></SelectTrigger>
                    <SelectContent>{incentiveOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                </Select>
                {errors.incentives && <p className="text-sm text-destructive">{errors.incentives.message}</p>}
            </div>

            <div className="space-y-4">
                <Label>Project Links (Optional, max 2)</Label>
                {fields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2">
                        <Select onValueChange={(value) => setValue(`projectLinks.${index}.type`, value)} defaultValue={field.type}>
                            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Link Type" /></SelectTrigger>
                            <SelectContent>{linkTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                        </Select>
                        <Input {...register(`projectLinks.${index}.url`)} placeholder="https://..." />
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                ))}
                {errors.projectLinks && <p className="text-sm text-destructive">{errors.projectLinks.message || errors.projectLinks?.root?.message}</p>}
                {fields.length < 2 && <Button type="button" variant="outline" size="sm" onClick={() => append({type: 'GitHub', url: ''})}><PlusCircle className="mr-2 h-4 w-4" />Add Link</Button>}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="description">Description</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleGenerateDescription} disabled={isAiPending}>{isAiPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4 text-yellow-500" />}Generate with AI</Button>
              </div>
              <Textarea id="description" {...register('description')} rows={6} placeholder="Describe your project in detail..." />
              {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
            </div>
            
            <div className="space-y-2">
              <Label>Project Image</Label>
              <ImageUploader onFileSelect={setImageFile} initialUrl={imageUrlValue} />
            </div>

            <div className="flex items-center space-x-3 rounded-md border p-4">
                <Switch id="collaborationOpen" checked={collaborationOpenValue} onCheckedChange={(checked) => setValue('collaborationOpen', checked, { shouldValidate: true, shouldDirty: true })} />
                <div className="space-y-0.5"><Label htmlFor="collaborationOpen" className="text-base">Open for Collaboration</Label><p className="text-sm text-muted-foreground">Allow other developers to find and show interest in this project.</p></div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={loading} size="lg">{loading ? 'Saving...' : project ? 'Save Changes' : 'Create Project'}</Button>
          </CardFooter>
        </Card>
      </form>

      {project && (
        <div className="mt-12 border-t border-destructive/20 pt-6">
          <h3 className="text-lg font-semibold text-destructive">Danger Zone</h3>
          <p className="text-sm text-muted-foreground mb-4">Deleting your project is a permanent action and cannot be undone.</p>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="destructive"><Trash2 className="mr-2 h-4 w-4" />Delete Project</Button></AlertDialogTrigger>
            <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete your project and remove its data from our servers.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteProject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Continue</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </>
  );
}
