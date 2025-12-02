'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { BlogPost } from '@/types/blog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function BlogDashboardPage() {
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const postsQuery = query(collection(db, 'blogs'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogPost));
      setBlogPosts(posts);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching blog posts: ", error);
      toast({ variant: 'destructive', title: 'Failed to load posts' });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const handleDelete = async (postId: string, imageUrl?: string) => {
    try {
      if (imageUrl) {
        const { ref, deleteObject } = await import('firebase/storage');
        const { storage } = await import('@/lib/firebase/config');
        const imageRef = ref(storage, imageUrl);
        await deleteObject(imageRef).catch(err => console.warn("Image deletion failed, may not exist or permissions issue.", err));
      }
      await deleteDoc(doc(db, 'blogs', postId));
      toast({ title: 'Blog post deleted successfully.' });
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({ variant: 'destructive', title: 'Failed to delete post.' });
    }
  };

  if (loading) {
    return (
        <div className="container mx-auto py-10">
            <Skeleton className="h-10 w-48 mb-8" />
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <Skeleton className="h-12 w-full" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {[...Array(3)].map((_, i) => (
                            <TableRow key={i}>
                                <TableCell colSpan={5}>
                                    <Skeleton className="h-20 w-full" />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Blog Dashboard</h1>
        <Button asChild>
          <Link href="/d_blog/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Post
          </Link>
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Image</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {blogPosts.length > 0 ? blogPosts.map((post) => (
              <TableRow key={post.id}>
                <TableCell>
                  <Image
                    src={post.imageUrl || 'https://picsum.photos/seed/placeholder/80/60'}
                    alt={post.title}
                    width={80}
                    height={60}
                    className="rounded-md object-cover"
                  />
                </TableCell>
                <TableCell className="font-medium">{post.title}</TableCell>
                <TableCell>
                  <Badge variant={post.isPublished ? 'default' : 'secondary'}>
                    {post.isPublished ? 'Published' : 'Draft'}
                  </Badge>
                </TableCell>
                <TableCell>
                    {post.createdAt ? format(post.createdAt.toDate(), 'PPP') : 'N/A'}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/d_blog/edit/${post.id}`}>
                      <Edit className="h-4 w-4" />
                    </Link>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete this blog post.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(post.id, post.imageUrl)} className="bg-destructive hover:bg-destructive/90">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            )) : (
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                        No posts found.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
