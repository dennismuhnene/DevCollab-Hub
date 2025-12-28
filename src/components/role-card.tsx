'use client';

import { Role } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from './ui/badge';
import { DollarSign, Briefcase, MapPin } from 'lucide-react';

interface RoleCardProps {
  role: Role;
  isDiscoverMode?: boolean;
}

export default function RoleCard({ role, isDiscoverMode = false }: RoleCardProps) {
  return (
    <Card className="flex flex-col h-full bg-card hover:bg-muted/40 transition-colors">
      <CardHeader>
        <CardTitle className='text-lg'>{role.title}</CardTitle>
        <div className="flex flex-wrap gap-2 pt-2">
            {role.incentives && <Badge variant="secondary"><DollarSign className="h-3 w-3 mr-1"/>{role.incentives}</Badge>}
            {role.commitmentLevel && <Badge variant="secondary"><Briefcase className="h-3 w-3 mr-1"/>{role.commitmentLevel}</Badge>}
            {role.locations && role.locations[0] && <Badge variant="secondary"><MapPin className="h-3 w-3 mr-1"/>{role.locations[0]}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground line-clamp-3">{role.roleDescription}</p>
        <div className="flex flex-wrap gap-1 pt-3">
            {role.requiredTechStack?.slice(0, 3).map(tech => (
                <Badge key={tech} variant="outline" className="font-mono text-xs">{tech}</Badge>
            ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="default" className="w-full">
          View Role
        </Button>
      </CardFooter>
    </Card>
  );
}
