'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useParams, useRouter } from 'next/navigation';
import type { BlogPost } from '@/types/blog';
import BlogForm from '@/app/(blog-admin)/_components/blog-form';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@clerk/nextjs';

export default function EditBlogPage() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const params = useParams();
  const blogId = params.id as string;
  const [blogPost, setBlogPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/d_log');
      return;
    }

    const fetchBlogPost = async () => {
      const docRef = doc(db, 'blogs', blogId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const postData = { id: docSnap.id, ...docSnap.data() } as BlogPost;
        setBlogPost(postData);
      } else {
        toast({ variant: 'destructive', title: 'Blog post not found' });
        router.push('/d_blog'); // Not found
      }
      setLoading(false);
    };

    if (blogId && isSignedIn) {
      fetchBlogPost();
    }
  }, [blogId, isSignedIn, isLoaded, router, toast]);

  if (loading || !isLoaded) {
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
        <h1 className="text-3xl font-bold tracking-tight">Edit Blog Post</h1>
        <p className="text-muted-foreground">Update the details for your blog post.</p>
      </div>
      {blogPost ? <BlogForm blogPost={blogPost} /> : <p>Blog post not found.</p>}
    </div>
  );
}
