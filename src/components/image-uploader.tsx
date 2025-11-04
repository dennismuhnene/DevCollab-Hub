'use client';

import { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase/config';
import { useToast } from '@/hooks/use-toast';
import { Input } from './ui/input';
import { Button } from './ui/button';
import Image from 'next/image';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Progress } from './ui/progress';

type ImageUploaderProps = {
  onUpload: (url: string) => void;
  initialUrl?: string;
  folderPath?: string;
};

export default function ImageUploader({ onUpload, initialUrl = '', folderPath = 'images' }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [imageUrl, setImageUrl] = useState<string>(initialUrl);
  const { toast } = useToast();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setProgress(0);

    const storageRef = ref(storage, `${folderPath}/${Date.now()}_${file.name}`);
    
    try {
      // For progress, we'd use uploadTask, but for simplicity we'll simulate.
      // A real implementation would be:
      // const uploadTask = uploadBytesResumable(storageRef, file);
      // uploadTask.on('state_changed', (snapshot) => { ... });
      
      // Simplified upload
      await uploadBytes(storageRef, file);
      setProgress(100);
      const downloadURL = await getDownloadURL(storageRef);
      setImageUrl(downloadURL);
      onUpload(downloadURL);
      toast({ title: 'Image uploaded successfully' });

    } catch (error) {
      toast({ variant: 'destructive', title: 'Upload failed', description: 'Please try again.' });
    } finally {
      setUploading(false);
    }
  };
  
  const removeImage = () => {
    setImageUrl('');
    onUpload('');
  };

  return (
    <div className="w-full space-y-4">
      {imageUrl ? (
        <div className="relative group w-full aspect-[3/2] rounded-md border-2 border-dashed flex items-center justify-center">
            <Image src={imageUrl} alt="Uploaded preview" layout="fill" objectFit="cover" className="rounded-md" />
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                 <Button variant="destructive" size="icon" onClick={removeImage}>
                    <X className="h-4 w-4" />
                 </Button>
            </div>
        </div>
      ) : (
        <div className="w-full aspect-[3/2] rounded-md border-2 border-dashed flex flex-col items-center justify-center p-6 text-center">
          <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="mb-2 text-sm text-muted-foreground">Drag & drop an image or</p>
          <Button asChild variant="outline">
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="mr-2 h-4 w-4" />
              <span>Browse</span>
            </label>
          </Button>
          <Input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept="image/*" disabled={uploading} />
        </div>
      )}
      {uploading && <Progress value={progress} className="w-full" />}
    </div>
  );
}
