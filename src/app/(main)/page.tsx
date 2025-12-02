'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowRight, Users, Briefcase, Bot, Handshake, Search, Code2 } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useAuth } from '@/lib/hooks/use-auth';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function HomePage() {
  const { loading, user } = useAuth();
  const heroImage = PlaceHolderImages.find(p => p.id === 'hero-image');
  const project1 = PlaceHolderImages.find(p => p.id === 'project-1');
  const project2 = PlaceHolderImages.find(p => p.id === 'project-2');
  const project3 = PlaceHolderImages.find(p => p.id === 'project-3');
  
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh bg-background text-foreground">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-background" />
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10" />
            <div className="absolute top-1/2 left-1/2 w-[50vw] h-[50vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[150px]" />
          </div>

          <div className="container mx-auto max-w-screen-xl px-4 md:px-8 text-center">
            <div className="flex flex-col items-center space-y-6">
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter !leading-tight animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                Find Your Crew, <br /> Build Your Vision
              </h1>
              <p className="max-w-2xl text-muted-foreground md:text-xl animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                DevCollab Hub is the ultimate platform for developers to connect, collaborate, and create amazing projects together.
              </p>
              <div className="flex flex-col gap-4 min-[400px]:flex-row animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                <Button asChild size="lg" className="shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow">
                  <Link href={user ? "/developers" : "/login"}>
                    Explore Collaborators
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                {!user && (
                    <Button asChild variant="secondary" size="lg" className="shadow-lg shadow-secondary/20 hover:shadow-secondary/40 transition-shadow">
                    <Link href="/signup">
                        Join the Hub
                    </Link>
                    </Button>
                )}
              </div>
            </div>
            {heroImage && (
              <div className="mt-20 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                 <div className="relative group aspect-video max-w-4xl mx-auto rounded-xl shadow-2xl shadow-primary/10 border border-border overflow-hidden">
                    <Image
                        src={heroImage.imageUrl}
                        alt={heroImage.description}
                        width={1200}
                        height={600}
                        className="rounded-xl object-cover transition-transform duration-500 group-hover:scale-105"
                        priority
                        data-ai-hint={heroImage.imageHint}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                 </div>
              </div>
            )}
          </div>
        </section>

        {/* Features Section */}
        <section id="how-it-works" className="w-full py-20 md:py-32">
          <div className="container mx-auto max-w-screen-xl px-4 md:px-8">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">How It Works</h2>
              <p className="max-w-2xl mx-auto text-muted-foreground md:text-xl">
                Connecting with collaborators is as easy as 1, 2, 3.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { icon: Search, title: '1. Discover', description: 'Browse through a diverse range of developer profiles and exciting projects seeking collaboration.' },
                { icon: Handshake, title: '2. Connect', description: 'Show interest in projects or reach out to developers whose skills match your needs.' },
                { icon: Bot, title: '3. Build', description: 'Use our AI-powered tools to streamline your workflow and bring your shared vision to life.' }
              ].map((feature, index) => (
                 <Card key={index} className="relative overflow-hidden bg-card/50 border-border/50 hover:border-primary/50 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-glow animate-fade-in-up" style={{ animationDelay: `${0.2 + index * 0.1}s`}}>
                    <CardContent className="p-8 text-center flex flex-col items-center">
                        <div className="mb-6 bg-primary/10 p-4 rounded-full border border-primary/20">
                            <feature.icon className="h-10 w-10 text-primary" />
                        </div>
                        <h3 className="text-2xl font-bold mb-2">{feature.title}</h3>
                        <p className="text-muted-foreground">{feature.description}</p>
                    </CardContent>
                 </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Projects */}
        <section id="features" className="w-full py-20 md:py-32 bg-background/50">
          <div className="container mx-auto max-w-screen-xl px-4 md:px-8">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">Featured Projects</h2>
              <p className="max-w-2xl mx-auto text-muted-foreground md:text-xl">
                Check out some of the exciting projects currently looking for collaborators.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[project1, project2, project3].map((project, index) => project && (
                  <Card key={index} className="h-full bg-card/50 border-border/50 flex flex-col group overflow-hidden transform transition-all duration-300 hover:scale-105 hover:shadow-glow hover:border-secondary/50 animate-fade-in-up" style={{ animationDelay: `${0.4 + index * 0.1}s` }}>
                      <CardContent className="p-0">
                          <div className="aspect-video w-full overflow-hidden">
                              <Image
                                  src={project.imageUrl}
                                  alt={project.description}
                                  width={600}
                                  height={400}
                                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                  data-ai-hint={project.imageHint}
                              />
                          </div>
                      </CardContent>
                      <div className="p-6 flex-grow flex flex-col">
                          <h3 className="mb-2 text-xl font-bold leading-tight">
                            {index === 0 && 'AI-Powered Chatbot'}
                            {index === 1 && 'E-commerce Platform'}
                            {index === 2 && 'Mobile Fitness App'}
                          </h3>
                          <p className="mb-4 line-clamp-2 flex-grow text-muted-foreground">
                            {index === 0 && 'A cutting-edge chatbot for customer service.'}
                            {index === 1 && 'Build a scalable online store from scratch.'}
                            {index === 2 && 'An app to track workouts and nutrition.'}
                          </p>
                          <div className="flex flex-wrap gap-2 pt-2">
                              {index === 0 && <><Badge variant="outline">React</Badge><Badge variant="outline">Node.js</Badge><Badge variant="outline">AI</Badge></>}
                              {index === 1 && <><Badge variant="outline">Next.js</Badge><Badge variant="outline">Stripe</Badge><Badge variant="outline">GraphQL</Badge></>}
                              {index === 2 && <><Badge variant="outline">React Native</Badge><Badge variant="outline">Firebase</Badge></>}
                          </div>
                      </div>
                  </Card>
              ))}
            </div>
             <div className="flex justify-center mt-12 animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
              <Button asChild variant="outline">
                <Link href="/projects">
                  View All Projects <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
        
        {/* CTA Section */}
        <section id="cta" className="w-full py-20 md:py-32">
          <div className="container mx-auto max-w-screen-xl px-4 md:px-8">
            <div className="relative isolate overflow-hidden rounded-2xl bg-primary/90 px-6 py-24 text-center shadow-2xl sm:px-16 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
                Ready to Start Your Next Project?
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-primary-foreground/80">
                Join a community of innovators. Find your perfect collaborator and bring your ideas to life. Your journey starts here.
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                <Button asChild size="lg" variant="secondary">
                  <Link href={user ? "/projects/new" : "/signup"}>Get Started</Link>
                </Button>
                <Button asChild size="lg" variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                  <Link href="/developers">Learn more <span aria-hidden="true">→</span></Link>
                </Button>
              </div>
              <svg viewBox="0 0 1024 1024" className="absolute left-1/2 top-1/2 -z-10 h-[64rem] w-[64rem] -translate-x-1/2 [mask-image:radial-gradient(closest-side,white,transparent)]" aria-hidden="true">
                <circle cx="512" cy="512" r="512" fill="url(#gradient-cta)" fillOpacity="0.7"></circle>
                <defs>
                  <radialGradient id="gradient-cta">
                    <stop stopColor="#9D4EDD"></stop>
                    <stop offset="1" stopColor="#4F3A93"></stop>
                  </radialGradient>
                </defs>
              </svg>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
