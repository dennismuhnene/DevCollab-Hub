'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card';
import { Badge } from './ui/badge';
import type { BlogPost } from '@/types/blog';
import { format } from 'date-fns';
import { ArrowRight } from 'lucide-react';

type BlogCardProps = {
  post: BlogPost;
};

function stripHtml(html: string) {
    if (typeof window === 'undefined') {
        return html.replace(/<[^>]*>?/gm, '');
    }
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
}


export default function BlogCard({ post }: BlogCardProps) {
  const excerpt = post.excerpt || stripHtml(post.content).substring(0, 150) + '...';

  return (
    <Card className="h-full transform transition-all duration-300 hover:shadow-xl dark:hover:shadow-primary/20 flex flex-col group">
        <Link href={`/blogs/${post.id}`} className="block h-full flex flex-col">
            <CardHeader className="p-0">
                <div className="aspect-[16/9] w-full overflow-hidden rounded-t-lg">
                    <Image
                        src={post.imageUrl || 'https://picsum.photos/seed/blog/600/400'}
                        alt={post.title}
                        width={600}
                        height={400}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col p-6">
                {post.category && <Badge variant="secondary" className="mb-2 w-fit">{post.category}</Badge>}
                <CardTitle className="mb-2 text-xl font-bold leading-tight">{post.title}</CardTitle>
                <p className="mb-4 line-clamp-3 flex-grow text-foreground/80">
                    {excerpt}
                </p>
            </CardContent>
            <CardFooter className="p-6 pt-0 flex justify-between items-center text-sm text-muted-foreground">
                 {post.createdAt && (
                    <time dateTime={post.createdAt.toDate().toISOString()}>
                        {format(post.createdAt.toDate(), 'PPP')}
                    </time>
                )}
                <span className="flex items-center gap-1 group-hover:text-primary transition-colors">
                    Read More <ArrowRight className="h-4 w-4" />
                </span>
            </CardFooter>
        </Link>
    </Card>
  );
}