'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/hooks/use-auth';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import { db, storage, auth } from '@/lib/firebase/config';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Trash2, Save, X, LogOut, Loader2, Upload, Image as ImageIcon, ExternalLink } from 'lucide-react';
import * as mammoth from 'mammoth';
import type { BlogPost } from '@/types/blog';
import dynamic from 'next/dynamic';

const RichContentEditor = dynamic(() => import('@/components/RichContentEditor'), { 
    ssr: false, 
    loading: () => <div className="w-full bg-muted rounded-lg border h-64 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground"/></div>
});

const CATEGORIES: string[] = ['Insight', ' Story time', 'Web Development', 'Data Engineering', 'Machine Learning', 'DevOps', 'Engineering', 'Full Stack'];

const functions = getFunctions();
const deleteBlogImage = httpsCallable(functions, 'deleteBlogImage');

function normalizePostData(doc: any): BlogPost {
  const data = doc.data();
  return {
    id: doc.id,
    title: data.title || '',
    slug: data.slug || '',
    content: data.content || '',
    excerpt: data.excerpt || '',
    imageUrl: data.imageUrl || '',
    authorId: data.authorId || '',
    authorName: data.authorName || 'Dennis Munene',
    isPublished: data.isPublished ?? false,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    category: data.category || '',
  };
}

