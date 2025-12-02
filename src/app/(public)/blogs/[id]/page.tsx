'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { BlogPost } from '@/types/blog';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { format } from 'date-fns';
import { Calendar, User } from 'lucide-react';

export default function BlogPostPage() {
  const params = useParams();
  const blogId = params.id as string;

  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!blogId) return;

    const fetchPost = async () => {
      setLoading(true);
      const postDocRef = doc(db, 'blogs', blogId);
      const postDoc = await getDoc(postDocRef);

      if (postDoc.exists()) {
        const postData = { id: postDoc.id, ...postDoc.data() } as BlogPost;
        if (postData.isPublished) {
          setPost(postData);
        } else {
          setPost(null);
        }
      } else {
        setPost(null);
      }
      setLoading(false);
    };

    fetchPost();
  }, [blogId]);


  if (loading) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="h-12 w-3/4 mb-4" />
        <Skeleton className="h-6 w-1/2 mb-8" />
        <Skeleton className="w-full h-96 mb-8" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    );
  }

  if (!post) {
    return <div className="text-center py-20 text-muted-foreground">Blog post not found or is not published.</div>;
  }

  return (
    <article className="container mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">{post.title}</h1>
        <div className="flex justify-center items-center space-x-6 text-muted-foreground">
            <div className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>{post.authorName}</span>
            </div>
            {post.createdAt && (
                <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <time dateTime={post.createdAt.toDate().toISOString()}>
                        {format(post.createdAt.toDate(), 'PPP')}
                    </time>
                </div>
            )}
        </div>
      </header>

      {post.imageUrl && (
        <div className="relative w-full h-96 mb-12 rounded-lg overflow-hidden shadow-lg">
          <Image
            src={post.imageUrl}
            alt={post.title}
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      <div
        className="prose dark:prose-invert prose-lg max-w-none mx-auto"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
    </article>
  );
}
