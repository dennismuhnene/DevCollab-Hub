'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { BlogPost } from '@/types/blog';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';


const BlogCard = ({ post }: { post: BlogPost }) => {
    return (
        <Card className="h-full transform transition-all duration-300 hover:shadow-xl dark:hover:shadow-primary/20 flex flex-col">
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
                    <CardTitle className="mb-2 text-xl font-bold leading-tight">{post.title}</CardTitle>
                    {post.createdAt && (
                        <CardDescription className="text-sm text-muted-foreground mb-4">
                            {format(post.createdAt.toDate(), 'PPP')} by {post.authorName}
                        </CardDescription>
                    )}
                    <p className="mb-4 line-clamp-3 flex-grow text-foreground/80">
                        {post.content.substring(0, 150)}{post.content.length > 150 ? '...' : ''}
                    </p>
                </CardContent>
            </Link>
        </Card>
    );
};


export default function BlogsPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPublishedPosts = async () => {
      setLoading(true);
      const postsQuery = query(
        collection(db, 'blogs'),
        where('isPublished', '==', true),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(postsQuery);
      const publishedPosts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogPost));
      setPosts(publishedPosts);
      setLoading(false);
    };
    fetchPublishedPosts();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="h-12 w-64 mb-8" />
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-48 w-full rounded-lg" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight">The DevCollab Blog</h1>
        <p className="mt-3 text-lg text-muted-foreground">Insights, stories, and news from our community.</p>
      </div>

      {posts.length > 0 ? (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <BlogCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 py-20 text-center">
          <h2 className="text-xl font-semibold">No Posts Yet</h2>
          <p className="mt-2 text-muted-foreground">Check back soon for the latest articles!</p>
        </div>
      )}
    </div>
  );
}
