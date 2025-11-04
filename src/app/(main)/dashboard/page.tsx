'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { Project, UserProfile } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import ProjectCard from '@/components/project-card';
import { PlusCircle, ArrowRight, Briefcase, Users, Edit, Eye, BadgeCheck, BadgeX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function DashboardPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [recommendedDevelopers, setRecommendedDevelopers] = useState<UserProfile[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    
    const fetchData = async () => {
      setLoadingData(true);
      
      // Fetch user's projects
      const projectsCol = collection(db, 'projects');
      const q = query(projectsCol, where('ownerId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      setMyProjects(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project)));

      // Fetch recommended developers
      const usersCol = collection(db, 'users');
      const usersQuery = query(usersCol, where('uid', '!=', user.uid), limit(4));
      const usersSnapshot = await getDocs(usersQuery);
      setRecommendedDevelopers(usersSnapshot.docs.map(doc => doc.data() as UserProfile));
      
      setLoadingData(false);
    };

    fetchData();
  }, [user]);

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0]).join('');
  };

  if (authLoading || loadingData || !userProfile) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-8">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-12">
        
        {/* Top Sections: Profile and My Projects */}
        <div className="space-y-12">
          <Card>
            <CardHeader>
              <CardTitle>Your Profile</CardTitle>
              <CardDescription>A quick glance at your current profile information.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row items-center gap-6">
              <Avatar className="w-24 h-24 border-4 border-background shadow-md">
                <AvatarImage src={userProfile.photoURL} alt={userProfile.name} />
                <AvatarFallback className="text-4xl">{getInitials(userProfile.name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 text-center sm:text-left">
                  <p className="font-bold text-2xl">{userProfile.name}</p>
                  <p className="text-muted-foreground">{userProfile.email}</p>
                   <p className="text-sm text-foreground/80 mt-2 line-clamp-2">
                    {userProfile.bio || "You haven't added a bio yet."}
                  </p>
              </div>
              <Button variant="outline" className="w-full sm:w-auto flex-shrink-0" asChild>
                <Link href="/profile">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Profile
                </Link>
              </Button>
            </CardContent>
          </Card>

          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <Briefcase className="h-7 w-7 text-primary mr-3" />
                <h2 className="text-3xl font-bold tracking-tight">My Projects</h2>
              </div>
              <Button variant="outline" asChild>
                <Link href="/projects">
                  View All <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            {myProjects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {myProjects.slice(0, 3).map(project => <ProjectCard key={project.id} project={project} />)}
              </div>
            ) : (
              <div className="text-center py-16 border-2 border-dashed rounded-lg">
                <h3 className="text-xl font-semibold">You haven&apos;t created any projects yet.</h3>
                <p className="text-muted-foreground mt-2 mb-4">Start your next big idea today!</p>
                <Button asChild>
                  <Link href="/projects/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create New Project
                  </Link>
                </Button>
              </div>
            )}
          </section>
        </div>

        {/* Bottom Section: Preview and Connect */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Public Profile Preview */}
          <div className="lg:col-span-2">
            <section>
              <div className="flex items-center mb-6">
                  <Eye className="h-7 w-7 text-primary mr-3" />
                  <h2 className="text-3xl font-bold tracking-tight">Public Profile Preview</h2>
                </div>
                <Card className="overflow-hidden">
                  <div className="bg-muted/40 p-8">
                    <div className="flex flex-col md:flex-row items-start space-y-6 md:space-y-0 md:space-x-8">
                      <Avatar className="h-32 w-32 border-4 border-background shadow-lg">
                        <AvatarImage src={userProfile.photoURL} alt={userProfile.name} />
                        <AvatarFallback className="text-5xl">{getInitials(userProfile.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 pt-4">
                        <h1 className="text-4xl font-bold">{userProfile.name}</h1>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {userProfile.skills?.map((skill) => (
                            <Badge key={skill} variant="secondary" className="text-sm">{skill}</Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                      {userProfile.openForCollaboration ? (
                        <Badge variant="default" className="flex-shrink-0"><BadgeCheck className="mr-2 h-4 w-4"/>Open to Collab</Badge>
                      ) : (
                        <Badge variant="secondary" className="flex-shrink-0"><BadgeX className="mr-2 h-4 w-4"/>Not seeking colabs</Badge>
                      )}
                      </div>
                    </div>
                  </div>
                   <CardContent className="p-8 space-y-8">
                      <div>
                        <h3 className="text-xl font-semibold mb-2">About</h3>
                        <p className="text-foreground/80 leading-relaxed text-base">
                          {userProfile.bio || 'No bio provided yet. Add one to attract collaborators!'}
                        </p>
                      </div>
                       <div>
                          <h3 className="text-xl font-semibold mb-4">Projects</h3>
                          {myProjects.length > 0 ? (
                             <div className="space-y-4">
                              {myProjects.map(project => (
                                <Card key={project.id} className="flex items-center justify-between p-4">
                                  <div className="flex-1">
                                    <Link href={`/projects/${project.id}`} className="font-semibold hover:underline">{project.title}</Link>
                                    <p className="text-sm text-muted-foreground line-clamp-1">{project.description}</p>
                                  </div>
                                  {project.collaborationOpen ? (
                                      <Badge variant="default" className='ml-4 flex-shrink-0'><BadgeCheck className="mr-2 h-4 w-4"/>Open to Collab</Badge>
                                  ) : (
                                       <Badge variant="secondary" className='ml-4 flex-shrink-0'><BadgeX className="mr-2 h-4 w-4"/>Closed</Badge>
                                  )}
                                </Card>
                              ))}
                            </div>
                          ) : (
                            <p className="text-muted-foreground text-center py-4">No projects created yet.</p>
                          )}
                      </div>
                  </CardContent>
                </Card>
            </section>
          </div>

          {/* Connect with Developers */}
          <div className="space-y-8">
            <section>
               <div className="flex items-center mb-6">
                  <Users className="h-7 w-7 text-primary mr-3" />
                  <h2 className="text-3xl font-bold tracking-tight">Connect with Developers</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">
                  {recommendedDevelopers.map(dev => (
                    <Card key={dev.uid} className="transition-all hover:shadow-md overflow-hidden">
                      <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-4">
                        <Avatar className="h-12 w-12 flex-shrink-0">
                          <AvatarImage src={dev.photoURL} alt={dev.name} />
                          <AvatarFallback>{getInitials(dev.name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-center sm:text-left overflow-hidden">
                          <p className="font-semibold truncate" title={dev.name}>{dev.name}</p>
                        </div>
                        <Button size="sm" variant="outline" asChild className="flex-shrink-0 mt-2 sm:mt-0">
                          <Link href={`/developers/${dev.uid}`}>Profile</Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="mt-6 text-center">
                   <Button variant="secondary" asChild>
                    <Link href="/developers">Browse All Developers</Link>
                  </Button>
                </div>
            </section>
          </div>
        </div>

      </div>
    </div>
  );
}
