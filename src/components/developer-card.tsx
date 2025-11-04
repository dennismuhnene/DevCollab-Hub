'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import type { UserProfile } from '@/types';
import { Button } from './ui/button';
import { ArrowRight } from 'lucide-react';

type DeveloperCardProps = {
  developer: UserProfile;
};

export default function DeveloperCard({ developer }: DeveloperCardProps) {
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0]).join('');
  };

  return (
    <Card className="h-full flex flex-col transition-all duration-300 hover:shadow-xl dark:hover:shadow-primary/20">
      <CardHeader className="flex-row items-center gap-4">
        <Avatar className="h-16 w-16 border-2 border-primary">
          <AvatarImage src={developer.photoURL} alt={developer.name} />
          <AvatarFallback className="text-2xl">{getInitials(developer.name)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <CardTitle className="text-xl font-bold leading-tight">{developer.name}</CardTitle>
          <CardDescription className="text-muted-foreground truncate">{developer.email}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between">
        <div>
          <p className="mb-4 text-sm text-foreground/80 line-clamp-3">
            {developer.bio || 'This developer has not added a bio yet.'}
          </p>
          <div className="mb-4">
            <h4 className="font-semibold text-sm mb-2">Skills</h4>
            <div className="flex flex-wrap gap-2">
              {developer.skills?.slice(0, 4).map((skill) => (
                <Badge key={skill} variant="secondary">{skill}</Badge>
              ))}
              {developer.skills && developer.skills.length > 4 && (
                <Badge variant="outline">+{developer.skills.length - 4} more</Badge>
              )}
            </div>
          </div>
        </div>
        <Button asChild variant="outline" className="w-full mt-4">
          <Link href={`/developers/${developer.uid}`}>
            View Profile <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
