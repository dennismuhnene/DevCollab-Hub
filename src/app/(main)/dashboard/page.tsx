'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { collection, query, where, getDocs, limit, doc, documentId, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { Project, UserProfile, ExternalLink } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import ProjectCard from '@/components/project-card';
import { PlusCircle, ArrowRight, Briefcase, Users, Edit, Eye, BadgeCheck, BadgeX, BrainCircuit, Code, Clock, UserCheck, MessageSquare, Hand, Lightbulb, Link as LinkIcon, Target, Handshake, Sparkles, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { createMatch } from '@/lib/firebase/matches';
import { addNotification } from '@/lib/firebase/notifications';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { getProfileInsights } from '@/ai/flows/get-profile-insights';
import type { GetProfileInsightsOutput } from '@/types/ai';

interface InterestedUser extends UserProfile {}

export default function DashboardPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [recommendedDevelopers, setRecommendedDevelopers] = useState<UserProfile[]>([]);
  const [interestedUsersByProject, setInterestedUsersByProject] = useState<Record<string, InterestedUser[]>>({});
  const [loadingData, setLoadingData] = useState(true);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchedInfo, setMatchedInfo] = useState<{ projectName: string; devName: string; matchId: string } | null>(null);
  const { toast } = useToast();
  const [isAiInsightsLoading, startAiInsightsTransition] = useTransition();
  const [aiInsights, setAiInsights] = useState<GetProfileInsightsOutput | null>(null);
  const [hasFetched, setHasFetched] = useState(false);


  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || !userProfile || hasFetched) return;
    
    const fetchData = async () => {
      setLoadingData(true);
      
      const projectsCol = collection(db, 'projects');
      const q = query(projectsCol, where('ownerId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const projects = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
      setMyProjects(projects);

      const allInterestedUserIds = new Set<string>();
      projects.forEach(p => p.interestedUsers?.forEach(uid => allInterestedUserIds.add(uid)));

      if (allInterestedUserIds.size > 0) {
        const interestedUsersProfiles: UserProfile[] = [];
        const userChunks = Array.from(allInterestedUserIds).reduce((acc: string[][], curr: string, i: number) => {
          const chunkIndex = Math.floor(i / 30);
          if (!acc[chunkIndex]) acc[chunkIndex] = [];
          acc[chunkIndex].push(curr);
          return acc;
        }, []);

        const userPromises = userChunks.map(chunk => getDocs(query(collection(db, 'users'), where(documentId(), 'in', chunk))));
        const userSnapshots = await Promise.all(userPromises);
        userSnapshots.forEach(snap => snap.docs.forEach(d => interestedUsersProfiles.push({ uid: d.id, ...d.data() } as UserProfile)));
        
        const interestedUsersData: Record<string, InterestedUser[]> = {};
        for (const project of projects) {
            interestedUsersData[project.id] = (project.interestedUsers || [])
            .map(uid => interestedUsersProfiles.find(p => p.uid === uid))
            .filter((u): u is InterestedUser => u !== undefined);
        }
        setInterestedUsersByProject(interestedUsersData);
      }

      const usersCol = collection(db, 'users');
      const usersQuery = query(usersCol, limit(5));
      const usersSnapshot = await getDocs(usersQuery);
      const devs = usersSnapshot.docs
        .map(d => ({ uid: d.id, ...(d.data() as any) } as UserProfile))
        .filter(d => d.uid !== user.uid)
        .slice(0, 4);
      setRecommendedDevelopers(devs);
      
      setLoadingData(false);
      setHasFetched(true);
    };

    fetchData();
  }, [user, userProfile, hasFetched]);

  const handleGenerateInsights = () => {
    if (!user || !userProfile) return;

    startAiInsightsTransition(async () => {
      try {
        const allEngagedUserIds = new Set<string>();
        myProjects.forEach(p => {
            p.interestedUsers?.forEach(uid => allEngagedUserIds.add(uid));
            p.matchedUsers?.forEach(uid => allEngagedUserIds.add(uid));
        });

        let engagedDeveloperProfiles: UserProfile[] = [];
        if (allEngagedUserIds.size > 0) {
            const userChunks = Array.from(allEngagedUserIds).reduce((acc: string[][], curr: string, i: number) => {
                const chunkIndex = Math.floor(i/30);
                if(!acc[chunkIndex]) acc[chunkIndex] = [];
                acc[chunkIndex].push(curr);
                return acc;
            }, []);

            const userPromises = userChunks.map(chunk => getDocs(query(collection(db, 'users'), where(documentId(), 'in', chunk))));
            const userSnapshots = await Promise.all(userPromises);
            userSnapshots.forEach(snap => snap.docs.forEach(d => engagedDeveloperProfiles.push({ uid: d.id, ...d.data() } as UserProfile)));
        }

        if (engagedDeveloperProfiles.length === 0) {
            toast({ title: "No Engaged Developers Yet", description: "AI insights require developers to first show interest or match with your projects." });
            return;
        }

        const insights = await getProfileInsights({
            userProfile: {
                bio: userProfile.bio || '',
                skills: userProfile.skills || [],
                techStack: userProfile.techStack || [],
                yearsOfExperience: userProfile.yearsOfExperience || 0,
                collaborationGoals: userProfile.collaborationGoals || [],
                commitmentLevel: userProfile.commitmentLevel || '',
            },
            userProjects: myProjects.map(p => ({ title: p.title, description: p.description, requiredSkills: p.requiredSkills })),
            interestedDevelopers: engagedDeveloperProfiles.map(i => ({ 
                bio: i.bio || '', 
                skills: i.skills || [], 
                techStack: i.techStack || [], 
                yearsOfExperience: i.yearsOfExperience || 0,
                collaborationGoals: i.collaborationGoals || [],
                commitmentLevel: i.commitmentLevel || '',
            })),
        });
        setAiInsights(insights);
      } catch (e) {
        console.error("Failed to get AI insights", e);
        toast({ variant: 'destructive', title: 'Could not load AI insights.'});
      }
    });
  }

  const handleMatch = async (project: Project, interestedUser: InterestedUser) => {
    if (!user || !userProfile) return;
    try {
      const matchId = await createMatch(user.uid, interestedUser.uid, project.id, project.title);
      
      const projectRef = doc(db, 'projects', project.id);
      updateDocumentNonBlocking(projectRef, {
        interestedUsers: (project.interestedUsers || []).filter(uid => uid !== interestedUser.uid),
        matchedUsers: [...(project.matchedUsers || []), interestedUser.uid],
        updatedAt: serverTimestamp(),
      });

      addNotification(interestedUser.uid, { type: 'match', fromUserId: user.uid, fromUserName: userProfile.name, matchId: matchId, projectId: project.id, projectTitle: project.title, read: false });
      addNotification(user.uid, { type: 'match', fromUserId: interestedUser.uid, fromUserName: interestedUser.name, matchId: matchId, projectId: project.id, projectTitle: project.title, read: false });

      setMatchedInfo({ projectName: project.title, devName: interestedUser.name, matchId: matchId });
      setShowMatchModal(true);
      
      setInterestedUsersByProject(prev => ({ ...prev, [project.id]: prev[project.id]?.filter(u => u.uid !== interestedUser.uid) }));
      setMyProjects(prevProjects => prevProjects.map(p => p.id === project.id ? { ...p, interestedUsers: p.interestedUsers?.filter(uid => uid !== interestedUser.uid), matchedUsers: [...(p.matchedUsers || []), interestedUser.uid] } : p));
    } catch (error) {
      console.error("Failed to create match:", error);
      toast({ variant: 'destructive', title: 'Matching Failed', description: error instanceof Error ? error.message : 'Could not create a match. Please try again.' });
    }
  };

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

  const allLinks: ExternalLink[] = userProfile ? [
    userProfile.versionControl,
    userProfile.socials,
    userProfile.portfolioUrl ? { type: 'Portfolio', url: userProfile.portfolioUrl } : undefined,
    ...(userProfile.extraLinks || [])
  ].filter((link): link is ExternalLink => !!link?.url) : [];

  if (authLoading || loadingData || !userProfile) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-8">
          <Skeleton className="h-48 w-full" /><Skeleton className="h-64 w-full" /><Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-12">
        
        <div className="space-y-12">
          <Card>
            <CardHeader>
              <CardTitle>Your Profile</CardTitle><CardDescription>A quick glance at your current profile information.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row items-center gap-6">
              <Avatar className="w-24 h-24 border-4 border-background shadow-md"><AvatarImage src={userProfile.photoURL} alt={userProfile.name} /><AvatarFallback className="text-4xl">{getInitials(userProfile.name)}</AvatarFallback></Avatar>
              <div className="flex-1 text-center sm:text-left"><p className="font-bold text-2xl">{userProfile.name}</p><p className="text-muted-foreground">{userProfile.email}</p><p className="text-sm text-foreground/80 mt-2 line-clamp-2">{userProfile.bio || "You haven't added a bio yet."}</p></div>
              <Button variant="outline" className="w-full sm:w-auto flex-shrink-0" asChild><Link href="/profile"><Edit className="mr-2 h-4 w-4" />Edit Profile</Link></Button>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
                <CardTitle className="flex items-center gap-3"><Lightbulb className="h-6 w-6 text-yellow-400" /><span>AI-Powered Insights</span></CardTitle>
                <CardDescription>Analyze developers interested in your projects to uncover collaboration opportunities and profile improvement suggestions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
                {isAiInsightsLoading ? (
                    <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : aiInsights ? (
                    <>
                        <div><h4 className="font-semibold mb-1">Audience Summary</h4><p className="text-muted-foreground">{aiInsights.audienceSummary}</p></div>
                        <div><h4 className="font-semibold mb-1">Potential Opportunities</h4><p className="text-muted-foreground">{aiInsights.potentialGaps}</p></div>
                        <div className="p-3 bg-primary/10 rounded-md"><h4 className="font-semibold mb-1">Actionable Advice</h4><p className="text-foreground/90 font-medium">{aiInsights.actionableAdvice}</p></div>
                        <Button variant="ghost" size="sm" onClick={() => setAiInsights(null)} className="w-full mt-4">Generate New Insight</Button>
                    </>
                ) : (
                    <div className="text-center py-4">
                        <Button onClick={handleGenerateInsights} disabled={isAiInsightsLoading}>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Generate Insights
                        </Button>
                    </div>
                )}
            </CardContent>
          </Card>

          <section>
            <div className="flex items-center justify-between mb-6"><div className="flex items-center"><Briefcase className="h-7 w-7 text-primary mr-3" /><h2 className="text-3xl font-bold tracking-tight">My Projects</h2></div><Button variant="outline" asChild><Link href="/projects">View All <ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div>
            {myProjects.length > 0 ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">{myProjects.slice(0, 3).map(project => <ProjectCard key={project.id} project={project} />)}</div> : <div className="text-center py-16 border-2 border-dashed rounded-lg"><h3 className="text-xl font-semibold">You haven&apos;t created any projects yet.</h3><p className="text-muted-foreground mt-2 mb-4">Start your next big idea today!</p><Button asChild><Link href="/projects/new"><PlusCircle className="mr-2 h-4 w-4" />Create New Project</Link></Button></div>}
          </section>

          {myProjects.some(p => interestedUsersByProject[p.id]?.length > 0) && (
            <section>
              <h2 className="text-3xl font-bold tracking-tight mb-6 flex items-center"><UserCheck className="mr-3 h-7 w-7 text-primary"/>Collaboration Hub</h2>
              {myProjects.map(project => (
                interestedUsersByProject[project.id]?.length > 0 && (
                    <Card className="mb-6" key={project.id}>
                      <CardHeader><CardTitle className="flex items-center flex-wrap gap-3"><Hand className="h-5 w-5"/><span>Interested Developers for: <Link href={`/projects/${project.id}`} className="text-primary hover:underline">{project.title}</Link></span></CardTitle></CardHeader>
                      <CardContent><ul className="space-y-4">{interestedUsersByProject[project.id]?.map(interestedUser => <li key={interestedUser.uid} className="flex flex-col sm:flex-row items-center justify-between gap-4"><div className="flex items-center space-x-3"><Avatar><AvatarImage src={interestedUser.photoURL} /><AvatarFallback>{getInitials(interestedUser.name)}</AvatarFallback></Avatar><span>{interestedUser.name}</span></div><div className="flex items-center gap-2"><Button variant="outline" size="sm" asChild><Link href={`/developers/${interestedUser.uid}`}>View Profile</Link></Button><Button size="sm" onClick={() => handleMatch(project, interestedUser)}>Match</Button></div></li>)}</ul></CardContent>
                    </Card>
                )
              ))}
            </section>
          )}

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2">
            <section>
              <div className="flex items-center mb-6"><Eye className="h-7 w-7 text-primary mr-3" /><h2 className="text-3xl font-bold tracking-tight">Public Profile Preview</h2></div>
                <Card className="overflow-hidden">
                  <div className="bg-muted/40 p-8"><div className="flex flex-col md:flex-row items-start space-y-6 md:space-y-0 md:space-x-8"><Avatar className="h-32 w-32 border-4 border-background shadow-lg"><AvatarImage src={userProfile.photoURL} alt={userProfile.name} /><AvatarFallback className="text-5xl">{getInitials(userProfile.name)}</AvatarFallback></Avatar><div className="flex-1 pt-4"><h1 className="text-4xl font-bold">{userProfile.name}</h1><div className="flex items-center gap-4 mt-2 text-muted-foreground"><div className="flex items-center gap-2"><Clock className="h-4 w-4" /><span>{formatExperience(userProfile.yearsOfExperience)}</span></div></div></div><div>{userProfile.openForCollaboration ? <Badge variant="default" className="flex-shrink-0"><BadgeCheck className="mr-2 h-4 w-4"/>Open to Collab</Badge> : <Badge variant="secondary" className="flex-shrink-0"><BadgeX className="mr-2 h-4 w-4"/>Not seeking colabs</Badge>}</div></div></div>
                   <CardContent className="p-8 space-y-8">
                        <div><h3 className="text-xl font-semibold mb-2">About</h3><p className="text-foreground/80 leading-relaxed text-base">{userProfile.bio || 'No bio provided yet. Add one to attract collaborators!'}</p></div>
                        
                        {userProfile.openForCollaboration && (userProfile.collaborationGoals?.length || userProfile.commitmentLevel) && <Card><CardHeader><CardTitle className="flex items-center"><Handshake className="mr-2 h-5 w-5 text-primary"/> Collaboration Preferences</CardTitle></CardHeader><CardContent className="space-y-4 pt-4">{userProfile.collaborationGoals && userProfile.collaborationGoals.length > 0 && <div><h3 className="font-semibold mb-2 flex items-center"><Target className="mr-2 h-4 w-4"/> Goals</h3><div className="flex flex-wrap gap-2">{userProfile.collaborationGoals.map(goal => <Badge key={goal} variant="default">{goal}</Badge>)}</div></div>}{userProfile.commitmentLevel && <div><h3 className="font-semibold mb-2">Commitment</h3><p className="text-muted-foreground">{userProfile.commitmentLevel}</p></div>}</CardContent></Card>}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8"><div><h3 className="flex items-center text-xl font-semibold mb-4"><BrainCircuit className="mr-2 h-5 w-5" /> Skills</h3>{userProfile.skills && userProfile.skills.length > 0 ? <div className="flex flex-wrap gap-2">{userProfile.skills.map((skill) => <Badge key={skill} variant="secondary">{skill}</Badge>)}</div> : <p className="text-muted-foreground text-sm">No professional skills listed.</p>}</div><div><h3 className="flex items-center text-xl font-semibold mb-4"><Code className="mr-2 h-5 w-5" /> Tech Stack</h3>{userProfile.techStack && userProfile.techStack.length > 0 ? <div className="flex flex-wrap gap-2">{userProfile.techStack.map((tech) => <Badge key={tech} variant="outline">{tech}</Badge>)}</div> : <p className="text-muted-foreground text-sm">No technologies listed.</p>}</div></div>

                        {allLinks.length > 0 && <div><h3 className="flex items-center text-xl font-semibold mb-4"><LinkIcon className="mr-2 h-5 w-5"/> Links</h3><div className="flex flex-wrap gap-3">{allLinks.map((link, index) => <Button asChild key={index} variant="outline"><Link href={link.url} target="_blank" rel="noopener noreferrer"><span className="capitalize">{link.type}</span></Link></Button>)}</div></div>}

                       <div><h3 className="text-xl font-semibold mb-4">Projects</h3>{myProjects.length > 0 ? <div className="space-y-4">{myProjects.map(project => <Card key={project.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 gap-4"><div className="flex-1"><Link href={`/projects/${project.id}`} className="font-semibold hover:underline">{project.title}</Link><p className="text-sm text-muted-foreground line-clamp-1">{project.description}</p></div>{project.collaborationOpen ? <Badge variant="default" className='ml-4 flex-shrink-0'><BadgeCheck className="mr-2 h-4 w-4"/>Open to Collab</Badge> : <Badge variant="secondary" className='ml-4 flex-shrink-0'><BadgeX className="mr-2 h-4 w-4"/>Closed</Badge>}</Card>)}</div> : <p className="text-muted-foreground text-center py-4">No projects created yet.</p>}</div>
                  </CardContent>
                </Card>
            </section>
          </div>

          <div className="space-y-8">
            <section>
               <div className="flex items-center mb-6"><Users className="h-7 w-7 text-primary mr-3" /><h2 className="text-3xl font-bold tracking-tight">Connect with Developers</h2></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">{recommendedDevelopers.map(dev => <Card key={dev.uid} className="transition-all hover:shadow-md overflow-hidden"><CardContent className="p-4 flex items-center justify-start gap-4"><Avatar className="h-12 w-12 flex-shrink-0"><AvatarImage src={dev.photoURL} alt={dev.name} /><AvatarFallback>{getInitials(dev.name)}</AvatarFallback></Avatar><div className="flex-1 overflow-hidden"><p className="font-semibold truncate" title={dev.name}>{dev.name}</p></div><Button size="sm" variant="outline" asChild className="flex-shrink-0"><Link href={`/developers/${dev.uid}`}>Profile</Link></Button></CardContent></Card>)}</div>
                <div className="mt-6 text-center"><Button variant="secondary" asChild><Link href="/developers">Browse All Developers</Link></Button></div>
            </section>
          </div>
        </div>
      </div>
      <AlertDialog open={showMatchModal} onOpenChange={setShowMatchModal}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle className="text-center text-2xl">It's a Match!</AlertDialogTitle><AlertDialogDescription className="text-center">You and <span className="font-bold">{matchedInfo?.devName}</span> have matched for the project: <span className="font-bold">{matchedInfo?.projectName}</span>.</AlertDialogDescription></AlertDialogHeader><div className="flex justify-center py-4"><UserCheck className="h-16 w-16 text-green-500" /></div><AlertDialogFooter><AlertDialogCancel>Close</AlertDialogCancel><AlertDialogAction onClick={() => router.push(`/messages/${matchedInfo?.matchId}`)}><MessageSquare className="mr-2 h-4 w-4" />Send a Message</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
