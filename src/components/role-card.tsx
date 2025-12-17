'use client';

import { Role } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Badge } from './ui/badge';
import { DollarSign, Briefcase } from 'lucide-react';

interface RoleCardProps {
  role: Role;
}

export default function RoleCard({ role }: RoleCardProps) {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>{role.title}</CardTitle>
        <div className="flex flex-wrap gap-2 pt-2">
            {role.incentives && <Badge variant="outline"><DollarSign className="h-3 w-3 mr-1"/>{role.incentives}</Badge>}
            {role.commitmentLevel && <Badge variant="outline"><Briefcase className="h-3 w-3 mr-1"/>{role.commitmentLevel}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground line-clamp-3">{role.roleDescription}</p>
      </CardContent>
      <CardFooter>
        <Button asChild variant="default" className="w-full">
          <Link href={`/roles/edit/${role.id}`}>Edit Role</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
