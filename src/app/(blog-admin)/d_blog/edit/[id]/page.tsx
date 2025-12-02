'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useParams, useRouter } from 'next/navigation';
import type { BlogPost } from '@/types/blog';
import BlogForm from '@/components/blog-form';
import { useAuth } from '@/lib/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

export default function EditBlogPostPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const postId = params.id as string;
  const [blogPost, setBlogPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchPost = async () => {
      const docRef = doc(db, 'blogs', postId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const postData = { id: docSnap.id, ...docSnap.data() } as BlogPost;
        // The layout already protects this route, but an extra check doesn't hurt.
        if (postData.authorId === user.uid) {
          setBlogPost(postData);
        } else {
          toast({ variant: 'destructive', title: 'Permission Denied' });
          router.push('/d_blog');
        }
      } else {
        toast({ variant: 'destructive', title: 'Post not found' });
        router.push('/d_blog');
      }
      setLoading(false);
    };

    if (postId && user) {
      fetchPost();
    }
  }, [postId, user, authLoading, router, toast]);

  if (loading || authLoading) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
         <Skeleton className="h-10 w-1/2" />
         <div className="space-y-4">
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-10 w-full" />
         </div>
         <div className="space-y-4">
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-40 w-full" />
         </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-4 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Edit Post</h1>
        <p className="text-muted-foreground">Update the details for your blog post.</p>
      </div>
      {blogPost ? <BlogForm blogPost={blogPost} /> : <p>Blog post not found.</p>}
    </div>
  );
}
