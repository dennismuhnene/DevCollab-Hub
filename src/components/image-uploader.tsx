'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import Image from 'next/image';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

type ImageUploaderProps = {
  onFileSelect: (file: File | null) => void;
  initialUrl?: string | null;
};

export default function ImageUploader({ onFileSelect, initialUrl }: ImageUploaderProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreviewUrl(initialUrl || null);
  }, [initialUrl]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setPreviewUrl(null);
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Reset the file input
    }
  };

  return (
    <div className="w-full space-y-4">
      {previewUrl ? (
        <div className="relative group w-full aspect-[3/2] rounded-md border-2 border-dashed flex items-center justify-center">
          <Image src={previewUrl} alt="Preview" layout="fill" objectFit="cover" className="rounded-md" />
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="destructive" size="icon" onClick={removeImage} type="button">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="w-full aspect-[3/2] rounded-md border-2 border-dashed flex flex-col items-center justify-center p-6 text-center">
          <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="mb-2 text-sm text-muted-foreground">Drag & drop an image or</p>
          <Button asChild variant="outline" type="button">
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="mr-2 h-4 w-4" />
              <span>Browse</span>
            </label>
          </Button>
          <Input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept="image/*" ref={fileInputRef} />
        </div>
      )}
    </div>
  );
}
