'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ProfileForm from '@/components/profile-form';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db, storage, auth } from '@/lib/firebase/config';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Camera, Save, X, Loader2, Link as LinkIcon } from 'lucide-react';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import { ExternalLink } from '@/types';

const socialIcons = {
  github: "/icons/github.svg",
  gitlab: "/icons/gitlab.svg",
  bitbucket: "/icons/bitbucket.svg",
  linkedin: "/icons/linkedin.svg",
  twitter: "/icons/twitter.svg",
  default: "/icons/link.svg",
};

export default function ProfilePage() {
  const { user, userProfile, loading, reloadUserProfile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // FIX: prevent SSR hydration mismatch
  const [cachedProfile, setCachedProfile] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const cached = sessionStorage.getItem("userProfileCache");
      if (cached) {
        setCachedProfile(JSON.parse(cached));
      }
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (userProfile) {
      sessionStorage.setItem("userProfileCache", JSON.stringify(userProfile));
    }
  }, [userProfile]);

  useEffect(() => {
    if (userProfile?.photoURL) {
      setImagePreview(userProfile.photoURL);
    } else if (cachedProfile?.photoURL) {
      setImagePreview(cachedProfile.photoURL);
    }
  }, [userProfile?.photoURL]);

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0]).join('');
  };

  const handleAvatarClick = () => {
    if (uploading || newImageFile) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setNewImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCancelUpdate = () => {
    setNewImageFile(null);
    setImagePreview(userProfile?.photoURL || cachedProfile?.photoURL || null);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleSaveImage = () => {
    if (!newImageFile || !user || !userProfile) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No image selected or user not authenticated.',
      });
      return;
    }

    setUploading(true);
    setProgress(0);
    
    const oldImageUrl = userProfile.photoURL;
    const storageRef = ref(storage, `profile-images/${user.uid}/${newImageFile.name}`);
    const uploadTask = uploadBytesResumable(storageRef, newImageFile);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const currentProgress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgress(currentProgress);
      },
      (error) => {
        console.error('Upload failed:', error);
        toast({
          variant: 'destructive',
          title: 'Upload failed',
          description: `Could not upload profile picture: ${error.message}`,
        });
        setUploading(false);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

        const userDocRef = doc(db, 'users', user.uid);
        updateDocumentNonBlocking(userDocRef, { photoURL: downloadURL });

        if (auth.currentUser) {
            await updateProfile(auth.currentUser, { photoURL: downloadURL });
        }

        if (oldImageUrl && oldImageUrl.startsWith('https://firebasestorage.googleapis.com')) {
           try {
              const oldImageRef = ref(storage, oldImageUrl);
              await deleteObject(oldImageRef);
           } catch (deleteError: any) {
              if (deleteError.code !== 'storage/object-not-found') {
                console.warn("Could not delete old profile picture:", deleteError);
              }
           }
        }

        toast({ title: 'Profile picture updated successfully!' });
        setUploading(false);
        setNewImageFile(null);
        reloadUserProfile(); 
      }
    );
  };

  const allLinks: ExternalLink[] = [
    userProfile?.versionControl,
    userProfile?.socials,
    userProfile?.portfolioUrl ? { type: 'portfolio', url: userProfile.portfolioUrl } : undefined,
    ...(userProfile?.extraLinks || [])
  ].filter((link): link is ExternalLink => link !== undefined);

  const finalProfile = userProfile || cachedProfile;

  if (loading && !finalProfile) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-4 mb-8">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-6 w-64" />
            </div>
        </div>
        <Card>
            <CardHeader><Skeleton className="h-8 w-32" /></CardHeader>
            <CardContent><Skeleton className="h-20 w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  if (!finalProfile) {
    return null;
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row items-start space-y-6 md:space-y-0 md:space-x-8 mb-8">
        <div className="relative group" onClick={handleAvatarClick}>
            <Avatar className="h-32 w-32 border-4 border-background shadow-md">
                {imagePreview ? (
                    <Image src={imagePreview} alt={finalProfile.name} width={128} height={128} className="object-cover" />
                ) : (
                    <AvatarFallback className="text-4xl">{getInitials(finalProfile.name)}</AvatarFallback>
                )}
            </Avatar>
            {!newImageFile && !uploading && (
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera className="h-8 w-8 text-white" />
                </div>
            )}
            
            {newImageFile && !uploading && (
                 <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center gap-2">
                    <Button size="icon" onClick={handleSaveImage}><Save className="h-4 w-4" /></Button>
                    <Button size="icon" variant="destructive" onClick={handleCancelUpdate}><X className="h-4 w-4" /></Button>
                </div>
            )}

            {uploading && (
                <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/70">
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/*"
              disabled={uploading}
            />
        </div>

        <div className="flex-1 pt-4">
          <h1 className="text-4xl font-bold">{finalProfile.name}</h1>
          <p className="text-muted-foreground text-lg">{finalProfile.email}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {finalProfile.skills?.map((skill: string) => (
              <Badge key={skill} variant="secondary">{skill}</Badge>
            ))}
          </div>
        </div>
      </div>
      
      <div className="space-y-8">
        {allLinks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>External Links</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              {allLinks.map((link, index) => (
                <Button key={index} variant="outline" asChild>
                  <Link href={link.url} target="_blank">
                    <LinkIcon className="mr-2 h-4 w-4" />
                    {link.type}
                  </Link>
                </Button>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
            <CardDescription>Update your personal information and skills.</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm userProfile={finalProfile} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
