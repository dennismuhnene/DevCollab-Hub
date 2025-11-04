import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowRight, Users, Briefcase } from 'lucide-react';
import ProjectCard from '@/components/project-card';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { Project } from '@/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';

async function getFeaturedProjects(): Promise<Project[]> {
  const projectsCol = collection(db, 'projects');
  const q = query(projectsCol, orderBy('createdAt', 'desc'), limit(3));
  const querySnapshot = await getDocs(q);
  const projects = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
  
  if (projects.length < 3) {
    const placeholders: Project[] = [
      { id: 'placeholder-1', title: 'AI-Powered Chatbot', description: 'A cutting-edge chatbot for customer service.', ownerId: 'dev', requiredSkills: ['React', 'Node.js', 'AI'], imageUrl: PlaceHolderImages.find(p => p.id === 'project-1')?.imageUrl, interests: [], createdAt: null, updatedAt: null },
      { id: 'placeholder-2', title: 'E-commerce Platform', description: 'Build a scalable online store from scratch.', ownerId: 'dev', requiredSkills: ['Next.js', 'Stripe', 'GraphQL'], imageUrl: PlaceHolderImages.find(p => p.id === 'project-2')?.imageUrl, interests: [], createdAt: null, updatedAt: null },
      { id: 'placeholder-3', title: 'Mobile Fitness App', description: 'An app to track workouts and nutrition.', ownerId: 'dev', requiredSkills: ['React Native', 'Firebase'], imageUrl: PlaceHolderImages.find(p => p.id === 'project-3')?.imageUrl, interests: [], createdAt: null, updatedAt: null },
    ];
    const projectsNeeded = 3 - projects.length;
    return [...projects, ...placeholders.slice(0, projectsNeeded)];
  }

  return projects;
}

export default async function HomePage() {
  const featuredProjects = await getFeaturedProjects();
  const heroImage = PlaceHolderImages.find(p => p.id === 'hero-image');

  return (
    <>
      <section className="w-full py-20 md:py-32 lg:py-40 bg-gradient-to-b from-background to-secondary/50 dark:from-background dark:to-slate-900/50">
        <div className="container mx-auto max-w-7xl px-4 md:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            <div className="flex flex-col justify-center space-y-6">
              <div className="space-y-4">
                <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none font-headline">
                  Find Your Crew, Build Your Vision
                </h1>
                <p className="max-w-[600px] text-muted-foreground md:text-xl">
                  DevCollab Hub is the ultimate platform for developers to connect, collaborate, and create amazing projects together.
                </p>
              </div>
              <div className="flex flex-col gap-2 min-[400px]:flex-row">
                <Button asChild size="lg">
                  <Link href="/projects">
                    Browse Projects
                    <Briefcase className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild variant="secondary" size="lg">
                  <Link href="/signup">
                    Join the Community
                    <Users className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>
            {heroImage && (
              <div className="hidden lg:flex items-center justify-center">
                 <Image
                    src={heroImage.imageUrl}
                    alt={heroImage.description}
                    width={1200}
                    height={600}
                    className="rounded-xl shadow-2xl aspect-video object-cover"
                    priority
                    data-ai-hint={heroImage.imageHint}
                 />
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="w-full py-20 md:py-32">
        <div className="container mx-auto max-w-7xl px-4 md:px-8">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline">Featured Projects</h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Check out some of the exciting projects currently looking for collaborators.
              </p>
            </div>
          </div>
          <div className="mx-auto grid grid-cols-1 gap-8 py-12 sm:grid-cols-2 lg:grid-cols-3">
            {featuredProjects.map(project => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
          <div className="flex justify-center">
            <Button asChild variant="outline">
              <Link href="/projects">
                View All Projects <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
