'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ArrowRight, Bot, Handshake, Search, Zap, Lightbulb, BrainCircuit, Rocket, Package } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useAuth } from '@/lib/hooks/use-auth';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import SocialIcons from '@/components/ui/social-icons';
import ContactForm from '@/components/contact-form';

const WavyDivider = ({ className }: { className?: string }) => (
    <div className={cn("absolute bottom-0 left-0 w-full overflow-hidden leading-none", className)} >
        <svg
            data-name="Layer 1"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
            className="relative block h-[60px] md:h-[120px] w-[calc(100%+1.3px)]"
        >
            <path
                d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"
                className="fill-background"
            ></path>
        </svg>
    </div>
);


const WavyDividerInverted = ({ className }: { className?: string }) => (
    <div className={cn("absolute top-0 left-0 w-full overflow-hidden leading-none", className)}>
        <svg
            data-name="Layer 1"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
            className="relative block h-[60px] md:h-[120px] w-[calc(100%+1.3px)]"
        >
            <path
                d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"
                className="fill-background"
            ></path>
        </svg>
    </div>
);

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
    },
  },
};


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
      <SocialIcons />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full flex items-center justify-center text-center overflow-hidden bg-background">
          <div className="relative w-full h-[80vh]">
            {heroImage && (
                <div className="relative w-full h-full">
                    <Image
                        src={heroImage.imageUrl}
                        alt={heroImage.description}
                        fill
                        className="object-cover object-center"
                        quality={100}
                        data-ai-hint={heroImage.imageHint}
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />
                </div>
            )}
            <motion.div 
              className="absolute inset-0 flex flex-col items-center justify-center text-white p-4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
                <div className="container mx-auto max-w-screen-xl px-4 md:px-8">
                  <motion.h1 variants={itemVariants}>
                    From Idea to Impact: <br /> Build What's Next, Together.
                  </motion.h1>
                  <motion.p variants={itemVariants} className="max-w-3xl mx-auto text-base mt-4">
                    DevCollab Hub is the premier platform for creators, developers and product experts to connect, collaborate and transform innovative projects into market-ready products.
                  </motion.p>
                  <motion.div variants={itemVariants} className="mt-8 flex flex-col items-center gap-4 min-[400px]:flex-row justify-center">
                    <Button asChild size="lg" className="shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow">
                      <Link href={user ? "/developers" : "/login"}>
                        Let's Collaborate
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
                  </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <motion.section 
          id="how-it-works" 
          className="relative w-full py-20 md:py-32 bg-background"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={containerVariants}
        >
          <motion.div variants={itemVariants} className="container mx-auto max-w-screen-xl px-4 md:px-8">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-2xl font-semibold leading-none tracking-tight">How It Works</h2>
              <p className="max-w-2xl mx-auto text-muted-foreground text-base">
                Find your crew, build your vision
              </p>
            </div>
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
              variants={containerVariants}
            >
              {[
                { icon: Search, title: '1. Discover', description: 'Explore a curated ecosystem of projects, roles and build a skilled team. Our intelligent platform helps you find the perfect tribe.' },
                { icon: Handshake, title: '2. Connect', description: 'Initiate meaningful collaborations by expressing interest. The tribal chief will review and match with the best-fit for their vision.' },
                { icon: Rocket, title: '3. Build & Launch', description: "Use the messaging feature to align on goals, share ideas and begin your collaboration. It's time to build your vision and bring it to life, from idea to project to distribution." }
              ].map((feature, index) => (
                 <motion.div key={index} variants={itemVariants} whileHover={{ y: -8, transition: { duration: 0.2 } }}>
                   <Card className="relative overflow-hidden h-full bg-white/10 backdrop-blur-sm border-white/20 hover:border-primary/50 transition-all duration-300 transform hover:shadow-glow">
                      <CardContent className="p-8 text-center flex flex-col items-center">
                          <div className="mb-6 bg-primary/10 p-4 rounded-full border border-primary/20">
                              <feature.icon className="h-10 w-10 text-primary" />
                          </div>
                          <h3 className="text-base font-bold mb-2">{feature.title}</h3>
                          <p className="text-base text-muted-foreground">{feature.description}</p>
                      </CardContent>
                   </Card>
                 </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </motion.section>

        {/* Featured Projects */}
        <motion.section 
          id="features" 
          className="relative w-full pt-28 md:pt-40 pb-20 md:pb-32 bg-muted/20"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={containerVariants}
        >
          <WavyDividerInverted className="fill-muted/20" />
          <motion.div variants={itemVariants} className="container mx-auto max-w-screen-xl px-4 md:px-8">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-2xl font-semibold leading-none tracking-tight">Featured</h2>
              <p className="max-w-2xl mx-auto text-muted-foreground text-base">
                Check out some cool projects in the hub.
              </p>
            </div>
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
              variants={containerVariants}
            >
              {[project1, project2, project3].map((project, index) => project && (
                  <motion.div key={index} variants={itemVariants} whileHover={{ scale: 1.05 }}>
                    <Card className="h-full bg-card/50 border-border/50 flex flex-col group overflow-hidden transform transition-all duration-300">
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
                            <h3 className="mb-2 text-base font-bold leading-tight">
                              {index === 0 && 'AI-Powered Chatbot'}
                              {index === 1 && 'E-commerce Platform'}
                              {index === 2 && 'Mobile Fitness App'}
                            </h3>
                            <p className="mb-4 line-clamp-2 flex-grow text-base text-muted-foreground">
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
                  </motion.div>
              ))}
            </motion.div>
             <motion.div variants={itemVariants} className="flex justify-center mt-12">
              <Button asChild variant="outline">
                <Link href="/developers">
                   Check it Out<ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </motion.div>
          </motion.div>
          <WavyDivider className="fill-background" />
        </motion.section>

        {/* Build your Tribe Section */}
        <motion.section
          id="potential"
          className="relative w-full py-20 md:py-32 bg-background"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={containerVariants}
        >
          <div className="container mx-auto max-w-screen-xl px-4 md:px-8">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-2xl font-semibold leading-none tracking-tight">Build your Tribe</h2>
              <p className="max-w-2xl mx-auto text-muted-foreground text-base">
                Discover the tools and connections to bring your boldest ideas to life.
              </p>
            </div>
            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
              variants={containerVariants}
            >
              {[
                {
                  icon: BrainCircuit,
                  title: 'Intelligent Connection Engine',
                  description: 'Intelligently identify the tribe, projects and roles that match your skills and ambitions, sparking impactful partnerships that bring great ideas to life.',
                },
                {
                  icon: Zap,
                  title: 'Seamless Collaboration',
                  description: 'Move from idea to execution in a frictionless environment with integrated tools that keep you focused on building, not on administrative tasks.',
                },
                {
                  icon: Package,
                  title: 'From Project to Product to distribution',
                  description: 'Gain the support, structure and collaborative power to transform your project from a great idea into a market-ready, valuable product.',
                },
              ].map((feature, index) => (
                <motion.div key={index} variants={itemVariants}>
                  <Card className="relative overflow-hidden h-full bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl border border-white/20 hover:border-primary/50 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-glow">
                    <CardContent className="p-8 text-center flex flex-col items-center">
                      <div className="mb-6 bg-gradient-to-br from-yellow-400/20 to-orange-500/20 p-4 rounded-full border border-orange-400/30">
                        <feature.icon className="h-10 w-10 text-orange-400" />
                      </div>
                      <h3 className="text-base font-bold mb-2">{feature.title}</h3>
                      <p className="text-base text-muted-foreground">{feature.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.section>

        {/* About Us Section */}
        <motion.section
          id="about-us"
          className="relative w-full pt-28 md:pt-40 pb-28 md:pb-40 bg-muted/20"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={containerVariants}
        >
           <WavyDividerInverted className="fill-muted/20" />
          <div className="container mx-auto max-w-screen-xl px-4 md:px-8">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-2xl font-semibold leading-none tracking-tight">About Us</h2>
              <p className="max-w-2xl mx-auto text-muted-foreground text-base">
                Curious about what sets us apart? Here are some answers.
              </p>
            </div>
            <motion.div variants={itemVariants} className="max-w-3xl mx-auto">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger className="text-lg hover:text-primary transition-colors">What distinguishes us?</AccordionTrigger>
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        transition={{ duration: 0.5, ease: 'easeInOut' }}
                    >
                        <AccordionContent className="text-base text-muted-foreground pt-2">
                           We are a dedicated ecosystem that provides the strategic framework to connect you with your perfect collaborators, cut through the noise and foster long-term partnerships that build, launch and scale your products at every stage—while growing the tribe that drives your success. 
                        </AccordionContent>
                    </motion.div>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger className="text-lg hover:text-primary transition-colors">How do insights work?</AccordionTrigger>
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        transition={{ duration: 0.5, ease: 'easeInOut' }}
                    >
                        <AccordionContent className="text-base text-muted-foreground pt-2">
                            Gain a strategic advantage in team building. Our platform provides a holistic view of your potential collaborators and provide an avenue to engage with them. This helps you identify the right tribe and uncover hidden opportunities beyond product creation- enabling you find the right talent for your growth and development of your product and its distribution to the target market.
                        </AccordionContent>
                    </motion.div>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger className="text-lg hover:text-primary transition-colors">Is it just for coders?</AccordionTrigger>
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        transition={{ duration: 0.5, ease: 'easeInOut' }}
                    >
                        <AccordionContent className="text-base text-muted-foreground pt-2">
                            DevCollab Hub is for all creators in the tech space. Whether you're a designer, a project manager, a data scientist, product manager, Marketing, finance and branding expert or a visionary, you'll find your place here.
                        </AccordionContent>
                    </motion.div>
                </AccordionItem>
                <AccordionItem value="item-4">
                  <AccordionTrigger className="text-lg hover:text-primary transition-colors">What kind of projects and roles can I find?</AccordionTrigger>
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        transition={{ duration: 0.5, ease: 'easeInOut' }}
                    >
                        <AccordionContent className="text-base text-muted-foreground pt-2">
                            From open-source initiatives, school projects and personal projects to stealth-mode startups building the future, the depth of DevCollab Hub is as diverse as our community. The only limit is your imagination.
                        </AccordionContent>
                    </motion.div>
                </AccordionItem>
                <AccordionItem value="item-5">
                  <AccordionTrigger className="text-lg hover:text-primary transition-colors">What if I need to find a tribe but want to keep it on the down low?</AccordionTrigger>
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        transition={{ duration: 0.5, ease: 'easeInOut' }}
                    >
                        <AccordionContent className="text-base text-muted-foreground pt-2">
                            That's what <strong>Roles</strong> are for. You can create a Role to post a specific need, like 'I am looking for a study partner to build projects together' without exposing much about your idea or project. They remain confidential (your business) until you choose to share it with a matched collaborator after a chat.
                        </AccordionContent>
                    </motion.div>
                </AccordionItem>
              </Accordion>
            </motion.div>
          </div>
          <WavyDivider className="fill-background" />
        </motion.section>

        {/* CTA Section */}
        <motion.section
          id="cta"
          className="relative w-full py-20 md:py-32 bg-background"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.5 }}
        >
          <div className="container mx-auto max-w-screen-xl px-4 md:px-8">
            <motion.div
              className="relative isolate overflow-hidden rounded-2xl bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 px-6 py-24 text-center shadow-2xl sm:px-16"
              whileHover={{ scale: 1.05, boxShadow: '0px 10px 30px -5px rgba(255, 165, 0, 0.4)' }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="mx-auto max-w-2xl text-2xl font-semibold leading-none tracking-tight text-white [text-shadow:0_2px_4px_rgba(0,0,0,0.4)]">
                Ready to Build What's Next?
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-base text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.2)]">
              Sometimes you don't have the time to build everything, sometimes you don't know how and where to find the technical team to build a feature; or sometimes you need to maybe iterate your MVP, or you wanna find better ways to reach your target market and sometimes there are legalese you wanna figure out etc...That's the tribe you are missing. That's what this platfrom is about. Join a community of innovators and builders. Find your perfect tribe and transform your vision into a real-world product.
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                <Button asChild size="lg" className="bg-white text-orange-500 hover:bg-gray-100 shadow-lg">
                  <Link href={user ? "/projects/new" : "/signup"}>Get Started</Link>
                </Button>
              </div>
              <motion.svg
                viewBox="0 0 1024 1024"
                className="absolute left-1/2 top-1/2 -z-10 h-[64rem] w-[64rem] -translate-x-1/2 [mask-image:radial-gradient(closest-side,white,transparent)]"
                aria-hidden="true"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1.2, transition: { duration: 1, ease: 'easeInOut' } }}
              >
                <circle cx="512" cy="512" r="512" fill="url(#gradient-cta-gold)" fillOpacity="0.7"></circle>
                <defs>
                  <radialGradient id="gradient-cta-gold">
                    <stop stopColor="#FFD700"></stop>
                    <stop offset="1" stopColor="#FFA500"></stop>
                  </radialGradient>
                </defs>
              </motion.svg>
            </motion.div>
          </div>
        </motion.section>
        <ContactForm />
      </main>
    </div>
  );
}
