'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ProfileForm from '@/components/profile-form';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db, storage, auth } from '@/lib/firebase/config';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Camera } from 'lucide-react';

export default function ProfilePage() {
  const { user, userProfile, loading, reloadUserProfile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0]).join('');
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    setProgress(0);

    const storageRef = ref(storage, `profile-images/${user.uid}/${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log('Upload is ' + progress + '% done');
        setProgress(progress);
      },
      (error) => {
        console.error('Upload failed:', error);
        toast({
          variant: 'destructive',
          title: 'Upload failed',
          description: 'Could not upload your new profile picture. Please check the console for details.',
        });
        setUploading(false);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          console.log('File available at', downloadURL);

          // Update Firestore
          const userDocRef = doc(db, 'users', user.uid);
          await updateDoc(userDocRef, { photoURL: downloadURL });

          // Update Auth profile
          if (auth.currentUser) {
            await updateProfile(auth.currentUser, { photoURL: downloadURL });
          }

          toast({ title: 'Profile picture updated successfully!' });
          // Force a reload of the user profile data to show the new image
          reloadUserProfile(); 
        } catch (error) {
          console.error('Error updating profile:', error);
          toast({
            variant: 'destructive',
            title: 'Update failed',
            description: 'Could not save the new profile picture. Please check the console for details.',
          });
        } finally {
          setUploading(false);
        }
      }
    );
  };

  if (loading || !userProfile) {
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

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row items-start space-y-6 md:space-y-0 md:space-x-8 mb-8">
        <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
            <Avatar className="h-32 w-32 border-4 border-background shadow-md">
                <AvatarImage src={userProfile.photoURL} alt={userProfile.name} />
                <AvatarFallback className="text-4xl">{getInitials(userProfile.name)}</AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="h-8 w-8 text-white" />
            </div>
            {uploading && (
                <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/70">
                    <Progress value={progress} className="h-2 w-3/4" />
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
          <h1 className="text-4xl font-bold">{userProfile.name}</h1>
          <p className="text-muted-foreground text-lg">{userProfile.email}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {userProfile.skills?.map((skill) => (
              <Badge key={skill} variant="secondary">{skill}</Badge>
            ))}
          </div>
        </div>
      </div>
      
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>About Me</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground/80 leading-relaxed">
              {userProfile.bio || 'No bio provided yet.'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
            <CardDescription>Update your personal information and skills.</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm userProfile={userProfile} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
