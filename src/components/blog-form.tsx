'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { doc, serverTimestamp, addDoc, updateDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ImageUploader from './image-uploader';
import { useToast } from '@/hooks/use-toast';
import type { BlogPost } from '@/types/blog';
import { Switch } from './ui/switch';

const blogPostSchema = z.object({
  title: z.string().min(5, { message: 'Title must be at least 5 characters long.' }),
  content: z.string().min(20, { message: 'Content must be at least 20 characters long.' }),
  imageUrl: z.string().optional(),
  isPublished: z.boolean().default(false),
});

type BlogPostFormData = z.infer<typeof blogPostSchema>;

type BlogFormProps = {
  blogPost?: BlogPost;
};

export default function BlogForm({ blogPost }: BlogFormProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BlogPostFormData>({
    resolver: zodResolver(blogPostSchema),
    defaultValues: {
      title: blogPost?.title || '',
      content: blogPost?.content || '',
      imageUrl: blogPost?.imageUrl || '',
      isPublished: blogPost?.isPublished || false,
    },
  });
  
  const isPublishedValue = watch('isPublished');

  const onSubmit = async (data: BlogPostFormData) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Not authenticated' });
      return;
    }
    setLoading(true);

    if (blogPost) {
      const postRef = doc(db, 'blogs', blogPost.id);
      await updateDoc(postRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
      toast({ title: 'Blog post updated successfully!' });
      router.push('/d_blog');
    } else {
      await addDoc(collection(db, 'blogs'), {
        ...data,
        authorId: user.uid,
        authorName: user.displayName || 'DevCollab Admin',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast({ title: 'Blog post created successfully!' });
      router.push('/d_blog');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>{blogPost ? 'Edit Post' : 'Create New Post'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...register('title')} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea id="content" {...register('content')} rows={10} />
            {errors.content && <p className="text-sm text-destructive">{errors.content.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Featured Image</Label>
            <ImageUploader
              onUpload={(url) => setValue('imageUrl', url, { shouldDirty: true, shouldValidate: true })}
              initialUrl={blogPost?.imageUrl}
              folderPath={`blog-images/${user?.uid}`}
            />
          </div>
          
          <div className="flex items-center space-x-3 rounded-md border p-4">
            <Switch
              id="isPublished"
              checked={isPublishedValue}
              onCheckedChange={(checked) => setValue('isPublished', checked, { shouldDirty: true })}
            />
            <div className="space-y-0.5">
              <Label htmlFor="isPublished" className="text-base">
                Publish Post
              </Label>
              <p className="text-sm text-muted-foreground">
                {isPublishedValue ? "This post will be visible to the public." : "This post will be saved as a draft."}
              </p>
            </div>
          </div>

          <Button type="submit" disabled={loading} size="lg">
            {loading ? 'Saving...' : blogPost ? 'Save Changes' : 'Create Post'}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
