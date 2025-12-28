'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card';
import { Badge } from './ui/badge';
import type { Project, UserProfile } from '@/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { BrainCircuit, Code } from 'lucide-react';

type OwnedProjectCardProps = {
  project: Project;
  owner?: UserProfile | null;
};

export default function OwnedProjectCard({ project, owner }: OwnedProjectCardProps) {
  const defaultProjectImage = PlaceHolderImages.find(p => p.id === 'project-1')?.imageUrl || "https://picsum.photos/seed/default/600/400";

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0]).join('');
  };

  const href = `/projects/${project.id}/edit`;

  const cardContent = (
    <Card className={`h-full transform transition-all duration-300 flex flex-col hover:shadow-xl dark:hover:shadow-primary/20`}>
        <CardHeader className="p-0">
          <div className="aspect-[3/2] w-full overflow-hidden rounded-t-lg">
            <Image
              src={project.imageUrl || defaultProjectImage}
              alt={project.title || 'Project image'}
              width={600}
              height={400}
              className="h-full w-full object-cover"
              data-ai-hint="technology code"
            />
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col p-6">
          <CardTitle className="mb-2 text-xl font-bold leading-tight">{project.title}</CardTitle>
          <CardDescription className="mb-4 line-clamp-2 flex-grow text-muted-foreground">
            {project.description}
          </CardDescription>
          <div className="space-y-3 pt-2">
            <div>
              <h4 className="font-semibold text-xs mb-2 flex items-center gap-1.5"><Code className="w-3.5 h-3.5" /> Tech Stack</h4>
              <div className="flex flex-wrap gap-1.5">
                {project.requiredTechStack?.slice(0, 4).map((tech, index) => (
                  <Badge key={`${tech}-${index}`} variant="secondary">{tech}</Badge>
                ))}
                {project.requiredTechStack && project.requiredTechStack.length > 4 && (
                    <Badge variant="outline">+{project.requiredTechStack.length - 4} more</Badge>
                )}
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-xs mb-2 flex items-center gap-1.5"><BrainCircuit className="w-3.5 h-3.5" /> Skills</h4>
              <div className="flex flex-wrap gap-1.5">
                {project.requiredSkills?.slice(0, 3).map((skill, index) => (
                  <Badge key={`${skill}-${index}`} variant="outline">{skill}</Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      {owner && (
        <CardFooter className="p-4 pt-0 border-t mt-4">
            <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                <AvatarImage src={owner.photoURL} alt={owner.name || 'Owner avatar'} />
                <AvatarFallback>{getInitials(owner.name)}</AvatarFallback>
                </Avatar>
                <div>
                    <p className="text-sm font-semibold">{owner.name}</p>
                    <p className="text-xs text-muted-foreground">Project Owner</p>
                </div>
            </div>
        </CardFooter>
      )}
    </Card>
  );

  return (
    <Link href={href} className="block h-full" style={{ textDecoration: 'none' }}>
      {cardContent}
    </Link>
  );
}
