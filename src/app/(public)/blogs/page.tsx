
'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, limit, startAfter, DocumentSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { BlogPost } from '@/types/blog';
import { Skeleton } from '@/components/ui/skeleton';
import BlogCard from '@/components/blog-card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const POSTS_PER_PAGE = 6;

export default function BlogsPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchPosts = async (initialLoad = false) => {
    if (initialLoad) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const postsQuery = initialLoad
        ? query(
            collection(db, 'blogs'),
            where('isPublished', '==', true),
            orderBy('createdAt', 'desc'),
            limit(POSTS_PER_PAGE)
          )
        : query(
            collection(db, 'blogs'),
            where('isPublished', '==', true),
            orderBy('createdAt', 'desc'),
            startAfter(lastVisible),
            limit(POSTS_PER_PAGE)
          );

      const querySnapshot = await getDocs(postsQuery);
      const newPosts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogPost));

      setPosts(prevPosts => initialLoad ? newPosts : [...prevPosts, ...newPosts]);

      const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
      setLastVisible(lastDoc);

      if (querySnapshot.docs.length < POSTS_PER_PAGE) {
        setHasMore(false);
      }

    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchPosts(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
            <Skeleton className="h-12 w-1/2 mx-auto mb-4" />
            <Skeleton className="h-6 w-3/4 mx-auto" />
        </div>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-4 rounded-lg border p-4">
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
        <>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
          {hasMore && (
            <div className="mt-12 flex justify-center">
              <Button onClick={() => fetchPosts()} disabled={loadingMore}>
                {loadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {loadingMore ? 'Loading...' : 'Load More'}
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 py-20 text-center">
          <h2 className="text-xl font-semibold">No Posts Yet</h2>
          <p className="mt-2 text-muted-foreground">Check back soon for the latest articles!</p>
        </div>
      )}
    </div>
  );
}
