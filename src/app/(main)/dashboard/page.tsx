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
import { PlusCircle, ArrowRight, Briefcase, Users, Edit } from 'lucide-react';

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
      const q = query(projectsCol, where('ownerId', '==', user.uid), limit(3));
      const querySnapshot = await getDocs(q);
      setMyProjects(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project)));

      // Fetch recommended developers (simple for now: get first 4 other users)
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="space-y-8">
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        
        {/* Sidebar */}
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Your Profile</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center text-center">
              <Avatar className="w-24 h-24 mb-4 border-4 border-background shadow-md">
                <AvatarImage src={userProfile.photoURL} alt={userProfile.name} />
                <AvatarFallback className="text-4xl">{getInitials(userProfile.name)}</AvatarFallback>
              </Avatar>
              <p className="font-bold text-xl">{userProfile.name}</p>
              <p className="text-muted-foreground mb-4">{userProfile.email}</p>
              <p className="text-sm text-foreground/80 mb-6 line-clamp-3">
                {userProfile.bio || "You haven't added a bio yet."}
              </p>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/profile">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Profile
                </Link>
              </Button>
            </CardContent>
          </Card>
           <section>
             <div className="flex items-center mb-6">
                <Users className="h-7 w-7 text-primary mr-3" />
                <h2 className="text-3xl font-bold tracking-tight">Connect with Developers</h2>
              </div>
              <div className="grid grid-cols-1 gap-6">
                {recommendedDevelopers.map(dev => (
                  <Card key={dev.uid} className="flex items-center p-4 gap-4 transition-all hover:shadow-md">
                     <Avatar className="h-12 w-12">
                        <AvatarImage src={dev.photoURL} alt={dev.name} />
                        <AvatarFallback>{getInitials(dev.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-semibold">{dev.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{dev.skills?.join(', ') || 'No skills listed'}</p>
                      </div>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/developers/${dev.uid}`}>Profile</Link>
                      </Button>
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

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-12">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {myProjects.map(project => <ProjectCard key={project.id} project={project} />)}
              </div>
            ) : (
              <div className="text-center py-16 border-2 border-dashed rounded-lg">
                <h3 className="text-xl font-semibold">You haven&apos;t created any projects yet.</h3>
                <p className="text-muted-foreground mt-2 mb-4">Let's change that. Start your next big idea today!</p>
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

      </div>
    </div>
  );
}
