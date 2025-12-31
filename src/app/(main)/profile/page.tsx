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
import { Camera, Save, X, Loader2, Link as LinkIcon } from 'lucide-react';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import { AdvisorApplicationManager } from '@/components/advisor-application-manager';
import ProfileSidebar from '@/components/profile-sidebar';
import BlockedUsers from '@/components/blocked-users';
import DeleteAccount from '@/components/delete-account';

export default function ProfilePage() {
  const { user, userProfile, loading, reloadUserProfile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeView, setActiveView] = useState('profile');

  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  
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
      setImagePreview(userProfile.photoURL || null);
    }
  }, [userProfile]);

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
      toast({ variant: 'destructive', title: 'Error', description: 'Image or user not available.'});
      return;
    }

    setUploading(true);
    const oldImageUrl = userProfile.photoURL;
    const storageRef = ref(storage, `profile-images/${user.uid}/${newImageFile.name}`);
    const uploadTask = uploadBytesResumable(storageRef, newImageFile);

    uploadTask.on('state_changed', 
      () => {}, 
      (error) => {
        setUploading(false);
        toast({ variant: 'destructive', title: 'Upload failed', description: error.message });
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        const userDocRef = doc(db, 'users', user.uid);
        updateDocumentNonBlocking(userDocRef, { photoURL: downloadURL });
        if (auth.currentUser) await updateProfile(auth.currentUser, { photoURL: downloadURL });
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
        toast({ title: 'Profile picture updated!' });
        setUploading(false);
        setNewImageFile(null);
        reloadUserProfile();
      }
    );
  };

  const finalProfile = userProfile || cachedProfile;

  if (loading && !finalProfile) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <aside className="md:col-span-1">
                <Skeleton className="h-10 w-full mb-2" />
                <Skeleton className="h-10 w-full mb-2" />
                <Skeleton className="h-10 w-full" />
            </aside>
            <main className="md:col-span-3 space-y-4">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-64 w-full" />
            </main>
        </div>
      </div>
    );
  }

  if (!finalProfile) return null;

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <aside className="md:col-span-1">
                <ProfileSidebar activeView={activeView} setActiveView={setActiveView} />
            </aside>
            <main className="md:col-span-3 space-y-4">
            {activeView === 'profile' && (
                <>
                    <div className="flex flex-col md:flex-row items-start space-y-4 md:space-y-0 md:space-x-6 mb-8">
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
                                    <Button size="icon" onClick={(e) => {e.stopPropagation(); handleSaveImage();}}><Save className="h-4 w-4" /></Button>
                                    <Button size="icon" variant="destructive" onClick={(e) => {e.stopPropagation(); handleCancelUpdate();}}><X className="h-4 w-4" /></Button>
                                </div>
                            )}
                            {uploading && (
                                <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/70">
                                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                                </div>
                            )}
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" disabled={uploading}/>
                        </div>
                        <div className="flex-1 pt-4">
                            <h1 className="text-2xl font-bold">{finalProfile.name}</h1>
                            <p className="text-muted-foreground text-base">{finalProfile.email}</p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {finalProfile.skills?.map((skill: string) => (
                                <Badge key={skill} variant="secondary">{skill}</Badge>
                                ))}
                            </div>
                        </div>
                    </div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Edit Profile</CardTitle>
                            <CardDescription>Update your personal information and skills.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ProfileForm userProfile={finalProfile} />
                        </CardContent>
                    </Card>
                </>
            )}
            {activeView === 'advisory-applications' && <AdvisorApplicationManager />}
            {activeView === 'settings' && <><BlockedUsers /><DeleteAccount /></>}
            </main>
        </div>
    </div>
  );
}
