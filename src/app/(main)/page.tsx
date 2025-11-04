'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowRight, Users, Briefcase, Bot, Handshake, Search, Code2 } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useAuth } from '@/lib/hooks/use-auth';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const { loading, user } = useAuth();
  const heroImage = PlaceHolderImages.find(p => p.id === 'hero-image');
  const project1 = PlaceHolderImages.find(p => p.id === 'project-1');
  const project2 = PlaceHolderImages.find(p => p.id === 'project-2');
  const project3 = PlaceHolderImages.find(p => p.id === 'project-3');
  
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
    <main className="flex-1">
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
                {!user && (
                    <Button asChild variant="secondary" size="lg">
                    <Link href="/signup">
                        Join the Community
                        <Users className="ml-2 h-5 w-5" />
                    </Link>
                    </Button>
                )}
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

      <section id="how-it-works" className="w-full py-20 md:py-32">
          <div className="container mx-auto max-w-7xl px-4 md:px-8">
            <div className="text-center space-y-4 mb-12">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline">How It Works</h2>
              <p className="max-w-2xl mx-auto text-muted-foreground md:text-xl">
                Connecting with collaborators is as easy as 1, 2, 3.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div className="flex flex-col items-center space-y-4">
                <div className="bg-primary/10 p-4 rounded-full">
                  <Search className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-2xl font-bold">1. Discover</h3>
                <p className="text-muted-foreground">Browse through a diverse range of developer profiles and exciting projects seeking collaboration.</p>
              </div>
              <div className="flex flex-col items-center space-y-4">
                <div className="bg-primary/10 p-4 rounded-full">
                  <Handshake className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-2xl font-bold">2. Connect</h3>
                <p className="text-muted-foreground">Show interest in projects or reach out to developers whose skills match your needs.</p>
              </div>
              <div className="flex flex-col items-center space-y-4">
                <div className="bg-primary/10 p-4 rounded-full">
                  <Bot className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-2xl font-bold">3. Build</h3>
                <p className="text-muted-foreground">Use our AI-powered tools to streamline your workflow and bring your shared vision to life.</p>
              </div>
            </div>
          </div>
      </section>

      <section id="features" className="w-full py-20 md:py-32 bg-secondary/50">
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
            {/* Placeholder content */}
            {project1 && (
              <div className="block h-full">
                <div className="h-full transform transition-all duration-300 hover:scale-105 hover:shadow-xl dark:hover:shadow-primary/20 flex flex-col rounded-lg border bg-card text-card-foreground shadow-sm">
                  <div className="p-0">
                    <div className="aspect-[3/2] w-full overflow-hidden rounded-t-lg">
                      <Image
                        src={project1.imageUrl}
                        alt="AI-Powered Chatbot"
                        width={600}
                        height={400}
                        className="h-full w-full object-cover"
                        data-ai-hint={project1.imageHint}
                      />
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <div className="mb-2 text-xl font-bold leading-tight">AI-Powered Chatbot</div>
                    <div className="mb-4 line-clamp-3 flex-grow text-muted-foreground">
                      A cutting-edge chatbot for customer service.
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">React</div>
                      <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">Node.js</div>
                      <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">AI</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
             {project2 && (
              <div className="block h-full">
                <div className="h-full transform transition-all duration-300 hover:scale-105 hover:shadow-xl dark:hover:shadow-primary/20 flex flex-col rounded-lg border bg-card text-card-foreground shadow-sm">
                  <div className="p-0">
                    <div className="aspect-[3/2] w-full overflow-hidden rounded-t-lg">
                      <Image
                        src={project2.imageUrl}
                        alt="E-commerce Platform"
                        width={600}
                        height={400}
                        className="h-full w-full object-cover"
                        data-ai-hint={project2.imageHint}
                      />
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <div className="mb-2 text-xl font-bold leading-tight">E-commerce Platform</div>
                    <div className="mb-4 line-clamp-3 flex-grow text-muted-foreground">
                      Build a scalable online store from scratch.
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                       <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">Next.js</div>
                       <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">Stripe</div>
                       <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">GraphQL</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
             {project3 && (
              <div className="block h-full">
                <div className="h-full transform transition-all duration-300 hover:scale-105 hover:shadow-xl dark:hover:shadow-primary/20 flex flex-col rounded-lg border bg-card text-card-foreground shadow-sm">
                  <div className="p-0">
                    <div className="aspect-[3/2] w-full overflow-hidden rounded-t-lg">
                      <Image
                        src={project3.imageUrl}
                        alt="Mobile Fitness App"
                        width={600}
                        height={400}
                        className="h-full w-full object-cover"
                        data-ai-hint={project3.imageHint}
                      />
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <div className="mb-2 text-xl font-bold leading-tight">Mobile Fitness App</div>
                    <div className="mb-4 line-clamp-3 flex-grow text-muted-foreground">
                      An app to track workouts and nutrition.
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                       <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">React Native</div>
                       <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">Firebase</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
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

      <section id="about" className="w-full py-20 md:py-32">
        <div className="container mx-auto max-w-7xl px-4 md:px-8">
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline">About DevCollab Hub</h2>
                    <p className="mt-4 max-w-3xl text-muted-foreground md:text-xl">
                        DevCollab Hub was born from a simple idea: developers are stronger together. We believe that the best-in-class products are built by teams with diverse skills and a shared passion. Our mission is to break down the barriers to collaboration, making it easier than ever for developers to find each other, share ideas, and build the future of technology.
                    </p>
                    <p className="mt-4 max-w-3xl text-muted-foreground md:text-xl">
                        Whether you're a student looking for a project partner, a professional seeking a new challenge, or a hobbyist with a brilliant idea, DevCollab Hub is your launchpad.
                    </p>
                </div>
                <div className="hidden lg:flex items-center justify-center">
                    <Image
                        src="https://picsum.photos/seed/about/1200/800"
                        alt="A team of developers collaborating"
                        width={1200}
                        height={800}
                        className="rounded-xl shadow-2xl aspect-video object-cover"
                        data-ai-hint="team collaboration"
                    />
                </div>
            </div>
        </div>
      </section>

      </main>
      <footer className="bg-background border-t">
        <div className="container mx-auto max-w-7xl px-4 md:px-8 py-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
                <div className="flex items-center space-x-2">
                    <Code2 className="h-6 w-6 text-primary" />
                    <span className="font-bold">DevCollab Hub</span>
                </div>
                <p className="text-muted-foreground text-sm mt-4 md:mt-0">
                    &copy; {new Date().getFullYear()} DevCollab Hub. All rights reserved.
                </p>
                <div className="flex space-x-4 mt-4 md:mt-0">
                    <Link href="#" className="text-muted-foreground hover:text-primary">Privacy Policy</Link>
                    <Link href="#" className="text-muted-foreground hover:text-primary">Terms of Service</Link>
                </div>
            </div>
        </div>
      </footer>
    </div>
  );
}