export default function BlogAdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [postToDelete, setPostToDelete] = useState<BlogPost | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const initialFormData: Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt' | 'authorId' | 'authorName'> = {
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    imageUrl: '',
    isPublished: false,
    category: '',
  };

  const [formData, setFormData] = useState(initialFormData);

  const titleInputRef = useRef<HTMLInputElement | null>(null);

  const isAdmin = user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL;

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/');
    }
  }, [isAdmin, authLoading, router]);

  const fetchPosts = useCallback(async () => {
    if (!user) return;
    setIsLoadingPosts(true);
    try {
      const q = query(collection(db, 'blogs'), where('authorId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const fetchedPosts = querySnapshot.docs.map(normalizePostData);
      fetchedPosts.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setPosts(fetchedPosts);
    } catch (error) {
      console.error('Failed to load posts:', error);
      toast({ title: 'Error Loading Posts', description: error instanceof Error ? error.message : 'An unknown error occurred.', variant: 'destructive' });
    } finally {
      setIsLoadingPosts(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (isAdmin && user) {
      fetchPosts();
    }
  }, [isAdmin, user, fetchPosts]);

  const generateSlug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const handleInputChange = (field: keyof typeof formData, value: string | boolean) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'title' && !editingPost) {
        updated.slug = generateSlug(value as string);
      }
      return updated;
    });
  };

  const resetForm = () => {
    setEditingPost(null);
    setFormData(initialFormData);
    setImageFile(null);
    setImagePreviewUrl(null);
    titleInputRef.current?.focus();
  };

  const handleSelectPost = (post: BlogPost) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt,
      imageUrl: post.imageUrl || '',
      isPublished: post.isPublished,
      category: post.category,
    });
    setImageFile(null);
    setImagePreviewUrl(post.imageUrl || null);
    titleInputRef.current?.focus();
  };

  const handleSubmit = async () => {
    if (!formData.title) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }
    if (!user) {
      toast({ title: 'You must be logged in', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    const isUpdating = !!editingPost;

    let finalImageUrl = editingPost?.imageUrl || '';
    const oldImageUrl = editingPost?.imageUrl;

    if (imageFile) {
        toast({ title: 'Uploading image...' });
        const storageRef = ref(storage, `blog-images/${user.uid}/${Date.now()}_${imageFile.name}`);
        try {
            const snapshot = await uploadBytes(storageRef, imageFile);
            finalImageUrl = await getDownloadURL(snapshot.ref);
            toast({ title: 'Image uploaded!' });
        } catch (error) {
            console.error("Image upload failed", error);
            toast({ variant: 'destructive', title: 'Image Upload Failed' });
            setIsSaving(false);
            return;
        }
    } else if (!imagePreviewUrl && oldImageUrl) {
      finalImageUrl = '';
    }

    const dataToSave = {
      ...formData,
      imageUrl: finalImageUrl,
      updatedAt: serverTimestamp(),
    };

    try {
      let postId = editingPost?.id;
      if (isUpdating && postId) {
        const postRef = doc(db, 'blogs', postId);
        await updateDoc(postRef, dataToSave);
        
        if ((imageFile || !imagePreviewUrl) && oldImageUrl) {
           try {
              await deleteBlogImage({ imageUrl: oldImageUrl });
           } catch (deleteError: any) {
              console.warn("Cloud function to delete old image failed:", deleteError);
              toast({ title: 'Cleanup Warning', description: 'Post saved, but the old image could not be deleted.', variant: 'default' });
           }
        }
        toast({ title: 'Post Updated', description: `Successfully updated "${formData.title}".` });

      } else {
        const docRef = await addDoc(collection(db, 'blogs'), {
          ...dataToSave,
          authorId: user.uid,
          authorName: user.displayName || 'Dennis Munene',
          createdAt: serverTimestamp(),
        });
        postId = docRef.id;
        toast({ title: 'Post Created', description: `Successfully created "${formData.title}".` });
      }

      await fetchPosts();

      if(postId) {
        const updatedPostSnap = await getDoc(doc(db, 'blogs', postId));
        if(updatedPostSnap.exists()) {
          handleSelectPost(normalizePostData(updatedPostSnap));
        }
      }

    } catch (e) {
      console.error('Failed to save post:', e);
      toast({ title: isUpdating ? 'Update Failed' : 'Creation Failed', description: e instanceof Error ? e.message : 'Could not save the post.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
      setImageFile(null); 
    }
  };

  const confirmDelete = async () => {
    if (!postToDelete || !user) return;

    const { id, imageUrl, title } = postToDelete;

    try {
      // First, delete the Firestore document
      await deleteDoc(doc(db, 'blogs', id));

      // Then, if there was an image, call the Cloud Function to delete it
      if (imageUrl) {
        try {
          await deleteBlogImage({ imageUrl });
        } catch (storageError: any) {
          // Log a warning if the image deletion fails, but don't block the UI
          console.warn('Cloud function to delete image failed:', storageError);
          toast({ title: 'Cleanup Warning', description: 'Post document was deleted, but the associated image could not be removed.', variant: 'default' });
        }
      }

      // Finally, update the local UI state
      setPosts((prev) => prev.filter((p) => p.id !== id));
      if (editingPost?.id === id) {
        resetForm();
      }
      toast({ title: 'Post Deleted', description: `The post "${title}" has been successfully removed.` });
    } catch (error) {
      console.error('Delete operation failed:', error);
      toast({ title: 'Delete Failed', description: error instanceof Error ? error.message : 'Could not delete the post.', variant: 'destructive' });
    } finally {
      setPostToDelete(null);
    }
  };

  const handleImportFile = async (file: File) => {
    toast({ title: 'Importing...' });
    if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        if (arrayBuffer) {
          try {
            const result = await mammoth.convertToHtml({ arrayBuffer });
            handleInputChange('content', result.value);
            toast({ title: 'Import Successful' });
          } catch (mammothError) {
            toast({ title: 'Import Failed', variant: 'destructive' });
          }
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const text = await file.text();
      handleInputChange('content', text);
      toast({ title: 'Import Successful' });
    }
  };

  const handleImageFileSelect = (file: File | null) => {
    setImageFile(file);
    if (file) {
      setImagePreviewUrl(URL.createObjectURL(file));
    } else {
      setImagePreviewUrl(null);
    }
  };
  

  if (authLoading || !isAdmin) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  return (
    <>
      <AlertDialog open={!!postToDelete} onOpenChange={(open) => !open && setPostToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the post titled "<span className="font-bold">{postToDelete?.title}</span>" and its associated image from the servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="bg-muted/40 min-h-screen">
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-8xl">
          <header className="flex justify-between items-center pb-6">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Blog Dashboard</h1>
            <Button variant="outline" onClick={() => auth.signOut()}>
              <LogOut className="h-4 w-4 mr-2" /> Sign Out
            </Button>
          </header>

          <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 flex flex-col gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Your Posts</CardTitle>
                    <CardDescription className="text-sm">{posts.length} posts</CardDescription>
                  </div>
                  <Button size="sm" onClick={resetForm}>
                    <Plus className="h-4 w-4 mr-2" /> New
                  </Button>
                </CardHeader>
                <CardContent className="max-h-[65vh] overflow-y-auto pr-3">
                  {isLoadingPosts ? (
                    <div className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
                  ) : posts.length === 0 ? (
                    <div className="text-center py-10">
                      <h3 className="text-lg font-semibold">No posts yet</h3>
                      <p className="text-sm text-muted-foreground">Click "New" to start.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {posts.map((post) => (
                        <div
                          key={post.id}
                          onClick={() => handleSelectPost(post)}
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${editingPost?.id === post.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'}`}
                        >
                          <h4 className="font-semibold truncate text-base">{post.title}</h4>
                          <p className="text-sm text-muted-foreground truncate">{post.excerpt || `/${post.slug}`}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant={post.isPublished ? 'default' : 'secondary'}>{post.isPublished ? 'Published' : 'Draft'}</Badge>
                            {post.category && <Badge variant="outline">{post.category}</Badge>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2 flex flex-col gap-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">{editingPost ? 'Edit Post' : 'Create New Post'}</CardTitle>
                      <CardDescription>{editingPost ? `Editing "${editingPost.title}"` : 'Fill out the details below.'}</CardDescription>
                    </div>
                    {editingPost && formData.isPublished && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={`/blogs/${editingPost.slug}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" /> View Live
                        </a>
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input id="title" ref={titleInputRef} value={formData.title} onChange={(e) => handleInputChange('title', e.target.value)} placeholder="Enter a catchy title" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="slug">URL Slug</Label>
                      <Input id="slug" value={formData.slug} onChange={(e) => handleInputChange('slug', e.target.value)} placeholder="post-url-slug" />
                    </div>
                  </div>

                  <div className="space-y-2 mb-6">
                    <Label htmlFor="excerpt">Excerpt</Label>
                    <Textarea id="excerpt" value={formData.excerpt} onChange={(e) => handleInputChange('excerpt', e.target.value)} placeholder="A short summary of the post" rows={2} />
                  </div>

                  <div className="space-y-2 mb-6">
                    <Label>Main Content</Label>
                    <RichContentEditor content={formData.content} onChange={(html) => handleInputChange('content', html)} />
                  </div>

                  <Card className="bg-muted/50">
                    <CardHeader>
                      <CardTitle className="text-lg">Post Details</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Featured Image</Label>
                        <div className="flex items-center gap-2">
                          <Input id="image-upload" type="file" accept="image/*" onChange={(e) => handleImageFileSelect(e.target.files?.[0] || null)} className="hidden" />
                          <Button variant="outline" asChild><Label htmlFor="image-upload" className="cursor-pointer w-full"><ImageIcon className="h-4 w-4 mr-2" /> Upload</Label></Button>
                          {imagePreviewUrl && <Image src={imagePreviewUrl} alt="Preview" width={48} height={48} className="w-12 h-12 object-cover rounded-lg border" unoptimized />}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value || '')}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Import Content</Label>
                        <Input id="file-import" type="file" accept=".docx,.md,.txt,.html" onChange={(e) => e.target.files?.[0] && handleImportFile(e.target.files[0])} className="hidden" />
                        <Button variant="outline" asChild><Label htmlFor="file-import" className="cursor-pointer w-full"><Upload className="h-4 w-4 mr-2" /> Import File</Label></Button>
                      </div>

                      <div className="flex items-center space-x-2 pt-6">
                        <Switch id="published" checked={formData.isPublished} onCheckedChange={(checked) => handleInputChange('isPublished', checked)} />
                        <Label htmlFor="published" className="cursor-pointer">Publish</Label>
                      </div>
                    </CardContent>
                  </Card>

                </CardContent>
                <CardFooter className="flex justify-end gap-3 mt-6">
                  {editingPost && (
                    <Button variant="destructive" onClick={() => setPostToDelete(editingPost)}>
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </Button>
                  )}
                  <Button variant="outline" onClick={resetForm}>
                    <X className="h-4 w-4 mr-2" /> Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    {editingPost ? 'Save Changes' : 'Create Post'}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
