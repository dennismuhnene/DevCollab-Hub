'use client';

import { Role as Post } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Badge } from './ui/badge';
import { DollarSign, Briefcase, MapPin } from 'lucide-react';

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  return (
    <Card className="flex flex-col h-full bg-card hover:bg-muted/40 transition-colors">
      <CardHeader>
        <CardTitle className='text-lg'>{post.title}</CardTitle>
        <div className="flex flex-wrap gap-2 pt-2">
            {post.incentives && <Badge variant="secondary"><DollarSign className="h-3 w-3 mr-1"/>{post.incentives}</Badge>}
            {post.commitmentLevel && <Badge variant="secondary"><Briefcase className="h-3 w-3 mr-1"/>{post.commitmentLevel}</Badge>}
            {post.locations && post.locations[0] && <Badge variant="secondary"><MapPin className="h-3 w-3 mr-1"/>{post.locations[0]}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground line-clamp-3">{post.roleDescription}</p>
        <div className="flex flex-wrap gap-1 pt-3">
            {post.requiredTechStack?.slice(0, 3).map(tech => (
                <Badge key={tech} variant="outline" className="font-mono text-xs">{tech}</Badge>
            ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild variant="default" className="w-full">
          <Link href={`/posts/${post.id}`}>View Post</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
