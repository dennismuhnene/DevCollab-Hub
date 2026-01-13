'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import type { UserProfile } from '@/types';
import { Button } from './ui/button';
import { ArrowRight } from 'lucide-react';

type DeveloperCardProps = {
  developer: UserProfile;
  isAdvisor?: boolean;
};

export default function DeveloperCard({ developer, isAdvisor }: DeveloperCardProps) {
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0]).join('');
  };

  return (
    <Card className="h-full flex flex-col transition-all duration-300 hover:shadow-xl dark:hover:shadow-primary/20 relative">
        {isAdvisor && (
            <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full h-6 w-6 flex items-center justify-center text-sm font-bold z-10">
                A
            </div>
        )}
      <CardHeader className="flex-row items-center gap-2">
        <Avatar className="h-16 w-16 border-2 border-primary">
          <AvatarImage src={developer.photoURL} alt={developer.name} />
          <AvatarFallback className="text-2xl">{getInitials(developer.name)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <CardTitle className="text-xl font-bold leading-tight">{developer.name}</CardTitle>
          {developer.location && (
            <p className="text-sm text-muted-foreground">{developer.location}</p>
          )}
          {developer.openForCollaboration && (
            <CardDescription className="text-primary font-semibold">Open to Collab</CardDescription>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between">
        <div>
          <p className="mb-4 text-sm text-foreground/80 line-clamp-3">
            {developer.bio || 'This developer has not added a bio yet.'}
          </p>
          <div className="mb-4">
            <h4 className="font-semibold text-sm mb-2">Tech Stack</h4>
            <div className="flex flex-wrap gap-1">
              {developer.techStack?.slice(0, 4).map((tech) => (
                <Badge key={tech} variant="secondary">{tech}</Badge>
              ))}
              {developer.techStack && developer.techStack.length > 4 && (
                <Badge variant="outline">+{developer.techStack.length - 4} more</Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
