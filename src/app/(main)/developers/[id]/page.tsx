'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/hooks/use-auth';
import type { UserProfile, Project } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ProjectCard from '@/components/project-card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Briefcase, BadgeCheck, BadgeX, Clock, BrainCircuit, Code, Target, Link as LinkIcon, Handshake } from 'lucide-react';
import { logAnalyticsEvent } from '@/firebase/analytics';

export default function DeveloperProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const developerId = params.id as string;

  const [developer, setDeveloper] = useState<UserProfile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
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

      const projectsCol = collection(db, 'projects');
      const q = query(projectsCol, where('ownerId', '==', developerId));
      const querySnapshot = await getDocs(q);
      const devProjects = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
      setProjects(devProjects);

      setLoading(false);
    };

    fetchDeveloperData();
  }, [developerId, user, router]);

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

  const allLinks: { label: string; url: string }[] = developer
    ? [
        developer.versionControl?.github
          ? { label: 'GitHub', url: developer.versionControl.github }
          : null,
        developer.socials?.linkedin
          ? { label: 'LinkedIn', url: developer.socials.linkedin }
          : null,
        developer.socials?.twitter
          ? { label: 'Twitter', url: developer.socials.twitter }
          : null,
        developer.portfolioUrl
          ? { label: 'Portfolio', url: developer.portfolioUrl }
          : null,
        ...(developer.extraLinks ?? []).map(link =>
          link?.url ? { label: link.label, url: link.url } : null
        ),
      ].filter((link): link is { label: string; url: string } => !!link)
    : [];

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
            <CardContent className="grid grid-cols-1 gap-8 sm:grid-cols-2">
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

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row items-start space-y-6 md:space-y-0 md:space-x-8 mb-12">
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
      
      <div className="space-y-12">
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                                <span className="capitalize">{link.label}</span>
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
          {projects.length > 0 ? (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
              {projects.map((project) => <ProjectCard key={project.id} project={project} />)}
            </div>
          ) : (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground text-sm">This developer hasn't created any projects yet.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
