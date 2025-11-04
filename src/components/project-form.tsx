'use client';

import { useState, useEffect, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { doc, setDoc, addDoc, serverTimestamp, collection, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import ImageUploader from './image-uploader';
import { useToast } from '@/hooks/use-toast';
import type { Project } from '@/types';
import { generateProjectDescription } from '@/ai/flows/project-description-generator';
import { Sparkles, Loader2, X } from 'lucide-react';
import { Switch } from './ui/switch';

const projectSchema = z.object({
  title: z.string().min(5, { message: 'Title must be at least 5 characters long' }),
  description: z.string().min(20, { message: 'Description must be at least 20 characters long' }),
  requiredSkills: z.array(z.string()).min(1, { message: 'At least one skill is required' }),
  imageUrl: z.string().optional(),
  collaborationOpen: z.boolean().default(true),
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
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState<string[]>(project?.requiredSkills || []);
  const [isAiPending, startAiTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      title: project?.title || '',
      description: project?.description || '',
      requiredSkills: project?.requiredSkills || [],
      imageUrl: project?.imageUrl || '',
      collaborationOpen: project?.collaborationOpen === false ? false : true,
    },
  });

  const titleValue = watch('title');
  const collaborationOpenValue = watch('collaborationOpen');

  useEffect(() => {
    setValue('requiredSkills', skills);
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

  const handleGenerateDescription = async () => {
    if (!titleValue || skills.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Title and Skills Required',
        description: 'Please provide a project title and at least one skill to generate a description.',
      });
      return;
    }
    
    startAiTransition(async () => {
      try {
        const result = await generateProjectDescription({ title: titleValue, keywords: skills });
        if (result?.description) {
          setValue('description', result.description);
          toast({
            title: 'Description Generated!',
            description: 'The AI has generated a project description for you.',
          });
        }
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'AI Generation Failed',
          description: 'Could not generate a description at this time.',
        });
      }
    });
  };

  const onSubmit = async (data: ProjectFormData) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Not authenticated' });
      return;
    }
    setLoading(true);
    try {
      if (project) {
        // Update existing project
        const projectRef = doc(db, 'projects', project.id);
        await updateDoc(projectRef, { ...data, updatedAt: serverTimestamp() });
        toast({ title: 'Project updated successfully!' });
        router.push(`/projects/${project.id}`);
      } else {
        // Create new project
        const newProject = {
          ...data,
          ownerId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          interests: [],
        };
        const docRef = await addDoc(collection(db, 'projects'), newProject);
        toast({ title: 'Project created successfully!' });
        router.push(`/projects/${docRef.id}`);
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'An error occurred', description: 'Please try again.' });
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>{project ? 'Edit Project Details' : 'New Project Details'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Project Title</Label>
            <Input id="title" {...register('title')} placeholder="e.g., AI-Powered Note Taking App" />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="requiredSkills">Required Skills</Label>
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
                id="requiredSkills"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={handleSkillAdd}
                placeholder="Type a skill and press Enter"
                className="flex-1 border-none shadow-none focus-visible:ring-0"
              />
            </div>
            {errors.requiredSkills && <p className="text-sm text-destructive">{errors.requiredSkills.message}</p>}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="description">Description</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleGenerateDescription} disabled={isAiPending}>
                {isAiPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4 text-yellow-500" />
                )}
                Generate with AI
              </Button>
            </div>
            <Textarea id="description" {...register('description')} rows={6} placeholder="Describe your project in detail..." />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>
          
          <div className="space-y-2">
            <Label>Project Image</Label>
            <ImageUploader
              onUpload={(url) => setValue('imageUrl', url, { shouldValidate: true, shouldDirty: true })}
              initialUrl={project?.imageUrl}
              folderPath={`project-images/${user?.uid}`}
            />
          </div>

          <div className="flex items-center space-x-3 rounded-md border p-4">
              <Switch 
                id="collaborationOpen" 
                checked={collaborationOpenValue}
                onCheckedChange={(checked) => setValue('collaborationOpen', checked)}
              />
              <div className="space-y-0.5">
                <Label htmlFor="collaborationOpen" className="text-base">
                  Open for Collaboration
                </Label>
                <p className="text-sm text-muted-foreground">
                  Allow other developers to find and show interest in this project.
                </p>
              </div>
            </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={loading} size="lg">
            {loading ? 'Saving...' : project ? 'Save Changes' : 'Create Project'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
