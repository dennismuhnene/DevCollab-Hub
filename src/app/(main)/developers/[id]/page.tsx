'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/hooks/use-auth';
import type { UserProfile, Project, Role } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ProjectCard from '@/components/project-card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { Briefcase, BadgeCheck, BadgeX, Clock, BrainCircuit, Code, Target, Link as LinkIcon, Handshake, Users } from 'lucide-react';
import { logAnalyticsEvent } from '@/firebase/analytics';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PlaceHolderImages } from '@/lib/placeholder-images';


// Helper component to display project details within the modal
const ProjectDetailsInModal = ({ project, developer }: { project: Project; developer: UserProfile | null }) => {
    const [roles, setRoles] = useState<Role[]>([]);
    const [rolesLoading, setRolesLoading] = useState(true);
    const defaultProjectImage = PlaceHolderImages.find(p => p.id === 'project-1')?.imageUrl || "";

    useEffect(() => {
        if (!project.id) return;
        const fetchRoles = async () => {
            setRolesLoading(true);
            const rolesQuery = query(collection(db, 'roles'), where('projectId', '==', project.id));
            const querySnapshot = await getDocs(rolesQuery);
            const projectRoles = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Role));
            setRoles(projectRoles);
            setRolesLoading(false);
        };
        fetchRoles();
    }, [project.id]);

    if (!project) return null;
    
    const getInitials = (name?: string) => {
        if (!name) return 'U';
        return name.split(' ').map((n) => n[0]).join('');
    };

    return (
        <div className="space-y-4 p-1">
            <div className="aspect-[16/9] w-full relative overflow-hidden rounded-lg shadow-md">
                <Image
                    src={project.imageUrl || defaultProjectImage}
                    alt={project.title || 'Project Image'}
                    fill
                    className="object-cover"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                <div className="md:col-span-2 space-y-4">
                    <Card>
                        <CardHeader><CardTitle className="text-lg font-semibold">About this Project</CardTitle></CardHeader>
                        <CardContent><p className="text-sm text-muted-foreground font-normal">{project.description}</p></CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle className="flex items-center text-lg font-semibold"><Code className="w-5 h-5 mr-2"/>Tech Stack</CardTitle></CardHeader>
                        <CardContent className="flex flex-wrap gap-2">
                            {project.requiredTechStack.map(tech => <Badge variant="secondary" key={tech}>{tech}</Badge>)}
                        </CardContent>
                    </Card>

                     <Card>
                        <CardHeader><CardTitle className="flex items-center text-lg font-semibold"><BrainCircuit className="w-5 h-5 mr-2"/>Required Skills</CardTitle></CardHeader>
                        <CardContent className="flex flex-wrap gap-2">
                            {project.requiredSkills.map(skill => <Badge variant="outline" key={skill}>{skill}</Badge>)}
                        </CardContent>
                    </Card>
                </div>
                <div className="space-y-4">
                   {developer && (
                        <Card>
                            <CardHeader><CardTitle className="text-lg font-semibold">Project Owner</CardTitle></CardHeader>
                            <CardContent className="flex items-center space-x-4">
                                <Avatar>
                                    <AvatarImage src={developer.photoURL} />
                                    <AvatarFallback>{getInitials(developer.name)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-sm font-normal">{developer.name}</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                     <Card>
                        <CardHeader><CardTitle className="flex items-center text-lg font-semibold"><Users className="w-5 h-5 mr-2"/>Open Roles</CardTitle></CardHeader>
                        <CardContent className="flex flex-wrap gap-2">
                            {rolesLoading ? <Skeleton className="h-8 w-full" /> : roles.length > 0 ? (
                                roles.map((role: Role) => <Badge variant="default" key={role.id}>{role.title}</Badge>)
                            ) : <p className="text-sm font-normal text-muted-foreground">No open roles.</p>}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export const DeveloperProfileContent = ({ developer }: { developer: UserProfile }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    if (!developer.uid) return;

    const fetchProjects = async () => {
      setLoading(true);
      const projectsCol = collection(db, 'projects');
      const q = query(projectsCol, where('ownerId', '==', developer.uid));
      const querySnapshot = await getDocs(q);
      const devProjects = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
      setProjects(devProjects);
      setLoading(false);
    };

    fetchProjects();
  }, [developer.uid]);

    const getInitials = (name?: string) => {
        if (!name) return 'U';
        return name.split(' ').map((n) => n[0]).join('');
    };

  const formatExperience = (years?: number) => {
    if (years === undefined) return 'Not specified';
    if (years < 1) {
      const months = Math.round(years * 12);
      return `${months} month${months !== 1 ? 's' : ''}`;
    }
    return `${years} year${years !== 1 ? 's' : ''}`;
  };

    const allLinks: { label: string; url: string }[] = [];
    if (developer) {
        const addedUrls = new Set<string>();

        const addLink = (label: string | undefined, url: string | undefined) => {
            if (label && url && url.trim() !== '' && !addedUrls.has(url)) {
                allLinks.push({ label, url });
                addedUrls.add(url);
            }
        };

        // 1. Portfolio URL
        addLink('Portfolio', developer.portfolioUrl);

        // 2. Version Control (e.g., GitHub)
        if (developer.versionControl && (developer.versionControl as any).url) {
            const vc = developer.versionControl as any;
            const label = vc.type.charAt(0).toUpperCase() + vc.type.slice(1);
            addLink(label, vc.url);
        }

        // 3. Socials (e.g., LinkedIn)
        if (developer.socials && (developer.socials as any).url) {
            const social = developer.socials as any;
            const label = social.type.charAt(0).toUpperCase() + social.type.slice(1);
            addLink(label, social.url);
        }

        // 4. Extra Links
        if (Array.isArray(developer.extraLinks)) {
            developer.extraLinks.forEach((link: any) => {
                if (link && link.type && link.url) {
                    addLink(link.type, link.url);
                }
            });
        }
        
        // 5. Legacy fields for backward compatibility
        addLink('GitHub', developer.githubUrl);
        addLink('LinkedIn', developer.linkedinUrl);
        addLink('Twitter', developer.twitterUrl);
    }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row items-start space-y-6 md:space-y-0 md:space-x-8 mb-6">
        <Avatar className="h-36 w-36 border-4 border-background shadow-lg">
          <AvatarImage src={developer.photoURL} alt={developer.name} />
          <AvatarFallback className="text-5xl">{getInitials(developer.name)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 pt-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold">{developer.name}</h1>
              <div className="flex items-center gap-4 mt-2 text-muted-foreground">
                  <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">{formatExperience(developer.yearsOfExperience)}</span>
                  </div>
              </div>
            </div>
            {developer.openForCollaboration ? (
              <Badge variant="default"><BadgeCheck className="mr-2 h-4 w-4"/>Open to Collab</Badge>
            ) : (
              <Badge variant="secondary"><BadgeX className="mr-2 h-4 w-4"/>Not seeking colabs</Badge>
            )}
          </div>
        </div>
      </div>
      
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">About</CardTitle></CardHeader>
          <CardContent><p className="text-foreground/80 leading-relaxed text-base">{developer.bio || 'No bio provided yet.'}</p></CardContent>
        </Card>

        {developer.openForCollaboration && (developer.collaborationGoals?.length || developer.commitmentLevel) && (
            <Card>
                <CardHeader><CardTitle className="flex items-center text-base"><Handshake className="mr-2 h-5 w-5 text-primary"/> Collaboration Preferences</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    {developer.collaborationGoals && developer.collaborationGoals.length > 0 && (
                        <div>
                            <h3 className="font-semibold mb-2 flex items-center text-sm"><Target className="mr-2 h-4 w-4"/> Goals</h3>
                            <div className="flex flex-wrap gap-2">
                                {developer.collaborationGoals.map(goal => <Badge key={goal} variant="default">{goal}</Badge>)}
                            </div>
                        </div>
                    )}
                    {developer.commitmentLevel && (
                         <div>
                            <h3 className="font-semibold mb-2 text-sm">Commitment</h3>
                            <p className="text-muted-foreground text-sm">{developer.commitmentLevel}</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
                <CardHeader><CardTitle className="flex items-center text-base"><BrainCircuit className="mr-2 h-5 w-5 text-primary" /> Skills</CardTitle></CardHeader>
                <CardContent>
                    {developer.skills && developer.skills.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                        {developer.skills.map((skill) => <Badge key={skill} variant="secondary">{skill}</Badge>)}
                        </div>
                    ) : <p className="text-muted-foreground text-sm">No professional skills listed.</p>}
                </CardContent>
            </Card>
             <Card>
                <CardHeader><CardTitle className="flex items-center text-base"><Code className="mr-2 h-5 w-5 text-primary" /> Tech Stack</CardTitle></CardHeader>
                <CardContent>
                    {developer.techStack && developer.techStack.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                        {developer.techStack.map((tech) => <Badge key={tech} variant="outline">{tech}</Badge>)}
                        </div>
                    ) : <p className="text-muted-foreground text-sm">No technologies listed.</p>}
                </CardContent>
            </Card>
        </div>

        {allLinks.length > 0 && (
             <Card>
                <CardHeader><CardTitle className="flex items-center text-base"><LinkIcon className="mr-2 h-5 w-5 text-primary"/> Links</CardTitle></CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                    {allLinks.map((link, index) => (
                        <Button asChild key={index} variant="outline">
                            <Link href={link.url} target="_blank" rel="noopener noreferrer">
                                <span>{link.label}</span>
                            </Link>
                        </Button>
                    ))}
                </CardContent>
            </Card>
        )}

        <section>
          <div className="flex items-center mb-6">
              <Briefcase className="h-7 w-7 text-primary mr-3" />
              <h2 className="text-lg font-bold tracking-tight">Projects</h2>
          </div>
          {loading ? (
             <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : projects.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {projects.map((project) => <ProjectCard key={project.id} project={project} onClick={() => setSelectedProject(project)} />)}
            </div>
          ) : (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground text-sm">This developer hasn't created any projects yet.</p>
            </div>
          )}
        </section>
      </div>
      <Dialog open={!!selectedProject} onOpenChange={(isOpen) => !isOpen && setSelectedProject(null)}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
            <DialogHeader>
                <DialogTitle>{selectedProject?.title}</DialogTitle>
                <DialogDescription>
                    Owner: {developer.name}
                </DialogDescription>
            </DialogHeader>
            <div className="flex-grow overflow-y-auto pr-6">
                 {selectedProject && <ProjectDetailsInModal project={selectedProject} developer={developer} />}
            </div>
        </DialogContent>
    </Dialog>
    </div>
  );
}

// The page component now just fetches the main data and renders the content component.
export default function DeveloperProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const developerId = params.id as string;

  const [developer, setDeveloper] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!developerId || !user) return;

    const fetchDeveloperData = async () => {
      setLoading(true);
      const developerDocRef = doc(db, 'users', developerId);
      const developerDoc = await getDoc(developerDocRef);

      if (developerDoc.exists()) {
        const devData = { uid: developerDoc.id, ...developerDoc.data() } as UserProfile;
        setDeveloper(devData);
        logAnalyticsEvent('profile_view', { user_id: user.uid, viewed_user_id: developerId });
      } else {
        router.push('/developers');
        return;
      }
      setLoading(false);
    };

    fetchDeveloperData();
  }, [developerId, user, router]);

  if (loading || authLoading) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-6 mb-8">
          <Skeleton className="h-32 w-32 rounded-full" />
          <div className="space-y-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <div className="space-y-8">
          <Card>
            <CardHeader><Skeleton className="h-8 w-32" /></CardHeader>
            <CardContent><Skeleton className="h-20 w-full" /></CardContent>
          </Card>
          <Card>
            <CardHeader><Skeleton className="h-8 w-48" /></CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!developer) {
    return <div className="text-center py-20">Developer not found.</div>;
  }

  return <DeveloperProfileContent developer={developer} />;
}
