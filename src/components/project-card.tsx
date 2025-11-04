import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import type { Project } from '@/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';

type ProjectCardProps = {
  project: Project;
};

export default function ProjectCard({ project }: ProjectCardProps) {
  const defaultProjectImage = PlaceHolderImages.find(p => p.id === 'project-1')?.imageUrl || "https://picsum.photos/seed/default/600/400";
  
  return (
    <Link href={`/projects/${project.id}`} className="block h-full">
      <Card className="h-full transform transition-all duration-300 hover:scale-105 hover:shadow-xl dark:hover:shadow-primary/20 flex flex-col">
        <CardHeader className="p-0">
          <div className="aspect-[3/2] w-full overflow-hidden rounded-t-lg">
            <Image
              src={project.imageUrl || defaultProjectImage}
              alt={project.title}
              width={600}
              height={400}
              className="h-full w-full object-cover"
              data-ai-hint="technology code"
            />
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col p-6">
          <CardTitle className="mb-2 text-xl font-bold leading-tight">{project.title}</CardTitle>
          <CardDescription className="mb-4 line-clamp-3 flex-grow text-muted-foreground">
            {project.description}
          </CardDescription>
          <div className="flex flex-wrap gap-2 pt-2">
            {project.requiredSkills?.slice(0, 4).map((skill) => (
              <Badge key={skill} variant="secondary">{skill}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
